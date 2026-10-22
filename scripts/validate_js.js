const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');
const line380 = lines[379];

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
while ((match = scriptRegex.exec(line380)) !== null) {
  const code = match[1];
  if (code.trim().length === 0) continue;
  try {
    new Function(code);
    console.log(`Script ${idx}: VALID JS`);
  } catch (err) {
    console.error(`Script ${idx}: SYNTAX ERROR: ${err.message}`);
    console.log(`Code snippet around error:`, code.substring(0, 300));
  }
  idx++;
}
