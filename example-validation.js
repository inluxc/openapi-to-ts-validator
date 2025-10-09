// Complete example demonstrating the new validation functionality
const { generate } = require('./dist/generate.js');
const fs = require('fs');
const path = require('path');

// Create a test schema
const testSchemaContent = `
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          minimum: 1
        name:
          type: string
          minLength: 2
        email:
          type: string
          format: email
        age:
          type: integer
          minimum: 0
          maximum: 120
      required: ['id', 'name', 'email']
`;

async function demonstrateValidation() {
  try {
    console.log('🚀 Creating test schema and generating validation code...\n');
    
    // Write schema to temporary file
    fs.writeFileSync('./test-schema.yaml', testSchemaContent);
    
    // Generate validation code
    await generate({
      schemaFile: './test-schema.yaml',
      schemaType: 'yaml',
      directory: './demo-output',
      prettierOptions: { 
        semi: true, 
        singleQuote: true,
        parser: 'typescript'
      }
    });
    
    console.log('✅ Validation code generated successfully!\n');
    
    // Import the generated decoder
    const { UserDecoder } = require('./demo-output/decoders/index.js');
    
    console.log('📋 Testing different validation scenarios:\n');
    
    // Test 1: Valid data
    console.log('1️⃣  Testing VALID data:');
    const validData = { 
      id: 1, 
      name: 'John Doe', 
      email: 'john@example.com',
      age: 30 
    };
    
    const validResult = UserDecoder.validate(validData);
    console.log('   Result:', {
      success: validResult.success,
      hasData: !!validResult.data,
      message: validResult.message || 'No message'
    });
    console.log('   Data:', validResult.data);
    console.log('');
    
    // Test 2: Missing required field
    console.log('2️⃣  Testing MISSING required field (email):');
    const missingEmailData = { 
      id: 2, 
      name: 'Jane Doe'
    };
    
    const missingResult = UserDecoder.validate(missingEmailData);
    console.log('   Result:', {
      success: missingResult.success,
      hasData: !!missingResult.data,
      message: missingResult.message ? missingResult.message.substring(0, 100) + '...' : 'No message'
    });
    console.log('');
    
    // Test 3: Invalid data types
    console.log('3️⃣  Testing INVALID data types:');
    const invalidTypeData = { 
      id: 'not-a-number', 
      name: 'Bob Smith', 
      email: 'invalid-email',
      age: -5
    };
    
    const invalidResult = UserDecoder.validate(invalidTypeData);
    console.log('   Result:', {
      success: invalidResult.success,
      hasData: !!invalidResult.data,
      message: invalidResult.message ? invalidResult.message.substring(0, 100) + '...' : 'No message'
    });
    console.log('');
    
    // Test 4: Invalid JSON
    console.log('4️⃣  Testing INVALID JSON string:');
    const invalidJsonResult = UserDecoder.validate('{"invalid": json}');
    console.log('   Result:', {
      success: invalidJsonResult.success,
      hasData: !!invalidJsonResult.data,
      message: invalidJsonResult.message || 'No message'
    });
    console.log('');
    
    // Test 5: Comparison with old throwing method
    console.log('5️⃣  Comparing with traditional decode() method:');
    console.log('   New validate() method - Returns result object:');
    const newMethodResult = UserDecoder.validate(missingEmailData);
    console.log('   ✅ Success:', newMethodResult.success);
    console.log('   📝 Message available:', !!newMethodResult.message);
    
    console.log('\n   Old decode() method - Throws error:');
    try {
      const oldMethodResult = UserDecoder.decode(missingEmailData);
      console.log('   ✅ Decoded:', oldMethodResult);
    } catch (error) {
      console.log('   ❌ Threw error:', error.message.substring(0, 80) + '...');
    }
    
    console.log('\n🎉 Validation demonstration completed!');
    console.log('\n📖 Usage Summary:');
    console.log('   • Use decoder.validate(data) for non-throwing validation');
    console.log('   • Returns: { success: boolean, data?: T, message?: string }');
    console.log('   • Use decoder.decode(data) for traditional error-throwing behavior');
    
    // Clean up
    fs.unlinkSync('./test-schema.yaml');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    // Clean up on error
    if (fs.existsSync('./test-schema.yaml')) {
      fs.unlinkSync('./test-schema.yaml');
    }
  }
}

// Run the demonstration
demonstrateValidation();