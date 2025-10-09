const { spawn } = require('child_process');
const path = require('path');

console.log('Running build...');

const build = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

build.on('close', (code) => {
  if (code !== 0) {
    console.error(`Build failed with code ${code}`);
    process.exit(1);
  }
  
  console.log('Build successful, running test...');
  
  const test = spawn('npm', ['test', 'src/openapi31-contains-keyword.test.ts'], {
    cwd: path.join(__dirname, 'tests'),
    stdio: 'inherit',
    shell: true
  });
  
  test.on('close', (testCode) => {
    if (testCode !== 0) {
      console.error(`Test failed with code ${testCode}`);
      process.exit(1);
    }
    console.log('Test successful!');
  });
});