const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Windows offline installer test preserves the dot-prefixed backup folder name', () => {
  const script = fs.readFileSync(path.join(__dirname, 'install-recommended-windows.ps1'), 'utf8');
  assert.match(script, /\$existing\.backup\.Substring\(2\)/);
  assert.match(script, /\$backupFolder=Join-Path \$temp/);
  assert.match(script, /Test-Path -LiteralPath \(Join-Path \$backupFolder 'custom-model\.txt'\)/);
  assert.doesNotMatch(script, /\$existing\.backup\.TrimStart\(/);
});
