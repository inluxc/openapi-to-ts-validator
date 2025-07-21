import { createFeatureChecker, getEnabledFeatures } from "../../src/options-validation";
import type { OpenAPI31ParseOptions } from "../../src/GenerateOptions";

describe("Feature Flags Integration", () => {
  describe("Feature Checker Creation", () => {
    it("should create feature checker with default settings", () => {
      const checker = createFeatureChecker();
      
      // Test default values match expected behavior
      expect(checker.isWebhooksEnabled()).toBe(false);
      expect(checker.isStrictNullHandlingEnabled()).toBe(true);
      expect(checker.isConditionalSchemasEnabled()).toBe(true);
      expect(checker.isPrefixItemsEnabled()).toBe(true);
      expect(checker.isUnevaluatedPropertiesEnabled()).toBe(true);
      expect(checker.isConstKeywordEnabled()).toBe(true);
      expect(checker.isContainsKeywordEnabled()).toBe(true);
      expect(checker.isEnhancedDiscriminatorEnabled()).toBe(true);
      expect(checker.isFallbackToOpenAPI30Enabled()).toBe(false);
    });

    it("should create feature checker with custom settings", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
        enablePrefixItems: true,
        enableUnevaluatedProperties: false,
        enableConstKeyword: true,
        enableContainsKeyword: false,
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true,
      };

      const checker = createFeatureChecker(options);
      
      expect(checker.isWebhooksEnabled()).toBe(true);
      expect(checker.isStrictNullHandlingEnabled()).toBe(false);
      expect(checker.isConditionalSchemasEnabled()).toBe(false);
      expect(checker.isPrefixItemsEnabled()).toBe(true);
      expect(checker.isUnevaluatedPropertiesEnabled()).toBe(false);
      expect(checker.isConstKeywordEnabled()).toBe(true);
      expect(checker.isContainsKeywordEnabled()).toBe(false);
      expect(checker.isEnhancedDiscriminatorEnabled()).toBe(false);
      expect(checker.isFallbackToOpenAPI30Enabled()).toBe(true);
    });
  });

  describe("Feature Combinations", () => {
    it("should check multiple features correctly", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: true,
        enableConditionalSchemas: false,
        enablePrefixItems: false,
      };

      const checker = createFeatureChecker(options);
      
      // Test combinations
      expect(checker.areAllEnabled("webhooks", "strictNullHandling")).toBe(true);
      expect(checker.areAllEnabled("webhooks", "conditionalSchemas")).toBe(false);
      expect(checker.areAllEnabled("conditionalSchemas", "prefixItems")).toBe(false);
      expect(checker.areAllEnabled("constKeyword", "containsKeyword")).toBe(true); // Both default to true
    });

    it("should get enabled feature names correctly", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
        enablePrefixItems: false,
        enableUnevaluatedProperties: false,
        enableConstKeyword: false,
        enableContainsKeyword: false,
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true,
      };

      const checker = createFeatureChecker(options);
      const enabledFeatures = checker.getEnabledFeatureNames();
      
      expect(enabledFeatures).toContain("webhooks");
      expect(enabledFeatures).toContain("fallbackToOpenAPI30");
      expect(enabledFeatures).not.toContain("strictNullHandling");
      expect(enabledFeatures).not.toContain("conditionalSchemas");
      expect(enabledFeatures).not.toContain("prefixItems");
      expect(enabledFeatures).not.toContain("unevaluatedProperties");
      expect(enabledFeatures).not.toContain("constKeyword");
      expect(enabledFeatures).not.toContain("containsKeyword");
      expect(enabledFeatures).not.toContain("enhancedDiscriminator");
      
      // Should only have 2 enabled features
      expect(enabledFeatures).toHaveLength(2);
    });
  });

  describe("Feature Flags for Gradual Rollout", () => {
    it("should support gradual feature enablement", () => {
      // Scenario: Start with minimal features enabled
      const phase1Options: OpenAPI31ParseOptions = {
        enableWebhooks: false,
        strictNullHandling: true, // Safe to enable first
        enableConditionalSchemas: false,
        enablePrefixItems: false,
        enableUnevaluatedProperties: false,
        enableConstKeyword: true, // Safe to enable first
        enableContainsKeyword: false,
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true, // Safety net
      };

      const phase1Checker = createFeatureChecker(phase1Options);
      const phase1Features = getEnabledFeatures(phase1Options);
      
      expect(phase1Features.strictNullHandling).toBe(true);
      expect(phase1Features.constKeyword).toBe(true);
      expect(phase1Features.fallbackToOpenAPI30).toBe(true);
      expect(phase1Features.webhooks).toBe(false);
      expect(phase1Features.conditionalSchemas).toBe(false);

      // Scenario: Gradually enable more features
      const phase2Options: OpenAPI31ParseOptions = {
        ...phase1Options,
        enablePrefixItems: true, // Add tuple support
        enableConditionalSchemas: true, // Add conditional schemas
      };

      const phase2Features = getEnabledFeatures(phase2Options);
      
      expect(phase2Features.prefixItems).toBe(true);
      expect(phase2Features.conditionalSchemas).toBe(true);
      expect(phase2Features.strictNullHandling).toBe(true); // Still enabled
      expect(phase2Features.constKeyword).toBe(true); // Still enabled

      // Scenario: Full feature enablement
      const phase3Options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: true,
        enableConditionalSchemas: true,
        enablePrefixItems: true,
        enableUnevaluatedProperties: true,
        enableConstKeyword: true,
        enableContainsKeyword: true,
        enableEnhancedDiscriminator: true,
        fallbackToOpenAPI30: false, // Remove safety net
      };

      const phase3Features = getEnabledFeatures(phase3Options);
      const phase3Checker = createFeatureChecker(phase3Options);
      
      // All features should be enabled
      expect(phase3Checker.areAllEnabled(
        "webhooks",
        "strictNullHandling",
        "conditionalSchemas",
        "prefixItems",
        "unevaluatedProperties",
        "constKeyword",
        "containsKeyword",
        "enhancedDiscriminator"
      )).toBe(true);
      
      expect(phase3Features.fallbackToOpenAPI30).toBe(false);
      expect(phase3Checker.getEnabledFeatureNames()).toHaveLength(8); // All except fallback
    });

    it("should support conservative rollout with fallback", () => {
      const conservativeOptions: OpenAPI31ParseOptions = {
        enableWebhooks: false, // Not ready for webhooks yet
        strictNullHandling: true,
        enableConditionalSchemas: true,
        enablePrefixItems: true,
        enableUnevaluatedProperties: false, // Complex feature, disable for now
        enableConstKeyword: true,
        enableContainsKeyword: true,
        enableEnhancedDiscriminator: false, // Complex feature, disable for now
        fallbackToOpenAPI30: true, // Keep safety net
      };

      const checker = createFeatureChecker(conservativeOptions);
      
      // Core features enabled
      expect(checker.areAllEnabled("strictNullHandling", "conditionalSchemas", "prefixItems", "constKeyword", "containsKeyword")).toBe(true);
      
      // Complex features disabled
      expect(checker.areAllEnabled("webhooks", "unevaluatedProperties", "enhancedDiscriminator")).toBe(false);
      
      // Safety net enabled
      expect(checker.isFallbackToOpenAPI30Enabled()).toBe(true);
    });
  });

  describe("Default Behavior Validation", () => {
    it("should have sensible defaults for production use", () => {
      const defaultFeatures = getEnabledFeatures();
      
      // Webhooks should be disabled by default (opt-in feature)
      expect(defaultFeatures.webhooks).toBe(false);
      
      // Core JSON Schema features should be enabled by default
      expect(defaultFeatures.strictNullHandling).toBe(true);
      expect(defaultFeatures.conditionalSchemas).toBe(true);
      expect(defaultFeatures.prefixItems).toBe(true);
      expect(defaultFeatures.unevaluatedProperties).toBe(true);
      expect(defaultFeatures.constKeyword).toBe(true);
      expect(defaultFeatures.containsKeyword).toBe(true);
      expect(defaultFeatures.enhancedDiscriminator).toBe(true);
      
      // Fallback should be disabled by default (fail fast)
      expect(defaultFeatures.fallbackToOpenAPI30).toBe(false);
    });
  });
});