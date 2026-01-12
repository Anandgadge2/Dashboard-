const { spawn } = require('child_process');
const path = require('path');

console.log('Starting backend directly with ts-node...');

const child = spawn('npx', ['ts-node', 'src/server.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start backend:', error);
});

child.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down backend...');
  child.kill('SIGINT');
});
