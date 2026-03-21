const fs = require('fs');
const path = require('path');

/**
 * PWA Guard Script
 * Ensures the PWA architecture remains "bulletproof" by preventing regressions.
 */

const VITE_CONFIG_PATH = path.join(__dirname, '../vite.config.ts');
const MANIFEST_PATH = path.join(__dirname, '../public/manifest.json');

let hasError = false;

// 1. Check vite.config.ts for VitePWA plugin
if (fs.existsSync(VITE_CONFIG_PATH)) {
  const viteConfig = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
  if (viteConfig.includes('vite-plugin-pwa')) {
    console.error('\x1b[31m%s\x1b[0m', '❌ ARCHITECTURAL VIOLATION: vite-plugin-pwa detected in vite.config.ts.');
    console.error('The project uses a hardcoded Native PWA layer. Remove VitePWA to continue.');
    hasError = true;
  }
}

// 2. Check manifest.json for leading slashes in icon paths (Android failure vector)
if (fs.existsSync(MANIFEST_PATH)) {
  const manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  if (manifest.includes('"/icon-')) {
    console.error('\x1b[31m%s\x1b[0m', '❌ PWA COMPLIANCE ERROR: Leading slash detected in manifest icon paths.');
    console.error('Android installation will fail if icons have leading slashes. Use "icon-192.png" instead of "/icon-192.png".');
    hasError = true;
  }
} else {
  console.error('\x1b[31m%s\x1b[0m', '❌ MISSING MANIFEST: public/manifest.json not found.');
  hasError = true;
}

if (hasError) {
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', '✅ PWA Guard: Architecture verified.');
}
