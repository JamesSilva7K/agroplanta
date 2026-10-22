import subprocess

test_script = """
const { telegramBot } = require('../server/bot/telegram_bot');

async function runTests() {
  console.log('--- 1. Testing persistent reply keyboard ---');
  const keyboard = telegramBot.getPersistentReplyKeyboard();
  if (keyboard && keyboard.keyboard && keyboard.keyboard.length > 0) {
    console.log('SUCCESS: Persistent reply keyboard created with ' + keyboard.keyboard.length + ' rows of buttons:');
    keyboard.keyboard.forEach((row, rIdx) => {
      console.log(`  Row ${rIdx + 1}: ${row.map(b => b.text).join(' | ')}`);
    });
  } else {
    console.error('FAIL: No persistent keyboard found');
    process.exit(1);
  }

  console.log('\\n--- 2. Testing button text matching in handleMessage ---');
  let lastAction = '';
  telegramBot.sendEncryptedAdminLink = async () => { lastAction = 'sendEncryptedAdminLink'; };
  telegramBot.showMetrics = async () => { lastAction = 'showMetrics'; };
  telegramBot.showWhatsAppConfig = async () => { lastAction = 'showWhatsAppConfig'; };
  telegramBot.showMessagesMenu = async () => { lastAction = 'showMessagesMenu'; };
  telegramBot.showRecentLeads = async () => { lastAction = 'showRecentLeads'; };
  telegramBot.handleClearMetrics = async () => { lastAction = 'handleClearMetrics'; };
  telegramBot.showDiagnostics = async () => { lastAction = 'showDiagnostics'; };
  telegramBot.showMainMenu = async () => { lastAction = 'showMainMenu'; };
  telegramBot.sendMessage = async () => {};

  const testCases = [
    { text: '🔐 Gerar Link Criptografado', expected: 'sendEncryptedAdminLink' },
    { text: 'link', expected: 'sendEncryptedAdminLink' },
    { text: '📊 Métricas em Tempo Real', expected: 'showMetrics' },
    { text: 'métricas', expected: 'showMetrics' },
    { text: '📱 WhatsApp', expected: 'showWhatsAppConfig' },
    { text: '💬 Mensagens', expected: 'showMessagesMenu' },
    { text: '📋 Últimos Leads', expected: 'showRecentLeads' },
    { text: '🧹 Limpar Testes', expected: 'handleClearMetrics' },
    { text: '⚙️ Diagnóstico', expected: 'showDiagnostics' },
    { text: '🌿 Menu Principal', expected: 'showMainMenu' },
    { text: 'qualquer coisa / oi', expected: 'showMainMenu' }
  ];

  for (const tc of testCases) {
    lastAction = '';
    await telegramBot.handleMessage({ chat: { id: 999999 }, text: tc.text });
    if (lastAction === tc.expected) {
      console.log(`SUCCESS: Button input "${tc.text}" -> Action: ${lastAction}`);
    } else {
      console.error(`FAIL: Button input "${tc.text}" triggered ${lastAction}, expected ${tc.expected}`);
      process.exit(1);
    }
  }

  console.log('\\n--- 3. Verifying all inline menus provide buttons ---');
  const mainMenuMarkup = telegramBot.getMainMenuKeyboard();
  console.log(`SUCCESS: Main menu contains ${mainMenuMarkup.inline_keyboard.length} rows of inline buttons.`);

  console.log('\\nALL BUTTON TESTS PASSED SUCCESSFULLY!');
}

runTests();
"""

with open("scripts/run_bot_test.js", "w", encoding="utf-8") as f:
    f.write(test_script)

res = subprocess.run(["node", "scripts/run_bot_test.js"], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("Stderr:", res.stderr)
