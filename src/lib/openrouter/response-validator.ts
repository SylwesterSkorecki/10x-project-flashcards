/**
 * Response Validator for OpenRouter API responses
 * 
 * Provides JSON Schema validation using ajv library with support for:
 * - Strict mode validation
 * - Custom error formatting
 * - Format validation (e.g., email, uri, date-time)
 * - Response repair heuristics
 */

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { ResponseFormat, ValidationResult } from "../services/openrouter.service";

/**
 * Response Validator class
 * Manages JSON Schema validation with caching and error handling
 */
export class ResponseValidator {
  private readonly ajv: Ajv;
  private readonly validatorCache: Map<string, ValidateFunction>;

  constructor() {
    // Initialize Ajv with recommended options
    this.ajv = new Ajv({
      allErrors: true, // Collect all errors, not just the first one
      verbose: true, // Include schema and data in errors
      strict: true, // Strict mode for schema validation
      removeAdditional: false, // Don't remove additional properties (let schema control this)
      useDefaults: true, // Apply default values from schema
      coerceTypes: false, // Don't coerce types automatically (strict validation)
    });

    // Add format validation (email, uri, date-time, etc.)
    addFormats(this.ajv);

    // Cache for compiled validators
    this.validatorCache = new Map();
  }

  /**
   * Validates a response against a JSON Schema
   * 
   * @param content - Response content (string or parsed object)
   * @param responseFormat - Response format configuration with schema
   * @returns Validation result with parsed data or errors
   */
  validate(content: string | unknown, responseFormat: ResponseFormat): ValidationResult {
    // Guard: Check if response format is valid
    if (
      !responseFormat ||
      responseFormat.type !== "json_schema" ||
      !responseFormat.json_schema
    ) {
      return {
        valid: false,
        errors: [
          {
            path: "responseFormat",
            message: "Invalid response format configuration",
          },
        ],
      };
    }

    const { name, schema, strict } = responseFormat.json_schema;

    // Parse content if it's a string
    let parsedContent: unknown;
    try {
      parsedContent = typeof content === "string" ? JSON.parse(content) : content;
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: "content",
            message: `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }

    // Get or compile validator
    const validator = this._getValidator(name, schema);

    // Validate
    const isValid = validator(parsedContent);

    if (isValid) {
      return {
        valid: true,
        data: parsedContent,
      };
    }

    // Handle validation errors
    const errors = this._formatErrors(validator.errors || []);

    // If not strict mode, attempt repair
    if (!strict) {
      const repaired = this._attemptRepair(parsedContent, schema, errors);
      if (repaired.success) {
        return {
          valid: true,
          data: repaired.data,
        };
      }
    }

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Validates a response and throws on failure (strict mode)
   * 
   * @param content - Response content to validate
   * @param responseFormat - Response format configuration
   * @returns Parsed and validated data
   * @throws Error if validation fails
   */
  validateStrict(content: string | unknown, responseFormat: ResponseFormat): unknown {
    const result = this.validate(content, responseFormat);

    if (!result.valid) {
      const errorMessages = result.errors?.map((e) => `${e.path}: ${e.message}`).join("; ");
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    return result.data;
  }

  /**
   * Checks if content is valid JSON without full schema validation
   * 
   * @param content - Content to check
   * @returns True if valid JSON, false otherwise
   */
  isValidJson(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears the validator cache
   * Useful for memory management with many different schemas
   */
  clearCache(): void {
    this.validatorCache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Gets or compiles a validator for a schema
   * 
   * @param name - Schema name (for caching)
   * @param schema - JSON Schema object
   * @returns Compiled validator function
   */
  private _getValidator(name: string, schema: Record<string, unknown>): ValidateFunction {
    // Check cache
    if (this.validatorCache.has(name)) {
      return this.validatorCache.get(name)!;
    }

    // Compile new validator
    const validator = this.ajv.compile(schema);

    // Cache it
    this.validatorCache.set(name, validator);

    return validator;
  }

  /**
   * Formats ajv errors into a more user-friendly format
   * 
   * @param errors - Array of ajv error objects
   * @returns Formatted error array
   */
  private _formatErrors(
    errors: ErrorObject[]
  ): Array<{ path: string; message: string }> {
    return errors.map((error) => {
      const path = error.instancePath || error.schemaPath || "root";
      let message = error.message || "Validation error";

      // Enhance error messages based on keyword
      switch (error.keyword) {
        case "required":
          message = `Missing required property: ${error.params.missingProperty}`;
          break;
        case "type":
          message = `Expected type ${error.params.type}, got ${typeof error.data}`;
          break;
        case "enum":
          message = `Value must be one of: ${error.params.allowedValues.join(", ")}`;
          break;
        case "additionalProperties":
          message = `Additional property not allowed: ${error.params.additionalProperty}`;
          break;
        case "minLength":
          message = `String is too short (minimum: ${error.params.limit})`;
          break;
        case "maxLength":
          message = `String is too long (maximum: ${error.params.limit})`;
          break;
        case "minimum":
          message = `Number is too small (minimum: ${error.params.limit})`;
          break;
        case "maximum":
          message = `Number is too large (maximum: ${error.params.limit})`;
          break;
        case "format":
          message = `Invalid format: ${error.params.format}`;
          break;
        default:
          message = error.message || "Validation error";
      }

      return {
        path: path.replace(/^\//, ""), // Remove leading slash
        message,
      };
    });
  }

  /**
   * Attempts to repair common issues in responses (non-strict mode only)
   * 
   * @param data - Data to repair
   * @param schema - Expected schema
   * @param errors - Validation errors
   * @returns Repair result
   */
  private _attemptRepair(
    data: unknown,
    schema: Record<string, unknown>,
    errors: Array<{ path: string; message: string }>
  ): { success: boolean; data?: unknown } {
    // Guard: Only repair objects
    if (typeof data !== "object" || data === null) {
      return { success: false };
    }

    const repairedData = { ...data } as Record<string, unknown>;
    let madeChanges = false;

    // Attempt to fix missing required properties with defaults
    const requiredProps = (schema.required as string[]) || [];
    const properties = (schema.properties as Record<string, any>) || {};

    for (const prop of requiredProps) {
      if (!(prop in repairedData)) {
        const propSchema = properties[prop];

        // Try to add default value based on type
        if (propSchema) {
          const defaultValue = this._getDefaultValueForType(propSchema.type);
          if (defaultValue !== undefined) {
            repairedData[prop] = defaultValue;
            madeChanges = true;
          }
        }
      }
    }

    // Attempt to remove additional properties if not allowed
    if (schema.additionalProperties === false) {
      const allowedProps = new Set(Object.keys(properties));
      for (const key of Object.keys(repairedData)) {
        if (!allowedProps.has(key)) {
          delete repairedData[key];
          madeChanges = true;
        }
      }
    }

    // If we made changes, validate again
    if (madeChanges) {
      const validator = this._getValidator("repair_check", schema);
      if (validator(repairedData)) {
        return { success: true, data: repairedData };
      }
    }

    return { success: false };
  }

  /**
   * Gets a default value for a given JSON Schema type
   * 
   * @param type - JSON Schema type
   * @returns Default value or undefined
   */
  private _getDefaultValueForType(type: string): unknown {
    switch (type) {
      case "string":
        return "";
      case "number":
      case "integer":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      default:
        return undefined;
    }
  }
}

/**
 * Singleton instance of ResponseValidator
 * Use this for application-wide validation
 */
export const responseValidator = new ResponseValidator();
