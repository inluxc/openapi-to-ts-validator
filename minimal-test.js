// Simple test to check if the modules can be imported
try {
  console.log('Testing imports...');
  
  // Test if we can require the modules
  const parseSchema = require('./dist/parse-schema.js');
  console.log('parse-schema imported successfully');
  
  const transformer = require('./dist/transform/openapi31-contains-transformer.js');
  console.log('contains transformer imported successfully');
  
  console.log('All imports successful!');
} catch (error) {
  console.error('Import error:', error.message);
}