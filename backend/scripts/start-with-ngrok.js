const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend with ngrok...\n');

// Start the backend server
const backendProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit for the server to start, then start ngrok
setTimeout(() => {
  console.log('\n🌐 Starting ngrok tunnel...\n');
  
  const ngrokProcess = spawn('ngrok', ['http', '3001', '--log=stdout'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    backendProcess.kill('SIGINT');
    ngrokProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    backendProcess.kill('SIGTERM');
    ngrokProcess.kill('SIGTERM');
    process.exit(0);
  });

}, 3000);

backendProcess.on('error', (error) => {
  console.error('❌ Backend process error:', error);
});

backendProcess.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}`);
});