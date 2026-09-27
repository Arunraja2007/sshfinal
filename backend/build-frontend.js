import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '../frontend');
const targetDistDir = path.resolve(__dirname, 'dist');

console.log('[Build] Target frontend directory:', frontendDir);
console.log('[Build] Building frontend production bundle...');

try {
  // 1. Install frontend dependencies including dev tools
  execSync('npm install --include=dev', {
    cwd: frontendDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  // 2. Build frontend production assets with Vite
  execSync('npx vite build', {
    cwd: frontendDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });

  // 3. Ensure target dist directory in backend exists
  if (fs.existsSync(targetDistDir)) {
    fs.rmSync(targetDistDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDistDir, { recursive: true });

  // 4. Copy frontend/dist to backend/dist
  const sourceDistDir = path.join(frontendDir, 'dist');
  console.log('[Build] Copying built assets from', sourceDistDir, 'to', targetDistDir);

  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItem) => {
        copyRecursive(path.join(src, childItem), path.join(dest, childItem));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(sourceDistDir, targetDistDir);
  console.log('[Build] Frontend build and asset synchronization completed successfully!');
} catch (error) {
  console.error('[Build Error]:', error);
  process.exit(1);
}
