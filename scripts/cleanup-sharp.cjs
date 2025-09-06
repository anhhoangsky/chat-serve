// Remove platform-incompatible sharp optional packages that can cause EACCES on Windows
const fs = require('fs');
const path = require('path');

function rmrf(p) {
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`[cleanup-sharp] Removed ${p}`);
    }
  } catch (err) {
    console.warn(`[cleanup-sharp] Failed to remove ${p}: ${err.message}`);
  }
}

try {
  const pnpmDir = path.join('node_modules', '.pnpm');
  if (!fs.existsSync(pnpmDir)) process.exit(0);
  const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (!ent.name.startsWith('sharp@')) continue;
    const imgDir = path.join(pnpmDir, ent.name, 'node_modules', '@img');
    if (!fs.existsSync(imgDir)) continue;
    const sub = fs.readdirSync(imgDir, { withFileTypes: true });
    for (const s of sub) {
      if (!s.isDirectory()) continue;
      const name = s.name.toLowerCase();
      if (name.includes('linux')) {
        rmrf(path.join(imgDir, s.name));
      }
    }
  }
} catch (err) {
  console.warn(`[cleanup-sharp] Skipped with warning: ${err.message}`);
}

