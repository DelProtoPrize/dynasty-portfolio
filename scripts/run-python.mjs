import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const isWin = process.platform === 'win32';
const venvPython = isWin
  ? join('.venv', 'Scripts', 'python.exe')
  : join('.venv', 'bin', 'python');

if (!existsSync(venvPython)) {
  console.error(`Python not found at ${venvPython}`);
  console.error('Run "npm run setup" first to create the virtual environment.');
  process.exit(1);
}

const args = process.argv.slice(2).join(' ');
execSync(`${venvPython} ${args}`, { stdio: 'inherit' });
