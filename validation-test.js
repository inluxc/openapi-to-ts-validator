// Test to demonstrate the new validation functionality using existing test files
const path = require('path');

async function testValidation() {
  try {
    console.log('Testing the new validation functionality...');
    
    // Use existing generated test files
    const { UserDecoder } = require('./tests/generated/simple/decoders/index.ts');
    
    console.log('\n--- Testing validation with valid data ---');
    const validData = { id: '123', name: 'John Doe' };
    
    // Test the new validate method (returns ValidationResult)
    const validResult = UserDecoder.validate(validData);
    console.log('Valid data result:', validResult);
    
    // Test the decode method (throws on error)
    try {
      const decodedValid = UserDecoder.decode(validData);
      console.log('Decoded valid data:', decodedValid);
    } catch (error) {
      console.log('Decode error (unexpected):', error.message);
    }
    
    console.log('\n--- Testing validation with invalid data ---');
    const invalidData = { name: 'John Doe' }; // missing required id field
    
    // Test the new validate method (returns ValidationResult)
    const invalidResult = UserDecoder.validate(invalidData);
    console.log('Invalid data result:', invalidResult);
    
    // Test the decode method (throws on error)
    try {
      const decodedInvalid = UserDecoder.decode(invalidData);
      console.log('Decoded invalid data (unexpected):', decodedInvalid);
    } catch (error) {
      console.log('Decode error (expected):', error.message);
    }
    
    console.log('\n--- Test completed successfully! ---');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.log('Note: You may need to run the tests first to generate the test files.');
    console.log('Try running: npm test');
  }
}

testValidation();