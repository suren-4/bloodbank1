/**
 * Helper script to safely start the server
 * Will attempt to shut down any existing Node processes first
 */

const { spawn, exec } = require('child_process');
const os = require('os');

console.log('Checking for existing Node.js processes...');

// Command differs based on OS
const isWindows = os.platform() === 'win32';
const killCommand = isWindows 
  ? 'taskkill /F /IM node.exe' 
  : "killall -9 node";

// Try to kill existing Node processes
exec(killCommand, (error) => {
  if (error) {
    // If error occurs, it likely means no processes were found to kill
    console.log('No existing Node.js processes found or unable to kill them.');
  } else {
    console.log('Successfully terminated existing Node.js processes.');
  }
  
  console.log('Starting server...');
  
  // Start the server
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Handle termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}. Shutting down server gracefully...`);
      server.kill(signal);
    });
  });
}); 