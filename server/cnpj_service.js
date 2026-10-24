/**
 * Plantae Agrocrédito - Intelligent CNPJ Service
 * Connects directly to Receita Federal via Hub do Desenvolvedor WebService.
 * Features:
 * - Mathematical checksum validation (no wasted credits on typos)
 * - Multi-token automatic failover & rotation
 * - Alert notifications to Supreme Admin via Telegram Bot
 * - Zero-disruption fallback to VIP WhatsApp for leads if credits deplete
 */

const { 
  getCnpjTokens, 
  getCnpjActiveIndex, 
  setCnpjActiveIndex,
  addCnpjToken,
  removeCnpjToken
} = require('./db');

/**
 * Validates CNPJ using official Receita Federal Modulo 11 checksum algorithm
 */
function isValidCNPJ(cnpjRaw) {
  if (!cnpjRaw) return false;
  const cnpj = String(cnpjRaw).replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  
  // Reject identical digits: 00000000000000, 11111111111111, etc.
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // First verification digit
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  // Second verification digit
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) return false;

  return true;
}

function cleanCNPJ(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function formatCNPJ(digits) {
  const d = cleanCNPJ(digits);
  if (d.length !== 14) return digits;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Queries Hub do Desenvolvedor WebService
 */
async function queryHubCnpj(cnpjDigits, token, isTestOnly = false) {
  const url = `http://ws.hubdodesenvolvedor.com.br/v2/cnpj/?cnpj=${cnpjDigits}&token=${token}${isTestOnly ? '&last_update=2' : ''}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
  
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from Hub do Desenvolvedor`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Consults CNPJ with intelligent token failover
 */
async function consultCnpjWithAutoFallback(cnpjRaw, leadInfo = {}, telegramBot = null) {
  const cnpjDigits = cleanCNPJ(cnpjRaw);

  // 1. Check mathematics
  if (!isValidCNPJ(cnpjDigits)) {
    return {
      ok: false,
      success: false,
      valid: false,
      error_code: 'INVALID_MATH',
      message: 'O CNPJ informado possui dígitos verificadores incorretos.'
    };
  }

  const tokens = getCnpjTokens();
  let activeIndex = getCnpjActiveIndex();
  if (activeIndex >= tokens.length) activeIndex = 0;

  let attempts = 0;
  const maxAttempts = tokens.length;
  let exhaustedTokens = [];

  while (attempts < maxAttempts) {
    const currentToken = tokens[activeIndex];
    try {
      const response = await queryHubCnpj(cnpjDigits, currentToken, false);

      if (response && response.return === 'OK') {
        // Successful response!
        if (activeIndex !== getCnpjActiveIndex()) {
          setCnpjActiveIndex(activeIndex);
        }

        return {
          ok: true,
          success: true,
          valid: true,
          result: response.result,
          data: response.result,
          consumed: response.consumed || 1,
          token_index: activeIndex,
          token_used: currentToken.substring(0, 8) + '...'
        };
      }

      // Check if NOK is due to balance / invalid token
      const msg = response && (response.message || response.msg || '');
      const isBalanceError = msg.includes('sem saldo') || 
                             msg.includes('Token Inválido') || 
                             msg.includes('Token Bloqueado') || 
                             msg.includes('Limite Excedido');

      if (isBalanceError) {
        exhaustedTokens.push({ index: activeIndex, token: currentToken, reason: msg });
        console.warn(`⚠️ [CNPJ Service] Token #${activeIndex + 1} (${currentToken.substring(0, 8)}...) sem saldo: "${msg}".`);

        const nextIndex = (activeIndex + 1) % tokens.length;
        if (telegramBot && typeof telegramBot.notifyTokenRotation === 'function') {
          telegramBot.notifyTokenRotation(activeIndex, nextIndex, msg).catch(() => {});
        }

        activeIndex = nextIndex;
        attempts++;
        continue;
      }

      // If it's a specific CNPJ status (e.g. document does not exist)
      return {
        ok: false,
        success: false,
        valid: false,
        error_code: 'NOT_FOUND',
        message: msg || 'CNPJ não encontrado na base de dados da Receita Federal.'
      };
    } catch (netErr) {
      console.error(`❌ [CNPJ Service] Falha de rede no token #${activeIndex + 1}:`, netErr.message);
      activeIndex = (activeIndex + 1) % tokens.length;
      attempts++;
    }
  }

  // ALL TOKENS EXHAUSTED!
  console.error('🚨 [CNPJ Service] ALERTA CRÍTICO: Todos os tokens de CNPJ estão sem saldo ou inacessíveis!');
  
  if (telegramBot && typeof telegramBot.notifyTokensExhausted === 'function') {
    telegramBot.notifyTokensExhausted(formatCNPJ(cnpjDigits), leadInfo, exhaustedTokens).catch(() => {});
  }

  return {
    ok: false,
    success: false,
    valid: true,
    credits_exhausted: true,
    fallback_whatsapp: true,
    message: 'Consulta automática indisponível no momento. Redirecionando para atendimento VIP consultivo no WhatsApp.'
  };
}

/**
 * Tests all registered tokens using last_update=2 (Consumes ZERO credits!)
 */
async function testAllTokens() {
  const tokens = getCnpjTokens();
  const activeIdx = getCnpjActiveIndex();
  const testCnpj = '13481309000192'; // Standard test CNPJ

  const results = await Promise.all(
    tokens.map(async (token, idx) => {
      const t0 = Date.now();
      try {
        const resp = await queryHubCnpj(testCnpj, token, true);
        const latency = Date.now() - t0;
        const isOk = resp && resp.return === 'OK';
        return {
          index: idx,
          token: token,
          masked_token: token.substring(0, 9) + '...' + token.slice(-5),
          is_active: idx === activeIdx,
          status: isOk ? 'OK' : 'ERROR',
          message: isOk ? 'Ativo com Crédito' : (resp.message || 'Erro de autenticação'),
          latency_ms: latency
        };
      } catch (err) {
        return {
          index: idx,
          token: token,
          masked_token: token.substring(0, 9) + '...' + token.slice(-5),
          is_active: idx === activeIdx,
          status: 'OFFLINE',
          message: err.message,
          latency_ms: Date.now() - t0
        };
      }
    })
  );

  return results;
}

module.exports = {
  isValidCNPJ,
  cleanCNPJ,
  formatCNPJ,
  consultCnpjWithAutoFallback,
  testAllTokens
};
