import { transformContains } from './dist/transform/openapi31-contains-transformer.js';

console.log('Testing transformContains function...');

const testSchema = {
  type: "array",
  contains: {
    type: "string",
    pattern: "^test-"
  },
  description: "Array that must contain at least one string starting with 'test-'"
};

try {
  const result = transformContains(testSchema);
  console.log('Transform result:', JSON.stringify(result, null, 2));
  console.log('Test passed!');
} catch (error) {
  console.error('Test failed:', error.message);
}