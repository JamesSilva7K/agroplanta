/**
 * Plantae Agrocrédito - Database Engine
 * Uses Node.js 24 native SQLite (DatabaseSync)
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tracker.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables & Performance Optimizations
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    session_id TEXT,
    action_key TEXT,
    button_text TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    ip TEXT,
    whatsapp_message TEXT,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

  CREATE TABLE IF NOT EXISTS admin_tokens (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS context_messages (
    action_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    default_message TEXT NOT NULL,
    current_message TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    credit_value TEXT NOT NULL,
    installments INTEGER NOT NULL,
    frequency TEXT NOT NULL,
    estimated_installment TEXT,
    whatsapp_number TEXT,
    whatsapp_message TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device TEXT,
    browser TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_simulations_created ON simulations(created_at);

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);

  CREATE TABLE IF NOT EXISTS lead_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    lead_name TEXT,
    phone TEXT,
    email TEXT,
    document TEXT,
    company_name TEXT,
    credit_value TEXT,
    installments INTEGER,
    frequency TEXT,
    estimated_installment TEXT,
    location TEXT,
    crop TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_lead_steps_session ON lead_steps(session_id);
  CREATE INDEX IF NOT EXISTS idx_lead_steps_created ON lead_steps(created_at);
`);

// Safe column addition for existing db
try {
  db.exec(`ALTER TABLE events ADD COLUMN duration_seconds INTEGER DEFAULT 0;`);
} catch (e) {
  // column already exists
}
try { db.exec(`ALTER TABLE simulations ADD COLUMN name TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE simulations ADD COLUMN phone TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE simulations ADD COLUMN email TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE simulations ADD COLUMN occupation TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE simulations ADD COLUMN total_amount TEXT;`); } catch (e) {}

// Seed initial default configurations if not present
const getCfgStmt = db.prepare('SELECT value FROM config WHERE key = ?');
const setCfgStmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

const defaultConfigs = {
  whatsapp_number: process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624',
  bot_alerts_enabled: '1',
  redirects_active: '1',
  telegram_admin_id: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  primary_color: '#00A870',
  secondary_color: '#013644',
  accent_color: '#006B59',
  banner_slide_1: 'images/hero-1.png',
  banner_slide_2: 'images/hero-2.png',
  banner_slide_3: 'images/hero-3.png',
  banner_slide_4: 'images/banner-davi.jpg',
  banner_mobile: 'images/plantae-hero-1-mb.png',
  cnpj_tokens: JSON.stringify([
    '222246865PxcjWAuBRN401259976',
    '222251070HILFlZqkpd401267568',
    '222255275SslFjwCODP401275160'
  ]),
  cnpj_active_index: '0'
};

for (const [k, v] of Object.entries(defaultConfigs)) {
  const existing = getCfgStmt.get(k);
  if (!existing) {
    setCfgStmt.run(k, v);
  }
}

// Seed initial context-aware messages
const defaultMessages = [
  {
    action_key: 'cta_simular_credito',
    title: 'Simular Crédito (Topo / Cabeçalho)',
    message: '🌾 Olá! Estive navegando no site da Plantae Agrocrédito e gostaria de solicitar uma *Simulação de Crédito Rural* personalizada para o meu agronegócio.'
  },
  {
    action_key: 'cta_faca_simulacao',
    title: 'Faça uma Simulação (Banners Principais)',
    message: '🚜 Olá! Vi as opções de financiamento no site da Plantae e quero simular as taxas e prazos para a minha produção.'
  },
  {
    action_key: 'cta_quero_ser_cliente',
    title: 'Quero ser um Cliente Plantae',
    message: '🌱 Olá! Tenho interesse em me tornar cliente da Plantae Agrocrédito e ter acesso a crédito ágil para o campo.'
  },
  {
    action_key: 'cta_quero_ser_parceiro',
    title: 'Quero ser um Parceiro Plantae',
    message: '🤝 Olá! Sou consultor/correspondente do agro e gostaria de saber como me tornar um parceiro oficial da Plantae.'
  },
  {
    action_key: 'cta_falar_gerente',
    title: 'Falar com um Gerente de Contas',
    message: '👨‍💼 Olá! Gostaria de conversar com um gerente de contas da Plantae Agrocrédito para atendimento exclusivo.'
  },
  {
    action_key: 'cta_credito_rural',
    title: 'Crédito Rural (Culturas e Lavouras)',
    message: '🌾 Olá! Gostaria de consultoria sobre *Crédito Rural* para minha lavoura/safra.'
  },
  {
    action_key: 'cta_consignagro',
    title: 'ConsignAgro (Crédito Consignado)',
    message: '💼 Olá! Gostaria de informações sobre as condições especiais do *ConsignAgro* da Plantae.'
  },
  {
    action_key: 'cta_seguros',
    title: 'Seguros Agrícolas',
    message: '🛡️ Olá! Gostaria de fazer uma cotação de *Seguro Agrícola / Safra* com a equipe Plantae.'
  },
  {
    action_key: 'cta_whatsapp_flutuante',
    title: 'WhatsApp Flutuante (Acesso Rápido)',
    message: '🌾 Olá! Estou no site da Plantae Agrocrédito e gostaria de tirar algumas dúvidas pelo WhatsApp.'
  },
  {
    action_key: 'cta_atendimento_geral',
    title: 'Atendimento Geral / Rodapé',
    message: '💬 Olá! Gostaria de atendimento comercial da equipe Plantae Agrocrédito.'
  },
  {
    action_key: 'cta_na_midia',
    title: 'Plantae na Mídia / Ler Matérias',
    message: '📰 Olá! Vi as matérias e reportagens sobre a Plantae Agrocrédito e gostaria de entender melhor as soluções para o agronegócio.'
  },
  {
    action_key: 'cta_quem_somos',
    title: 'Institucional - Quem Somos',
    message: '🌱 Olá! Estive no site da Plantae Agrocrédito e gostaria de conhecer mais sobre a atuação da empresa no agronegócio.'
  },
  {
    action_key: 'cta_orientacao_financeira',
    title: 'Orientação Financeira',
    message: '🌾 Olá! Gostaria de receber orientação financeira personalizada para planejamento da minha safra.'
  },
  {
    action_key: 'cta_correspondentes',
    title: 'Correspondentes Autorizados',
    message: '🤝 Olá! Gostaria de falar com o time de correspondentes da Plantae Agrocrédito.'
  },
  {
    action_key: 'cta_governanca',
    title: 'Governança Corporativa',
    message: '📄 Olá! Gostaria de informações sobre governança corporativa da Plantae Agrocrédito.'
  },
  {
    action_key: 'cta_documentos',
    title: 'Documentos e Publicações',
    message: '📋 Olá! Gostaria de solicitar documentos e publicações oficiais da Plantae Agrocrédito.'
  }
];

const getMsgStmt = db.prepare('SELECT current_message FROM context_messages WHERE action_key = ?');
const insertMsgStmt = db.prepare(`
  INSERT INTO context_messages (action_key, title, default_message, current_message)
  VALUES (?, ?, ?, ?)
`);

for (const m of defaultMessages) {
  const existing = getMsgStmt.get(m.action_key);
  if (!existing) {
    insertMsgStmt.run(m.action_key, m.title, m.message, m.message);
  }
}

module.exports = {
  db,
  getConfig(key) {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  setConfig(key, value) {
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value));
  },
  getAllConfigs() {
    const rows = db.prepare('SELECT key, value FROM config').all();
    const configMap = {};
    for (const r of rows) {
      configMap[r.key] = r.value;
    }
    return configMap;
  },
  getContextMessages() {
    return db.prepare('SELECT * FROM context_messages ORDER BY action_key ASC').all();
  },
  getContextMessage(action_key) {
    return db.prepare('SELECT * FROM context_messages WHERE action_key = ?').get(action_key);
  },
  updateContextMessage(action_key, newMessage) {
    return db.prepare(`
      UPDATE context_messages 
      SET current_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE action_key = ?
    `).run(newMessage, action_key);
  },
  resetContextMessage(action_key) {
    return db.prepare(`
      UPDATE context_messages 
      SET current_message = default_message, updated_at = CURRENT_TIMESTAMP 
      WHERE action_key = ?
    `).run(action_key);
  },
  insertEvent(data) {
    const stmt = db.prepare(`
      INSERT INTO events (
        type, session_id, action_key, button_text, referrer,
        utm_source, utm_medium, utm_campaign, device, browser, os, ip, whatsapp_message, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.type || 'input',
      data.session_id || '',
      data.action_key || '',
      data.button_text || '',
      data.referrer || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.device || 'Desktop',
      data.browser || '',
      data.os || '',
      data.ip || '',
      data.whatsapp_message || '',
      data.duration_seconds || 0
    );
  },
  getRecentEvents(limit = 100) {
    return db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit);
  },
  getRecentLeads(limit = 50) {
    return db.prepare(`
      SELECT * FROM events 
      WHERE type = 'output_whatsapp' 
      ORDER BY id DESC 
      LIMIT ?
    `).all(limit);
  },
  getSystemStats() {
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const totalInputs = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'input'").get().count;
    const totalExits = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'exit'").get().count;
    const totalLeads = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'output_whatsapp'").get().count;
    const totalSocial = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'output_social'").get().count;
    return {
      total_events: totalEvents,
      total_inputs: totalInputs,
      total_exits: totalExits,
      total_leads: totalLeads,
      total_social: totalSocial
    };
  },
  saveSimulation(data) {
    const stmt = db.prepare(`
      INSERT INTO simulations (
        session_id, credit_value, installments, frequency,
        estimated_installment, whatsapp_number, whatsapp_message,
        utm_source, utm_medium, utm_campaign, device, browser, ip,
        name, phone, email, occupation, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.session_id || '',
      data.credit_value || '',
      data.installments || 0,
      data.frequency || '',
      data.estimated_installment || '',
      data.whatsapp_number || '',
      data.whatsapp_message || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.device || 'Desktop',
      data.browser || '',
      data.ip || '',
      data.name || '',
      data.phone || '',
      data.email || '',
      data.occupation || '',
      data.total_amount || ''
    );
  },
  getRecentSimulations(limit = 50) {
    return db.prepare('SELECT * FROM simulations ORDER BY id DESC LIMIT ?').all(limit);
  },
  getCnpjTokens() {
    try {
      const raw = module.exports.getConfig('cnpj_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      '222246865PxcjWAuBRN401259976',
      '222251070HILFlZqkpd401267568',
      '222255275SslFjwCODP401275160'
    ];
  },
  getCnpjActiveIndex() {
    const raw = module.exports.getConfig('cnpj_active_index');
    const idx = parseInt(raw, 10);
    return isNaN(idx) ? 0 : idx;
  },
  getActiveCnpjToken() {
    const tokens = module.exports.getCnpjTokens();
    const idx = module.exports.getCnpjActiveIndex();
    return tokens[idx] || tokens[0] || '222246865PxcjWAuBRN401259976';
  },
  setCnpjActiveIndex(idx) {
    const tokens = module.exports.getCnpjTokens();
    const safeIdx = Math.max(0, Math.min(idx, tokens.length - 1));
    module.exports.setConfig('cnpj_active_index', String(safeIdx));
    return safeIdx;
  },
  addCnpjToken(token) {
    if (!token || typeof token !== 'string') return false;
    const cleanToken = token.trim();
    if (!cleanToken) return false;
    const tokens = module.exports.getCnpjTokens();
    if (!tokens.includes(cleanToken)) {
      tokens.push(cleanToken);
      module.exports.setConfig('cnpj_tokens', JSON.stringify(tokens));
    }
    return tokens;
  },
  removeCnpjToken(idx) {
    const tokens = module.exports.getCnpjTokens();
    if (tokens.length <= 1) return false;
    if (idx >= 0 && idx < tokens.length) {
      tokens.splice(idx, 1);
      let activeIdx = module.exports.getCnpjActiveIndex();
      if (activeIdx >= tokens.length) activeIdx = 0;
      module.exports.setConfig('cnpj_tokens', JSON.stringify(tokens));
      module.exports.setConfig('cnpj_active_index', String(activeIdx));
      return tokens;
    }
    return false;
  },
  rotateCnpjToken() {
    const tokens = module.exports.getCnpjTokens();
    const currentIdx = module.exports.getCnpjActiveIndex();
    const nextIdx = (currentIdx + 1) % tokens.length;
    module.exports.setConfig('cnpj_active_index', String(nextIdx));
    return { oldIndex: currentIdx, newIndex: nextIdx, token: tokens[nextIdx] };
  },

  // --- SYSTEM LOGS ENGINE ---
  insertLog(level, category, message, details = null, session_id = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO system_logs (level, category, message, details, session_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      return stmt.run(
        String(level || 'INFO').toUpperCase(),
        String(category || 'GENERAL').toUpperCase(),
        String(message || ''),
        details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
        session_id ? String(session_id) : null
      );
    } catch (e) {
      console.error('Failed to insert log into DB:', e.message);
      return null;
    }
  },
  getRecentLogs(limit = 20, minLevel = null) {
    try {
      if (minLevel) {
        return db.prepare(`
          SELECT * FROM system_logs 
          WHERE level = ? 
          ORDER BY id DESC LIMIT ?
        `).all(String(minLevel).toUpperCase(), limit);
      }
      return db.prepare('SELECT * FROM system_logs ORDER BY id DESC LIMIT ?').all(limit);
    } catch (e) {
      return [];
    }
  },
  getLogsSummary(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const rows = db.prepare(`
        SELECT level, COUNT(*) as count 
        FROM system_logs 
        WHERE created_at >= ?
        GROUP BY level
      `).all(since);
      const summary = { errors: 0, warnings: 0, info: 0, total: 0 };
      for (const r of rows) {
        summary.total += r.count;
        if (r.level === 'ERROR' || r.level === 'CRITICAL') summary.errors += r.count;
        else if (r.level === 'WARN' || r.level === 'WARNING') summary.warnings += r.count;
        else summary.info += r.count;
      }
      return summary;
    } catch (e) {
      return { errors: 0, warnings: 0, info: 0, total: 0 };
    }
  },

  // --- LEAD ADVANCED STEP FUNNEL TRACKING ---
  recordLeadStep(stepData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO lead_steps (
          session_id, step_number, step_name, lead_name, phone, email,
          document, company_name, credit_value, installments, frequency,
          estimated_installment, location, crop, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      return stmt.run(
        stepData.session_id || 'sess_' + Date.now(),
        parseInt(stepData.step_number || stepData.step || 1, 10),
        stepData.step_name || `Etapa ${stepData.step_number || stepData.step}`,
        stepData.lead_name || stepData.name || null,
        stepData.phone || null,
        stepData.email || null,
        stepData.document || null,
        stepData.company_name || null,
        stepData.credit_value ? String(stepData.credit_value) : null,
        parseInt(stepData.installments, 10) || null,
        stepData.frequency || null,
        stepData.estimated_installment ? String(stepData.estimated_installment) : null,
        stepData.location || null,
        stepData.crop || null,
        stepData.metadata ? (typeof stepData.metadata === 'object' ? JSON.stringify(stepData.metadata) : String(stepData.metadata)) : null
      );
    } catch (e) {
      console.error('Failed to record lead step in DB:', e.message);
      return null;
    }
  },
  getRecentLeadSteps(limit = 15) {
    try {
      return db.prepare('SELECT * FROM lead_steps ORDER BY id DESC LIMIT ?').all(limit);
    } catch (e) {
      return [];
    }
  },
  getLeadFunnelStats(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const rows = db.prepare(`
        SELECT step_number, COUNT(DISTINCT session_id) as unique_sessions, COUNT(*) as total_hits
        FROM lead_steps
        WHERE created_at >= ?
        GROUP BY step_number
        ORDER BY step_number ASC
      `).all(since);
      return rows;
    } catch (e) {
      return [];
    }
  }
};
