const { execSync } = require('child_process');

try {
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build successful!');
  
  console.log('Running test...');
  execSync('cd tests && npm test src/openapi31-contains-keyword.test.ts', { stdio: 'inherit' });
  console.log('Test successful!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}