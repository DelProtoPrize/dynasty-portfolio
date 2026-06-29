import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const isWin = process.platform === 'win32';

function findPython() {
  const candidates = isWin
    ? ['py -3.12', 'py -3', 'python3.12', 'python3', 'python']
    : ['python3.12', 'python3', 'python'];
  for (const cmd of candidates) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8' }).trim();
      console.log(`Found: ${version} (${cmd})`);
      return cmd;
    } catch {}
  }
  console.error('No Python found. Install Python 3.12+ and ensure it is on PATH.');
  process.exit(1);
}

const pythonCmd = findPython();
const pip = isWin
  ? join('.venv', 'Scripts', 'pip.exe')
  : join('.venv', 'bin', 'pip');

if (!existsSync('.venv')) {
  console.log('Creating virtual environment...');
  execSync(`${pythonCmd} -m venv .venv`, { stdio: 'inherit' });
}

console.log('Installing Python dependencies...');
execSync(`${pip} install --upgrade pip`, { stdio: 'inherit' });
execSync(`${pip} install -r etl/requirements.txt`, { stdio: 'inherit' });

if (!existsSync('etl/data')) {
  mkdirSync('etl/data', { recursive: true });
}

console.log('Installing dashboard dependencies...');
execSync('npm install', { cwd: 'dashboard', stdio: 'inherit' });

console.log('Setup complete.');
