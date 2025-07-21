import path from "node:path";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { generate } from "openapi-to-ts-validator";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";

describe("OpenAPI 3.1 Performance Benchmarks", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const outputDir = path.join(__dirname, "../output/benchmarks");

  interface BenchmarkResult {
    schema: string;
    version: string;
    parseTime: number;
    generateTime: number;
    totalTime: number;
    memoryUsage: number;
    definitionCount: number;
    schemaSize: number;
  }

  const benchmarkResults: BenchmarkResult[] = [];

  beforeAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    // Output benchmark results
    console.log("\n=== OpenAPI Performance Benchmark Results ===");
    console.table(benchmarkResults.map(result => ({
      Schema: result.schema,
      Version: result.version,
      "Parse (ms)": result.parseTime.toFixed(2),
      "Generate (ms)": result.generateTime.toFixed(2),
      "Total (ms)": result.totalTime.toFixed(2),
      "Memory (MB)": (result.memoryUsage / 1024 / 1024).toFixed(2),
      "Definitions": result.definitionCount,
      "Size (KB)": (result.schemaSize / 1024).toFixed(2)
    })));

    // Calculate performance ratios
    const v30Results = benchmarkResults.filter(r => r.version === "3.0");
    const v31Results = benchmarkResults.filter(r => r.version === "3.1");

    if (v30Results.length > 0 && v31Results.length > 0) {
      const avgParseTime30 = v30Results.reduce((sum, r) => sum + r.parseTime, 0) / v30Results.length;
      const avgParseTime31 = v31Results.reduce((sum, r) => sum + r.parseTime, 0) / v31Results.length;
      const avgGenerateTime30 = v30Results.reduce((sum, r) => sum + r.generateTime, 0) / v30Results.length;
      const avgGenerateTime31 = v31Results.reduce((sum, r) => sum + r.generateTime, 0) / v31Results.length;

      console.log("\n=== Performance Comparison ===");
      console.log(`Average Parse Time - 3.0: ${avgParseTime30.toFixed(2)}ms, 3.1: ${avgParseTime31.toFixed(2)}ms`);
      console.log(`Parse Time Ratio (3.1/3.0): ${(avgParseTime31 / avgParseTime30).toFixed(2)}x`);
      console.log(`Average Generate Time - 3.0: ${avgGenerateTime30.toFixed(2)}ms, 3.1: ${avgGenerateTime31.toFixed(2)}ms`);
      console.log(`Generate Time Ratio (3.1/3.0): ${(avgGenerateTime31 / avgGenerateTime30).toFixed(2)}x`);
    }

    // Clean up
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  async function benchmarkSchema(
    schemaName: string,
    schemaFile: string,
    version: string,
    options: any = {}
  ): Promise<BenchmarkResult> {
    const schemaPath = path.join(schemaDir, schemaFile);
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const schemaSize = Buffer.byteLength(schemaContent, "utf8");

    // Measure parsing
    const initialMemory = process.memoryUsage().heapUsed;
    const parseStart = performance.now();
    
    const parseResult = await parseSchema(schemaPath, "yaml", options);
    
    const parseEnd = performance.now();
    const parseTime = parseEnd - parseStart;
    const definitionCount = Object.keys(parseResult.definitions).length;

    // Measure generation
    const generateStart = performance.now();
    const testOutputDir = path.join(outputDir, `${schemaName}-${version}`);
    
    await generate({
      schemaFile: schemaPath,
      schemaType: "yaml",
      directory: testOutputDir,
      ...options
    });

    const generateEnd = performance.now();
    const generateTime = generateEnd - generateStart;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsage = finalMemory - initialMemory;

    return {
      schema: schemaName,
      version,
      parseTime,
      generateTime,
      totalTime: parseTime + generateTime,
      memoryUsage,
      definitionCount,
      schemaSize
    };
  }

  describe("Schema Parsing Performance", () => {
    test("should benchmark OpenAPI 3.0 vs 3.1 parsing", async () => {
      // Benchmark OpenAPI 3.0
      const result30 = await benchmarkSchema(
        "basic-test",
        "openapi-3.0-test.yaml",
        "3.0"
      );
      benchmarkResults.push(result30);

      // Benchmark OpenAPI 3.1 with minimal features
      const result31Minimal = await benchmarkSchema(
        "basic-test",
        "openapi-3.1-test.yaml",
        "3.1-minimal",
        {
          openapi31: {
            strictNullHandling: false,
            enableConditionalTypes: false,
            enableTupleTypes: false
          }
        }
      );
      benchmarkResults.push(result31Minimal);

      // Benchmark OpenAPI 3.1 with all features
      const result31Full = await benchmarkSchema(
        "basic-test",
        "openapi-3.1-test.yaml",
        "3.1-full",
        {
          openapi31: {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalTypes: true,
            enableTupleTypes: true,
            enableEnhancedDiscriminator: true,
            enableUnevaluatedProperties: true,
            enableContains: true
          }
        }
      );
      benchmarkResults.push(result31Full);

      // Verify all completed successfully
      expect(result30.parseTime).toBeGreaterThan(0);
      expect(result31Minimal.parseTime).toBeGreaterThan(0);
      expect(result31Full.parseTime).toBeGreaterThan(0);

      // 3.1 with features should take longer than minimal
      expect(result31Full.parseTime).toBeGreaterThanOrEqual(result31Minimal.parseTime);
    });

    test("should benchmark complex schema processing", async () => {
      // Benchmark comprehensive OpenAPI 3.1 schema
      const resultComprehensive = await benchmarkSchema(
        "comprehensive",
        "openapi-3.1-comprehensive.yaml",
        "3.1-comprehensive",
        {
          openapi31: {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalTypes: true,
            enableTupleTypes: true,
            enableEnhancedDiscriminator: true,
            enableUnevaluatedProperties: true,
            enableContains: true
          }
        }
      );
      benchmarkResults.push(resultComprehensive);

      // Benchmark e-commerce schema
      const resultEcommerce = await benchmarkSchema(
        "ecommerce",
        "openapi-3.1-ecommerce.yaml",
        "3.1-ecommerce",
        {
          openapi31: {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalTypes: true,
            enableTupleTypes: true,
            enableEnhancedDiscriminator: true,
            enableUnevaluatedProperties: true,
            enableContains: true
          }
        }
      );
      benchmarkResults.push(resultEcommerce);

      expect(resultComprehensive.parseTime).toBeGreaterThan(0);
      expect(resultEcommerce.parseTime).toBeGreaterThan(0);

      // Complex schemas should take more time
      expect(resultComprehensive.parseTime).toBeGreaterThan(100); // At least 100ms
      expect(resultEcommerce.parseTime).toBeGreaterThan(100);
    });
  });

  describe("Memory Usage Analysis", () => {
    test("should measure memory usage for different schema sizes", async () => {
      const testCases = [
        { name: "small", file: "openapi-3.1-test.yaml" },
        { name: "medium", file: "openapi-3.1-comprehensive.yaml" },
        { name: "large", file: "openapi-3.1-ecommerce.yaml" }
      ];

      for (const testCase of testCases) {
        const result = await benchmarkSchema(
          `memory-${testCase.name}`,
          testCase.file,
          "3.1-memory",
          {
            openapi31: {
              enableWebhooks: true,
              strictNullHandling: true,
              enableConditionalTypes: true,
              enableTupleTypes: true,
              enableEnhancedDiscriminator: true
            }
          }
        );

        benchmarkResults.push(result);

        // Memory usage should be reasonable
        expect(result.memoryUsage).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
        expect(result.memoryUsage).toBeGreaterThan(0);

        console.log(`Memory usage for ${testCase.name}: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    test("should test memory usage with repeated processing", async () => {
      const schemaPath = path.join(schemaDir, "openapi-3.1-test.yaml");
      const iterations = 5;
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const initialMemory = process.memoryUsage().heapUsed;
        
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: path.join(outputDir, `memory-test-${i}`),
          openapi31: {
            strictNullHandling: true,
            enableConditionalTypes: true
          }
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        memoryUsages.push(finalMemory - initialMemory);
      }

      const avgMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
      const maxMemoryUsage = Math.max(...memoryUsages);
      const minMemoryUsage = Math.min(...memoryUsages);

      console.log(`Repeated processing memory usage:`);
      console.log(`  Average: ${(avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Min: ${(minMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Max: ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be consistent
      const memoryVariance = maxMemoryUsage - minMemoryUsage;
      expect(memoryVariance).toBeLessThan(50 * 1024 * 1024); // Less than 50MB variance
    });
  });

  describe("Feature-Specific Performance Impact", () => {
    test("should measure impact of individual OpenAPI 3.1 features", async () => {
      const schemaPath = path.join(schemaDir, "openapi-3.1-comprehensive.yaml");
      const baselineOptions = {
        openapi31: {
          enableWebhooks: false,
          strictNullHandling: false,
          enableConditionalTypes: false,
          enableTupleTypes: false,
          enableEnhancedDiscriminator: false,
          enableUnevaluatedProperties: false,
          enableContains: false
        }
      };

      // Baseline measurement
      const baseline = await benchmarkSchema(
        "feature-baseline",
        "openapi-3.1-comprehensive.yaml",
        "3.1-baseline",
        baselineOptions
      );
      benchmarkResults.push(baseline);

      // Test individual features
      const features = [
        { name: "webhooks", option: "enableWebhooks" },
        { name: "null-handling", option: "strictNullHandling" },
        { name: "conditional", option: "enableConditionalTypes" },
        { name: "tuples", option: "enableTupleTypes" },
        { name: "discriminator", option: "enableEnhancedDiscriminator" },
        { name: "unevaluated", option: "enableUnevaluatedProperties" },
        { name: "contains", option: "enableContains" }
      ];

      for (const feature of features) {
        const featureOptions = {
          openapi31: {
            ...baselineOptions.openapi31,
            [feature.option]: true
          }
        };

        const result = await benchmarkSchema(
          `feature-${feature.name}`,
          "openapi-3.1-comprehensive.yaml",
          `3.1-${feature.name}`,
          featureOptions
        );

        benchmarkResults.push(result);

        const overhead = result.parseTime - baseline.parseTime;
        console.log(`${feature.name} overhead: ${overhead.toFixed(2)}ms (${((overhead / baseline.parseTime) * 100).toFixed(1)}%)`);

        // Feature overhead should be reasonable
        expect(overhead).toBeLessThan(baseline.parseTime); // Less than 100% overhead
      }
    });

    test("should measure cumulative feature impact", async () => {
      const schemaPath = path.join(schemaDir, "openapi-3.1-comprehensive.yaml");
      const features = [
        "enableWebhooks",
        "strictNullHandling",
        "enableConditionalTypes",
        "enableTupleTypes",
        "enableEnhancedDiscriminator",
        "enableUnevaluatedProperties",
        "enableContains"
      ];

      let cumulativeOptions = { openapi31: {} };
      let previousTime = 0;

      for (let i = 0; i < features.length; i++) {
        // Add one more feature
        cumulativeOptions.openapi31[features[i]] = true;

        const result = await benchmarkSchema(
          `cumulative-${i + 1}`,
          "openapi-3.1-comprehensive.yaml",
          `3.1-cumulative-${i + 1}`,
          cumulativeOptions
        );

        benchmarkResults.push(result);

        if (i > 0) {
          const incrementalOverhead = result.parseTime - previousTime;
          console.log(`Adding ${features[i]}: +${incrementalOverhead.toFixed(2)}ms`);
        }

        previousTime = result.parseTime;
      }

      // Final result should still be reasonable
      const finalResult = benchmarkResults[benchmarkResults.length - 1];
      expect(finalResult.parseTime).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  describe("Scalability Testing", () => {
    test("should test performance with varying schema sizes", async () => {
      // Create schemas of different sizes
      const schemaSizes = [10, 25, 50, 100];

      for (const size of schemaSizes) {
        const definitions = Array.from({ length: size }, (_, i) => `
    Model${i}:
      type: object
      properties:
        id:
          type: string
        name:
          type: ["string", "null"]
        value:
          type: number
        tags:
          type: ["array", "null"]
          items:
            type: string
          contains:
            pattern: "^tag-"
        metadata:
          type: ["object", "null"]
          unevaluatedProperties:
            type: string
      if:
        properties:
          value:
            minimum: 100
      then:
        properties:
          name:
            type: string
        required: ['name']
      required: ['id', 'value']`).join('\n');

        const schema = `
openapi: 3.1.0
info:
  title: Scalability Test Schema
  version: 1.0.0
paths: {}
components:
  schemas:${definitions}`;

        const tempPath = path.join(schemaDir, `temp-scalability-${size}.yaml`);
        fs.writeFileSync(tempPath, schema);

        try {
          const result = await benchmarkSchema(
            `scalability-${size}`,
            `temp-scalability-${size}.yaml`,
            `3.1-scale-${size}`,
            {
              openapi31: {
                strictNullHandling: true,
                enableConditionalTypes: true,
                enableUnevaluatedProperties: true,
                enableContains: true
              }
            }
          );

          benchmarkResults.push(result);

          console.log(`Schema with ${size} definitions: ${result.parseTime.toFixed(2)}ms`);

          // Performance should scale reasonably
          expect(result.parseTime).toBeLessThan(size * 100); // Less than 100ms per definition
        } finally {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }

      // Verify performance scales reasonably
      const scalabilityResults = benchmarkResults.filter(r => r.schema.startsWith("scalability-"));
      scalabilityResults.sort((a, b) => a.definitionCount - b.definitionCount);

      for (let i = 1; i < scalabilityResults.length; i++) {
        const current = scalabilityResults[i];
        const previous = scalabilityResults[i - 1];
        
        const sizeRatio = current.definitionCount / previous.definitionCount;
        const timeRatio = current.parseTime / previous.parseTime;

        // Time should not grow exponentially with size
        expect(timeRatio).toBeLessThan(sizeRatio * 2); // At most 2x the size ratio
      }
    });

    test("should test performance with deep nesting", async () => {
      // Create deeply nested schema
      const createNestedSchema = (depth: number): string => {
        if (depth === 0) {
          return `
          type: object
          properties:
            value:
              type: ["string", "null"]`;
        }

        return `
          type: object
          properties:
            nested:
              ${createNestedSchema(depth - 1).split('\n').map(line => '  ' + line).join('\n')}`;
      };

      const depths = [5, 10, 15, 20];

      for (const depth of depths) {
        const schema = `
openapi: 3.1.0
info:
  title: Deep Nesting Test
  version: 1.0.0
paths: {}
components:
  schemas:
    DeepNested:${createNestedSchema(depth)}`;

        const tempPath = path.join(schemaDir, `temp-deep-${depth}.yaml`);
        fs.writeFileSync(tempPath, schema);

        try {
          const result = await benchmarkSchema(
            `deep-${depth}`,
            `temp-deep-${depth}.yaml`,
            `3.1-deep-${depth}`,
            {
              openapi31: {
                strictNullHandling: true
              }
            }
          );

          benchmarkResults.push(result);

          console.log(`Deep nesting (${depth} levels): ${result.parseTime.toFixed(2)}ms`);

          // Should handle reasonable nesting depths
          expect(result.parseTime).toBeLessThan(5000); // Less than 5 seconds
        } finally {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }
    });
  });

  describe("Regression Testing", () => {
    test("should ensure OpenAPI 3.1 performance doesn't regress", async () => {
      const testSchema = path.join(schemaDir, "openapi-3.1-comprehensive.yaml");
      const iterations = 3;
      const times: number[] = [];

      // Run multiple iterations to get stable measurements
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await generate({
          schemaFile: testSchema,
          schemaType: "yaml",
          directory: path.join(outputDir, `regression-${i}`),
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

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const stdDev = Math.sqrt(times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length);

      console.log(`Regression test results:`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Standard deviation: ${stdDev.toFixed(2)}ms`);
      console.log(`  Coefficient of variation: ${((stdDev / avgTime) * 100).toFixed(1)}%`);

      // Performance should be consistent
      expect(stdDev / avgTime).toBeLessThan(0.2); // Less than 20% coefficient of variation
      
      // Performance should meet expectations
      expect(avgTime).toBeLessThan(15000); // Less than 15 seconds average
    });
  });
});