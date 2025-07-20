import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { generate } from "openapi-to-ts-validator";

describe("OpenAPI 3.1 Generated Code Validation", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const outputDir = path.join(__dirname, "../output/code-validation");
  const tempDir = path.join(__dirname, "../temp");

  beforeAll(() => {
    [outputDir, tempDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    });
  });

  afterAll(() => {
    [outputDir, tempDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("TypeScript Compilation", () => {
    test("should generate TypeScript code that compiles without errors", async () => {
      const testSchemas = [
        "openapi-3.1-test.yaml",
        "openapi-3.1-comprehensive.yaml",
        "openapi-3.1-ecommerce.yaml"
      ];

      for (const schemaFile of testSchemas) {
        const schemaName = path.basename(schemaFile, ".yaml");
        const testOutputDir = path.join(outputDir, `compile-${schemaName}`);

        await generate({
          schemaFile: path.join(schemaDir, schemaFile),
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalTypes: true,
            enableTupleTypes: true,
            enableEnhancedDiscriminator: true,
            enableUnevaluatedProperties: true,
            enableContains: true
          }
        });

        // Create a test TypeScript file that imports the generated code
        const testTsFile = path.join(testOutputDir, "test-import.ts");
        const testContent = `
import * as models from './models';
import * as decoders from './decoders';
import { validateJson } from './validate';

// Test that we can import and use the generated code
console.log('Models imported successfully');
console.log('Decoders imported successfully');
console.log('Validator imported successfully');

// Test basic usage
const result = validateJson('{}', 'User');
console.log('Validation result:', result);
`;

        fs.writeFileSync(testTsFile, testContent);

        // Create tsconfig.json for compilation
        const tsConfigPath = path.join(testOutputDir, "tsconfig.json");
        const tsConfig = {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            lib: ["ES2020"],
            outDir: "./dist",
            rootDir: "./",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: "node",
            resolveJsonModule: true
          },
          include: ["*.ts"],
          exclude: ["node_modules", "dist"]
        };

        fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

        // Create package.json for dependencies
        const packageJsonPath = path.join(testOutputDir, "package.json");
        const packageJson = {
          name: `test-${schemaName}`,
          version: "1.0.0",
          dependencies: {
            "ajv": "^8.0.0",
            "ajv-formats": "^2.0.0"
          },
          devDependencies: {
            "typescript": "^4.9.0",
            "@types/node": "^18.0.0"
          }
        };

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        try {
          // Install dependencies
          execSync("npm install", { 
            cwd: testOutputDir, 
            stdio: "pipe",
            timeout: 30000 
          });

          // Compile TypeScript
          execSync("npx tsc", { 
            cwd: testOutputDir, 
            stdio: "pipe",
            timeout: 30000 
          });

          // Verify compiled files exist
          const distDir = path.join(testOutputDir, "dist");
          expect(fs.existsSync(distDir)).toBe(true);
          expect(fs.existsSync(path.join(distDir, "models.js"))).toBe(true);
          expect(fs.existsSync(path.join(distDir, "decoders.js"))).toBe(true);
          expect(fs.existsSync(path.join(distDir, "validate.js"))).toBe(true);
          expect(fs.existsSync(path.join(distDir, "test-import.js"))).toBe(true);

          console.log(`✓ ${schemaName} compiled successfully`);
        } catch (error) {
          console.error(`Compilation failed for ${schemaName}:`, error);
          throw error;
        }
      }
    });

    test("should generate valid standalone validators", async () => {
      const schemaFile = "openapi-3.1-comprehensive.yaml";
      const testOutputDir = path.join(outputDir, "standalone-validation");

      await generate({
        schemaFile: path.join(schemaDir, schemaFile),
        schemaType: "yaml",
        directory: testOutputDir,
        standalone: {
          validatorOutput: "module"
        },
        openapi31: {
          enableWebhooks: true,
          strictNullHandling: true,
          enableConditionalTypes: true,
          enableTupleTypes: true,
          enableEnhancedDiscriminator: true
        }
      });

      // Test that standalone validator is valid JavaScript
      const standalonePath = path.join(testOutputDir, "standalone.mjs");
      expect(fs.existsSync(standalonePath)).toBe(true);

      const standaloneContent = fs.readFileSync(standalonePath, "utf8");
      
      // Should be valid ES module syntax
      expect(standaloneContent).toContain("export");
      expect(standaloneContent).toMatch(/export\s+\{[^}]*validate/);

      // Create a test file to import and use the standalone validator
      const testFile = path.join(testOutputDir, "test-standalone.mjs");
      const testContent = `
import { validateUser, validateApiResponse } from './standalone.mjs';

// Test User validation
const validUser = {
  id: "user123",
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  isActive: true,
  metadata: null,
  tags: ["premium"]
};

const invalidUser = {
  id: "user456",
  // missing required name
  email: "invalid-email"
};

console.log('Valid user:', validateUser ? validateUser(validUser) : 'validateUser not found');
console.log('Invalid user:', validateUser ? validateUser(invalidUser) : 'validateUser not found');

// Test ApiResponse validation
const validResponse = {
  version: "2.0",
  status: "success",
  timestamp: "2024-01-15T10:30:00Z",
  data: { result: "ok" }
};

console.log('Valid response:', validateApiResponse ? validateApiResponse(validResponse) : 'validateApiResponse not found');
`;

      fs.writeFileSync(testFile, testContent);

      try {
        // Run the test with Node.js
        const output = execSync(`node ${testFile}`, { 
          cwd: testOutputDir,
          encoding: "utf8",
          timeout: 10000
        });

        console.log("Standalone validator test output:", output);
        
        // Should not throw and should produce output
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        console.error("Standalone validator test failed:", error);
        throw error;
      }
    });
  });

  describe("Runtime Validation", () => {
    test("should generate working validators for OpenAPI 3.1 features", async () => {
      const testOutputDir = path.join(outputDir, "runtime-validation");

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.1-comprehensive.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        openapi31: {
          enableWebhooks: true,
          strictNullHandling: true,
          enableConditionalTypes: true,
          enableTupleTypes: true,
          enableEnhancedDiscriminator: true,
          enableUnevaluatedProperties: true,
          enableContains: true
        }
      });

      // Create a comprehensive test file
      const testFile = path.join(testOutputDir, "runtime-test.js");
      const testContent = `
const { validateJson } = require('./validate');
const fs = require('fs');

// Load the schema
const schema = JSON.parse(fs.readFileSync('./schema.json', 'utf8'));

// Test data for various OpenAPI 3.1 features
const testCases = [
  {
    name: 'User with type arrays (null handling)',
    schema: 'User',
    validData: {
      id: "user123",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
      isActive: true,
      metadata: { lastLogin: "2024-01-15T10:30:00Z" },
      tags: ["premium", "verified"]
    },
    validDataWithNulls: {
      id: "user456",
      name: "Jane Smith",
      email: null,
      age: null,
      isActive: null,
      metadata: null,
      tags: null
    },
    invalidData: {
      id: "user789",
      // missing required name
      email: "invalid-email",
      age: -5
    }
  },
  {
    name: 'Coordinates (prefixItems/tuples)',
    schema: 'Coordinates',
    validData: [40.7128, -74.0060],
    validDataWithNull: [40.7128, -74.0060, null],
    invalidData: [40.7128] // missing longitude
  },
  {
    name: 'ApiResponse (const keyword)',
    schema: 'ApiResponse',
    validData: {
      version: "2.0",
      status: "success",
      timestamp: "2024-01-15T10:30:00Z",
      data: { result: "ok" }
    },
    invalidData: {
      version: "1.0", // wrong const value
      status: "success",
      timestamp: "2024-01-15T10:30:00Z"
    }
  },
  {
    name: 'Account (conditional schemas)',
    schema: 'Account',
    validPremium: {
      type: "premium",
      name: "Premium Account",
      limits: { storage: 150, bandwidth: 1500, users: 10 },
      features: ["priority-support", "advanced-analytics"]
    },
    validBasic: {
      type: "basic",
      name: "Basic Account",
      limits: { storage: 5, bandwidth: 50, users: 1 },
      features: ["basic-support"]
    },
    invalidPremium: {
      type: "premium",
      name: "Invalid Premium",
      limits: { storage: 50, bandwidth: 500 }, // too low for premium
      features: ["basic-support"] // missing priority-support
    }
  },
  {
    name: 'Notification (discriminator)',
    schema: 'Notification',
    validEmail: {
      type: "email",
      timestamp: "2024-01-15T10:30:00Z",
      recipient: "user@example.com",
      subject: "Test Email",
      body: "This is a test email",
      attachments: null
    },
    validSms: {
      type: "sms",
      timestamp: "2024-01-15T10:30:00Z",
      phoneNumber: "+1234567890",
      message: "Test SMS",
      countryCode: "US"
    },
    invalidDiscriminator: {
      type: "invalid-type",
      timestamp: "2024-01-15T10:30:00Z"
    }
  }
];

let passedTests = 0;
let totalTests = 0;

function runTest(testName, schemaName, data, shouldPass = true) {
  totalTests++;
  try {
    const result = validateJson(JSON.stringify(data), schemaName);
    if (result.success === shouldPass) {
      console.log(\`✓ \${testName}: \${shouldPass ? 'PASS' : 'FAIL (expected)'}\`);
      passedTests++;
    } else {
      console.log(\`✗ \${testName}: Expected \${shouldPass ? 'success' : 'failure'} but got \${result.success ? 'success' : 'failure'}\`);
      if (!result.success && result.errors) {
        console.log(\`  Errors: \${JSON.stringify(result.errors, null, 2)}\`);
      }
    }
  } catch (error) {
    console.log(\`✗ \${testName}: Exception - \${error.message}\`);
  }
}

// Run all test cases
testCases.forEach(testCase => {
  console.log(\`\\nTesting \${testCase.name}:\`);
  
  if (testCase.validData) {
    runTest(\`\${testCase.name} - valid data\`, testCase.schema, testCase.validData, true);
  }
  
  if (testCase.validDataWithNulls) {
    runTest(\`\${testCase.name} - valid data with nulls\`, testCase.schema, testCase.validDataWithNulls, true);
  }
  
  if (testCase.validDataWithNull) {
    runTest(\`\${testCase.name} - valid data with null\`, testCase.schema, testCase.validDataWithNull, true);
  }
  
  if (testCase.validPremium) {
    runTest(\`\${testCase.name} - valid premium\`, testCase.schema, testCase.validPremium, true);
  }
  
  if (testCase.validBasic) {
    runTest(\`\${testCase.name} - valid basic\`, testCase.schema, testCase.validBasic, true);
  }
  
  if (testCase.validEmail) {
    runTest(\`\${testCase.name} - valid email\`, testCase.schema, testCase.validEmail, true);
  }
  
  if (testCase.validSms) {
    runTest(\`\${testCase.name} - valid SMS\`, testCase.schema, testCase.validSms, true);
  }
  
  if (testCase.invalidData) {
    runTest(\`\${testCase.name} - invalid data\`, testCase.schema, testCase.invalidData, false);
  }
  
  if (testCase.invalidPremium) {
    runTest(\`\${testCase.name} - invalid premium\`, testCase.schema, testCase.invalidPremium, false);
  }
  
  if (testCase.invalidDiscriminator) {
    runTest(\`\${testCase.name} - invalid discriminator\`, testCase.schema, testCase.invalidDiscriminator, false);
  }
});

console.log(\`\\nTest Results: \${passedTests}/\${totalTests} passed\`);

if (passedTests === totalTests) {
  console.log('All tests passed! ✓');
  process.exit(0);
} else {
  console.log('Some tests failed! ✗');
  process.exit(1);
}
`;

      fs.writeFileSync(testFile, testContent);

      // Create package.json for dependencies
      const packageJsonPath = path.join(testOutputDir, "package.json");
      const packageJson = {
        name: "runtime-validation-test",
        version: "1.0.0",
        dependencies: {
          "ajv": "^8.0.0",
          "ajv-formats": "^2.0.0"
        }
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      try {
        // Install dependencies
        execSync("npm install", { 
          cwd: testOutputDir, 
          stdio: "pipe",
          timeout: 30000 
        });

        // Run the runtime validation test
        const output = execSync(`node runtime-test.js`, { 
          cwd: testOutputDir,
          encoding: "utf8",
          timeout: 30000
        });

        console.log("Runtime validation test output:");
        console.log(output);

        // Should indicate all tests passed
        expect(output).toContain("All tests passed!");
        expect(output).not.toContain("Some tests failed!");
      } catch (error) {
        console.error("Runtime validation test failed:", error);
        if (error.stdout) console.log("STDOUT:", error.stdout);
        if (error.stderr) console.log("STDERR:", error.stderr);
        throw error;
      }
    });

    test("should handle complex nested validation scenarios", async () => {
      const testOutputDir = path.join(outputDir, "complex-validation");

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.1-ecommerce.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        openapi31: {
          enableWebhooks: true,
          strictNullHandling: true,
          enableConditionalTypes: true,
          enableTupleTypes: true,
          enableEnhancedDiscriminator: true,
          enableUnevaluatedProperties: true,
          enableContains: true
        }
      });

      // Create a test for complex e-commerce scenarios
      const testFile = path.join(testOutputDir, "ecommerce-test.js");
      const testContent = `
const { validateJson } = require('./validate');

// Test complex e-commerce order validation
const validOrder = {
  id: "order123",
  orderNumber: "ORD-12345678",
  status: "confirmed",
  customer: {
    id: "cust456",
    profile: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      dateOfBirth: "1990-01-15",
      preferences: {
        newsletter: true,
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: "en",
        currency: "USD"
      }
    },
    addresses: [{
      id: "addr1",
      type: "both",
      isDefault: true,
      address: [
        "123 Main St",
        "Apt 4B",
        "New York",
        "NY",
        "10001",
        "US"
      ],
      coordinates: [40.7128, -74.0060]
    }],
    paymentMethods: [{
      type: "CreditCard",
      id: "pm1",
      isDefault: true,
      lastFour: "1234",
      brand: "visa",
      expiryMonth: 12,
      expiryYear: 2025,
      holderName: "John Doe",
      billingAddress: "addr1"
    }],
    loyaltyProgram: {
      tier: "gold",
      points: 1500,
      benefits: ["free-shipping", "early-access", "priority-support"]
    },
    createdAt: "2024-01-01T00:00:00Z",
    lastActive: "2024-01-15T10:30:00Z"
  },
  items: [{
    productId: "prod123",
    variantId: "var456",
    quantity: 2,
    unitPrice: 29.99,
    totalPrice: 59.98,
    discounts: [{
      type: "percentage",
      value: 10,
      description: "Loyalty discount"
    }]
  }],
  pricing: {
    subtotal: 59.98,
    tax: 4.80,
    shipping: 5.99,
    discounts: 5.99,
    total: 64.78,
    currency: "USD"
  },
  shipping: {
    method: "express",
    address: [
      "123 Main St",
      "Apt 4B", 
      "New York",
      "NY",
      "10001",
      "US"
    ],
    trackingNumber: "TRACK123",
    estimatedDelivery: "2024-01-17",
    actualDelivery: null
  },
  payment: {
    method: {
      type: "CreditCard",
      id: "pm1",
      isDefault: true,
      lastFour: "1234",
      brand: "visa",
      expiryMonth: 12,
      expiryYear: 2025,
      holderName: "John Doe"
    },
    status: "captured",
    transactionId: "txn789",
    authorizedAt: "2024-01-15T10:30:00Z",
    capturedAt: "2024-01-15T10:35:00Z"
  },
  timeline: [
    {
      event: "created",
      timestamp: "2024-01-15T10:30:00Z",
      details: { source: "web" },
      actor: "customer"
    },
    {
      event: "confirmed",
      timestamp: "2024-01-15T10:31:00Z",
      details: null,
      actor: "system"
    }
  ],
  metadata: {
    source: "web",
    campaign: "winter-sale",
    referrer: "google",
    userAgent: "Mozilla/5.0..."
  },
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:31:00Z"
};

console.log('Testing complex e-commerce order validation...');

try {
  const result = validateJson(JSON.stringify(validOrder), 'Order');
  
  if (result.success) {
    console.log('✓ Complex order validation passed');
  } else {
    console.log('✗ Complex order validation failed');
    console.log('Errors:', JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
} catch (error) {
  console.log('✗ Exception during validation:', error.message);
  process.exit(1);
}

// Test product with discriminated category
const validProduct = {
  id: "prod123",
  name: "Test Product",
  description: "A test product",
  price: 29.99,
  originalPrice: 39.99,
  currency: "USD",
  category: {
    type: "physical",
    id: "cat1",
    name: "Electronics",
    shippingRequired: true,
    weightCategory: "light",
    dimensions: {
      maxLength: 30,
      maxWidth: 20,
      maxHeight: 10
    }
  },
  tags: ["electronics", "popular"],
  images: [{
    url: "https://example.com/image.jpg",
    alt: "Product image",
    dimensions: [800, 600]
  }],
  inventory: {
    inStock: true,
    quantity: 50,
    lowStockThreshold: 10,
    locations: [{
      warehouse: "main",
      quantity: 30
    }, {
      warehouse: "backup",
      quantity: 20
    }]
  },
  variants: [{
    id: "var1",
    name: "Red",
    sku: "PROD123-RED",
    price: 29.99,
    attributes: {
      color: "red",
      size: "medium"
    },
    inventory: {
      quantity: 25,
      reserved: 2
    }
  }],
  metadata: {
    featured: true,
    rating: 4.5,
    reviewCount: 150
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
};

try {
  const result = validateJson(JSON.stringify(validProduct), 'Product');
  
  if (result.success) {
    console.log('✓ Complex product validation passed');
  } else {
    console.log('✗ Complex product validation failed');
    console.log('Errors:', JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
} catch (error) {
  console.log('✗ Exception during product validation:', error.message);
  process.exit(1);
}

console.log('All complex validation tests passed! ✓');
`;

      fs.writeFileSync(testFile, testContent);

      // Create package.json
      const packageJsonPath = path.join(testOutputDir, "package.json");
      const packageJson = {
        name: "complex-validation-test",
        version: "1.0.0",
        dependencies: {
          "ajv": "^8.0.0",
          "ajv-formats": "^2.0.0"
        }
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      try {
        // Install dependencies
        execSync("npm install", { 
          cwd: testOutputDir, 
          stdio: "pipe",
          timeout: 30000 
        });

        // Run the complex validation test
        const output = execSync(`node ecommerce-test.js`, { 
          cwd: testOutputDir,
          encoding: "utf8",
          timeout: 30000
        });

        console.log("Complex validation test output:");
        console.log(output);

        expect(output).toContain("All complex validation tests passed!");
      } catch (error) {
        console.error("Complex validation test failed:", error);
        if (error.stdout) console.log("STDOUT:", error.stdout);
        if (error.stderr) console.log("STDERR:", error.stderr);
        throw error;
      }
    });
  });

  describe("Decoder Integration", () => {
    test("should generate working decoders for OpenAPI 3.1 features", async () => {
      const testOutputDir = path.join(outputDir, "decoder-integration");

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.1-comprehensive.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        openapi31: {
          strictNullHandling: true,
          enableConditionalTypes: true,
          enableTupleTypes: true,
          enableEnhancedDiscriminator: true
        }
      });

      // Create TypeScript test for decoders
      const testFile = path.join(testOutputDir, "decoder-test.ts");
      const testContent = `
import * as decoders from './decoders';
import * as models from './models';

// Test User decoder with type arrays
const userDecoder = decoders.UserDecoder;

const validUserData = {
  id: "user123",
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  isActive: true,
  metadata: { lastLogin: "2024-01-15T10:30:00Z" },
  tags: ["premium"]
};

const validUserWithNulls = {
  id: "user456", 
  name: "Jane Smith",
  email: null,
  age: null,
  isActive: null,
  metadata: null,
  tags: null
};

console.log('Testing User decoder...');

try {
  const result1 = userDecoder.decode(validUserData);
  if (result1.success) {
    console.log('✓ User decoder with valid data: PASS');
    const user: models.User = result1.data;
    console.log('  Decoded user:', user.name);
  } else {
    console.log('✗ User decoder with valid data: FAIL');
    console.log('  Errors:', result1.errors);
  }

  const result2 = userDecoder.decode(validUserWithNulls);
  if (result2.success) {
    console.log('✓ User decoder with nulls: PASS');
    const user: models.User = result2.data;
    console.log('  Decoded user with nulls:', user.name);
  } else {
    console.log('✗ User decoder with nulls: FAIL');
    console.log('  Errors:', result2.errors);
  }
} catch (error) {
  console.log('✗ Exception in User decoder test:', error.message);
  process.exit(1);
}

// Test Coordinates decoder (tuple/prefixItems)
if (decoders.CoordinatesDecoder) {
  const coordsDecoder = decoders.CoordinatesDecoder;
  
  console.log('\\nTesting Coordinates decoder...');
  
  try {
    const validCoords = [40.7128, -74.0060];
    const result = coordsDecoder.decode(validCoords);
    
    if (result.success) {
      console.log('✓ Coordinates decoder: PASS');
      const coords: models.Coordinates = result.data;
      console.log('  Decoded coordinates:', coords);
    } else {
      console.log('✗ Coordinates decoder: FAIL');
      console.log('  Errors:', result.errors);
    }
  } catch (error) {
    console.log('✗ Exception in Coordinates decoder test:', error.message);
  }
}

// Test ApiResponse decoder (const keyword)
if (decoders.ApiResponseDecoder) {
  const responseDecoder = decoders.ApiResponseDecoder;
  
  console.log('\\nTesting ApiResponse decoder...');
  
  try {
    const validResponse = {
      version: "2.0",
      status: "success", 
      timestamp: "2024-01-15T10:30:00Z",
      data: { result: "ok" }
    };
    
    const result = responseDecoder.decode(validResponse);
    
    if (result.success) {
      console.log('✓ ApiResponse decoder: PASS');
      const response: models.ApiResponse = result.data;
      console.log('  Decoded response version:', response.version);
    } else {
      console.log('✗ ApiResponse decoder: FAIL');
      console.log('  Errors:', result.errors);
    }
  } catch (error) {
    console.log('✗ Exception in ApiResponse decoder test:', error.message);
  }
}

console.log('\\nDecoder integration tests completed!');
`;

      fs.writeFileSync(testFile, testContent);

      // Create tsconfig and package.json
      const tsConfigPath = path.join(testOutputDir, "tsconfig.json");
      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
          lib: ["ES2020"],
          outDir: "./dist",
          rootDir: "./",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: "node"
        },
        include: ["*.ts"],
        exclude: ["node_modules", "dist"]
      };

      fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

      const packageJsonPath = path.join(testOutputDir, "package.json");
      const packageJson = {
        name: "decoder-integration-test",
        version: "1.0.0",
        dependencies: {
          "ajv": "^8.0.0",
          "ajv-formats": "^2.0.0"
        },
        devDependencies: {
          "typescript": "^4.9.0",
          "@types/node": "^18.0.0"
        }
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      try {
        // Install dependencies
        execSync("npm install", { 
          cwd: testOutputDir, 
          stdio: "pipe",
          timeout: 30000 
        });

        // Compile TypeScript
        execSync("npx tsc", { 
          cwd: testOutputDir, 
          stdio: "pipe",
          timeout: 30000 
        });

        // Run the decoder test
        const output = execSync(`node dist/decoder-test.js`, { 
          cwd: testOutputDir,
          encoding: "utf8",
          timeout: 30000
        });

        console.log("Decoder integration test output:");
        console.log(output);

        expect(output).toContain("✓ User decoder with valid data: PASS");
        expect(output).toContain("✓ User decoder with nulls: PASS");
        expect(output).toContain("Decoder integration tests completed!");
      } catch (error) {
        console.error("Decoder integration test failed:", error);
        if (error.stdout) console.log("STDOUT:", error.stdout);
        if (error.stderr) console.log("STDERR:", error.stderr);
        throw error;
      }
    });
  });
});