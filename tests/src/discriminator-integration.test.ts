/**
 * Integration tests for OpenAPI 3.1 discriminator functionality
 */

import { parseSchema } from '../../src/parse-schema';
import { generate } from '../../src/generate';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';

describe('OpenAPI 3.1 Discriminator Integration', () => {
  const testSchemaPath = join(__dirname, '../schemas/openapi-3.1-discriminator-test.yaml');
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `discriminator-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Schema Parsing', () => {
    it('should parse OpenAPI 3.1 schema with discriminators', async () => {
      const parsedSchema = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: true
      });

      expect(parsedSchema.version.isVersion31).toBe(true);
      expect(parsedSchema.definitions).toBeDefined();
      
      // Check that discriminator schemas are present
      expect(parsedSchema.definitions.Pet).toBeDefined();
      expect(parsedSchema.definitions.Cat).toBeDefined();
      expect(parsedSchema.definitions.Dog).toBeDefined();
      expect(parsedSchema.definitions.Vehicle).toBeDefined();
      expect(parsedSchema.definitions.Shape).toBeDefined();
    });

    it('should handle discriminator with explicit mapping', async () => {
      const parsedSchema = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: true
      });

      const petSchema = parsedSchema.definitions.Pet;
      expect(petSchema).toBeDefined();
      expect((petSchema as any)['x-discriminator-enhanced']).toBeDefined();
      
      const discriminatorInfo = (petSchema as any)['x-discriminator-enhanced'];
      expect(discriminatorInfo.propertyName).toBe('petType');
      expect(discriminatorInfo.mapping).toEqual({
        cat: '#/components/schemas/Cat',
        dog: '#/components/schemas/Dog',
        bird: '#/components/schemas/Bird'
      });
    });

    it('should handle discriminator without explicit mapping', async () => {
      const parsedSchema = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: true
      });

      const vehicleSchema = parsedSchema.definitions.Vehicle;
      expect(vehicleSchema).toBeDefined();
      expect((vehicleSchema as any)['x-discriminator-enhanced']).toBeDefined();
      
      const discriminatorInfo = (vehicleSchema as any)['x-discriminator-enhanced'];
      expect(discriminatorInfo.propertyName).toBe('vehicleType');
      expect(discriminatorInfo.mapping).toEqual({
        Car: '#/components/schemas/Car',
        Motorcycle: '#/components/schemas/Motorcycle',
        Bicycle: '#/components/schemas/Bicycle'
      });
    });

    it('should handle inheritance-style discriminator', async () => {
      const parsedSchema = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: true
      });

      const shapeSchema = parsedSchema.definitions.Shape;
      expect(shapeSchema).toBeDefined();
      expect((shapeSchema as any)['x-discriminator-enhanced']).toBeDefined();
      
      const discriminatorInfo = (shapeSchema as any)['x-discriminator-enhanced'];
      expect(discriminatorInfo.propertyName).toBe('shapeType');
      expect(discriminatorInfo.isInheritance).toBe(true);
    });
  });

  describe('Code Generation', () => {
    it('should generate TypeScript types for discriminated unions', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipDecoders: true,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const modelsPath = join(tempDir, 'models.ts');
      expect(existsSync(modelsPath)).toBe(true);

      const modelsContent = readFileSync(modelsPath, 'utf8');
      
      // Check that discriminated union types are generated
      expect(modelsContent).toContain('export interface Pet');
      expect(modelsContent).toContain('export interface Cat');
      expect(modelsContent).toContain('export interface Dog');
      expect(modelsContent).toContain('export interface Bird');
      
      // Check that discriminator properties are properly typed
      expect(modelsContent).toContain('petType');
      expect(modelsContent).toContain('vehicleType');
      expect(modelsContent).toContain('shapeType');
    });

    it('should generate validators with discriminator support', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const decodersPath = join(tempDir, 'decoders.ts');
      expect(existsSync(decodersPath)).toBe(true);

      const decodersContent = readFileSync(decodersPath, 'utf8');
      
      // Check that decoders are generated for discriminated types
      expect(decodersContent).toContain('export const decodePet');
      expect(decodersContent).toContain('export const decodeCat');
      expect(decodersContent).toContain('export const decodeDog');
      expect(decodersContent).toContain('export const decodeVehicle');
    });

    it('should generate standalone validators with discriminator support', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        standalone: {
          validatorOutput: 'module'
        },
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const standalonePath = join(tempDir, 'standalone.mjs');
      expect(existsSync(standalonePath)).toBe(true);

      const standaloneContent = readFileSync(standalonePath, 'utf8');
      
      // Check that standalone validators include discriminator support
      expect(standaloneContent).toContain('discriminator: true');
      expect(standaloneContent).toContain('export const validatePet');
      expect(standaloneContent).toContain('export const validateCat');
    });
  });

  describe('Validator Functionality', () => {
    it('should validate discriminated union data correctly', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      // Import the generated decoders
      const decodersPath = join(tempDir, 'decoders.js');
      const { decodePet, decodeCat, decodeDog } = require(decodersPath);

      // Test valid cat data
      const validCat = {
        petType: 'cat',
        name: 'Whiskers',
        meowVolume: 5,
        indoor: true
      };

      const catResult = decodeCat(validCat);
      expect(catResult.success).toBe(true);
      if (catResult.success) {
        expect(catResult.data).toEqual(validCat);
      }

      // Test valid dog data
      const validDog = {
        petType: 'dog',
        name: 'Buddy',
        barkVolume: 8,
        breed: 'Golden Retriever'
      };

      const dogResult = decodeDog(validDog);
      expect(dogResult.success).toBe(true);
      if (dogResult.success) {
        expect(dogResult.data).toEqual(validDog);
      }

      // Test Pet discriminated union
      const petCatResult = decodePet(validCat);
      expect(petCatResult.success).toBe(true);

      const petDogResult = decodePet(validDog);
      expect(petDogResult.success).toBe(true);

      // Test invalid discriminator value
      const invalidPet = {
        petType: 'fish', // Not in the discriminator mapping
        name: 'Nemo'
      };

      const invalidResult = decodePet(invalidPet);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate inferred discriminator mapping', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const decodersPath = join(tempDir, 'decoders.js');
      const { decodeVehicle, decodeCar } = require(decodersPath);

      // Test valid car data (inferred discriminator)
      const validCar = {
        vehicleType: 'Car',
        make: 'Toyota',
        model: 'Camry',
        doors: 4
      };

      const carResult = decodeCar(validCar);
      expect(carResult.success).toBe(true);

      const vehicleResult = decodeVehicle(validCar);
      expect(vehicleResult.success).toBe(true);
    });

    it('should handle nested discriminators', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const decodersPath = join(tempDir, 'decoders.js');
      const { decodeContainer } = require(decodersPath);

      // Test container with nested discriminated pets
      const validContainer = {
        id: 'container-1',
        contents: [
          {
            petType: 'cat',
            name: 'Whiskers',
            meowVolume: 5,
            indoor: true
          },
          {
            petType: 'dog',
            name: 'Buddy',
            barkVolume: 8,
            breed: 'Golden Retriever'
          }
        ],
        primaryItem: {
          vehicleType: 'Car',
          make: 'Honda',
          model: 'Civic',
          doors: 4
        }
      };

      const containerResult = decodeContainer(validContainer);
      expect(containerResult.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle discriminator validation errors gracefully', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const decodersPath = join(tempDir, 'decoders.js');
      const { decodePet } = require(decodersPath);

      // Test missing discriminator property
      const missingDiscriminator = {
        name: 'Unknown Pet'
        // Missing petType
      };

      const result = decodePet(missingDiscriminator);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('petType');
      }
    });

    it('should provide meaningful error messages for discriminator mismatches', async () => {
      await generate({
        schemaFile: testSchemaPath,
        schemaType: 'yaml',
        directory: tempDir,
        skipMetaFile: true,
        skipSchemaFile: true,
        openapi31: {
          enableEnhancedDiscriminator: true
        }
      });

      const decodersPath = join(tempDir, 'decoders.js');
      const { decodePet } = require(decodersPath);

      // Test wrong discriminator value
      const wrongDiscriminator = {
        petType: 'elephant', // Not a valid pet type
        name: 'Dumbo'
      };

      const result = decodePet(wrongDiscriminator);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Configuration Options', () => {
    it('should respect enableEnhancedDiscriminator option', async () => {
      // Test with enhanced discriminator disabled
      const parsedSchemaDisabled = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: false
      });

      const petSchemaDisabled = parsedSchemaDisabled.definitions.Pet;
      expect((petSchemaDisabled as any)['x-discriminator-enhanced']).toBeUndefined();

      // Test with enhanced discriminator enabled (default)
      const parsedSchemaEnabled = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: true
      });

      const petSchemaEnabled = parsedSchemaEnabled.definitions.Pet;
      expect((petSchemaEnabled as any)['x-discriminator-enhanced']).toBeDefined();
    });

    it('should work with fallback to OpenAPI 3.0 behavior', async () => {
      const parsedSchema = await parseSchema(testSchemaPath, 'yaml', {
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true
      });

      expect(parsedSchema.version.isVersion31).toBe(true);
      expect(parsedSchema.definitions.Pet).toBeDefined();
      
      // Should not have enhanced discriminator metadata
      const petSchema = parsedSchema.definitions.Pet;
      expect((petSchema as any)['x-discriminator-enhanced']).toBeUndefined();
    });
  });
});