/**
 * OpenRouter Service — Integration with OpenRouter.ai API
 *
 * Provides secure and standardized integration with OpenRouter API for LLM-based
 * chat completions. Features include:
 * - Unified HTTP client with retry and exponential backoff
 * - Response format validation (JSON Schema)
 * - Model parameter handling and model name mapping
 * - Centralized logging and cost metrics
 *
 * Usage: Server-side only (API routes or backend services)
 */

import { responseValidator } from "../openrouter/response-validator";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Message role in a conversation
 */
export type Role = "system" | "user" | "assistant";

/**
 * Chat message format (local application format)
 */
export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * OpenRouter API message format
 */
interface OpenRouterMessage {
  role: Role;
  content: string;
  name?: string;
}

/**
 * JSON Schema response format configuration
 */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

/**
 * Options for sending chat messages
 */
export interface SendOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: ResponseFormat;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
}

/**
 * Token usage information from API response
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Model response from OpenRouter API
 */
export interface ModelResponse {
  id: string;
  model: string;
  content: string;
  role: Role;
  finish_reason: string;
  usage?: TokenUsage;
  metadata?: {
    request_id?: string;
    generation_time_ms?: number;
  };
}

/**
 * Model metadata information
 */
export interface ModelMetadata {
  id: string;
  name: string;
  pricing?: {
    prompt: number;
    completion: number;
  };
  context_length?: number;
  description?: string;
}

/**
 * Validation result for response format
 */
export interface ValidationResult {
  valid: boolean;
  data?: unknown;
  errors?: {
    path: string;
    message: string;
  }[];
}

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  requests: number;
  perSeconds: number;
}

/**
 * Telemetry client interface (optional integration)
 */
interface TelemetryClient {
  logEvent(event: string, data: Record<string, unknown>): void;
  logError(error: Error, context: Record<string, unknown>): void;
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before attempting half-open
}

/**
 * Constructor configuration for OpenRouterService
 */
export interface OpenRouterServiceConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffBaseMs?: number;
  rateLimit?: RateLimitConfig;
  telemetry?: TelemetryClient;
  responseSchemas?: Record<string, Record<string, unknown>>;
  circuitBreaker?: CircuitBreakerConfig;
  maxValidationRetries?: number; // Number of retries on validation failure
}

/**
 * Internal HTTP request payload
 */
interface RequestPayload {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: ResponseFormat;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
}

/**
 * OpenRouter API error response
 */
interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * OpenRouter API success response
 */
interface OpenRouterSuccessResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: Role;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage?: TokenUsage;
  created: number;
}

// ============================================================================
// OpenRouterService Class
// ============================================================================

/**
 * Service for interacting with OpenRouter API
 */
export class OpenRouterService {
  private readonly _apiKey: string;
  private readonly _baseUrl: string;
  private readonly _defaultModel: string;
  private readonly _timeoutMs: number;
  private readonly _maxRetries: number;
  private readonly _retryBackoffBaseMs: number;
  private readonly _rateLimit?: RateLimitConfig;
  private readonly _telemetry?: TelemetryClient;
  private readonly _schemasCache: Map<string, Record<string, unknown>>;
  private readonly _maxValidationRetries: number;
  private _lastRequestMeta?: Record<string, unknown>;

  // Rate limiting state
  private _requestTimestamps: number[] = [];

  // Circuit breaker state
  private readonly _circuitBreakerConfig?: CircuitBreakerConfig;
  private _circuitState: CircuitState = CircuitState.CLOSED;
  private _failureCount = 0;
  private _successCount = 0;
  private _nextAttemptTime = 0;

  /**
   * Creates a new OpenRouterService instance
   *
   * @param config - Configuration options
   */
  constructor(config: OpenRouterServiceConfig) {
    // Validate required fields
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new Error("OpenRouter API key is required");
    }

    this._apiKey = config.apiKey;
    this._baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this._defaultModel = config.defaultModel || "openai/gpt-4o-mini";
    this._timeoutMs = config.timeoutMs || 30000;
    this._maxRetries = config.maxRetries ?? 3;
    this._retryBackoffBaseMs = config.retryBackoffBaseMs || 1000;
    this._rateLimit = config.rateLimit;
    this._telemetry = config.telemetry;
    this._schemasCache = new Map(Object.entries(config.responseSchemas || {}));
    this._maxValidationRetries = config.maxValidationRetries ?? 2;
    this._circuitBreakerConfig = config.circuitBreaker || {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 60 seconds
    };
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Sends a chat message to OpenRouter and returns the model's response
   *
   * @param conversationId - Unique identifier for the conversation (for logging)
   * @param messages - Array of chat messages
   * @param options - Optional configuration for the request
   * @returns Promise resolving to the model's response
   */
  async sendChatMessage(
    conversationId: string,
    messages: ChatMessage[],
    options?: SendOptions
  ): Promise<ModelResponse> {
    // Guard: Validate input
    if (!messages || messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    // Check circuit breaker
    this._checkCircuitBreaker();

    // Check rate limit
    if (this._rateLimit) {
      await this._checkRateLimit();
    }

    // Map messages to OpenRouter format
    const openRouterMessages = this._mapToOpenRouterMessages(messages);

    // Prepare request payload
    const payload: RequestPayload = {
      model: options?.model || this._defaultModel,
      messages: openRouterMessages,
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
      response_format: options?.response_format,
      stream: options?.stream,
      top_p: options?.top_p,
      top_k: options?.top_k,
      presence_penalty: options?.presence_penalty,
      frequency_penalty: options?.frequency_penalty,
      stop: options?.stop,
    };

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof RequestPayload] === undefined) {
        delete payload[key as keyof RequestPayload];
      }
    });

    // Send request with validation retry
    return this._sendWithValidationRetry(conversationId, payload, options?.response_format);
  }

  /**
   * Gets metadata for a specific model
   *
   * @param model - Model identifier (optional, defaults to defaultModel)
   * @returns Promise resolving to model metadata
   */
  async getModelInfo(model?: string): Promise<ModelMetadata> {
    const modelId = model || this._defaultModel;

    // TODO: Implement model metadata fetching from OpenRouter API
    // For now, return basic metadata
    return {
      id: modelId,
      name: modelId,
      description: "Model metadata not yet implemented",
    };
  }

  /**
   * Validates a response against a predefined schema
   *
   * @param schemaName - Name of the schema to validate against
   * @param response - Response data to validate
   * @returns Validation result
   */
  validateResponse(schemaName: string, response: unknown): ValidationResult {
    const schema = this._schemasCache.get(schemaName);

    if (!schema) {
      return {
        valid: false,
        errors: [{ path: "schema", message: `Schema '${schemaName}' not found` }],
      };
    }

    // TODO: Implement full JSON Schema validation (e.g., using ajv)
    // For now, return basic validation
    return {
      valid: true,
      data: response,
    };
  }

  /**
   * Updates the API key (useful for key rotation)
   *
   * @param key - New API key
   */
  setApiKey(key: string): void {
    if (!key || key.trim() === "") {
      throw new Error("API key cannot be empty");
    }

    // Use type assertion to modify readonly field
    (this as { _apiKey: string })._apiKey = key;
  }

  /**
   * Gets the default model
   */
  get defaultModel(): string {
    return this._defaultModel;
  }

  /**
   * Gets metadata from the last request (for debugging)
   */
  get lastRequestMeta(): Record<string, unknown> | undefined {
    return this._lastRequestMeta;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Internal HTTP request wrapper with retry and timeout
   *
   * @param payload - Request payload
   * @returns Promise resolving to API response
   */
  private async _request(payload: RequestPayload): Promise<OpenRouterSuccessResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._timeoutMs);

        // Log request for debugging (first attempt only)
        if (attempt === 0) {
          console.log("OpenRouter Request:", {
            url: `${this._baseUrl}/chat/completions`,
            model: payload.model,
            messagesCount: payload.messages.length,
            hasResponseFormat: !!payload.response_format,
            responseFormat: payload.response_format,
          });
        }

        // Make request
        const response = await fetch(`${this._baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this._apiKey}`,
            "HTTP-Referer": "https://10xdev-flashcards.app", // Optional: your app URL
            "X-Title": "SmartFlash", // Optional: your app name
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle response
        if (!response.ok) {
          await this._handleErrorResponse(response, attempt);
          continue; // Retry on retryable errors
        }

        // Parse success response
        const data = (await response.json()) as OpenRouterSuccessResponse;

        // Store request metadata
        this._lastRequestMeta = {
          model: payload.model,
          status: response.status,
          attempt: attempt + 1,
        };

        // Handle rate limit headers
        this._handleRateLimitHeaders(response.headers);

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort (timeout)
        if (lastError.name === "AbortError") {
          throw new Error(`Request timeout after ${this._timeoutMs}ms`);
        }

        // Apply exponential backoff before retry
        if (attempt < this._maxRetries) {
          const backoffMs = this._calculateBackoff(attempt);
          await this._sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error("Request failed after all retries");
  }

  /**
   * Handles error responses from the API
   *
   * @param response - Fetch response object
   * @param attempt - Current retry attempt number
   * @throws Error if the error is not retryable
   */
  private async _handleErrorResponse(response: Response, attempt: number): Promise<void> {
    const status = response.status;

    // Try to parse error response
    let errorMessage = `API request failed with status ${status}`;
    let errorData: OpenRouterErrorResponse | null = null;
    try {
      errorData = (await response.json()) as OpenRouterErrorResponse;
      errorMessage = errorData.error?.message || errorMessage;

      // Log full error details for debugging
      console.error("OpenRouter API Error:", {
        status,
        error: errorData.error,
        fullResponse: errorData,
      });
    } catch {
      // Couldn't parse error, use default message
      console.error("Failed to parse OpenRouter error response");
    }

    // Handle different error types
    if (status === 401 || status === 403) {
      // Authorization errors - not retryable
      throw new Error(`Authorization failed: ${errorMessage}`);
    }

    if (status === 429) {
      // Rate limit - retryable with backoff
      const retryAfter = response.headers.get("retry-after");
      const backoffMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : this._calculateBackoff(attempt);

      this._logTelemetry("rate_limit_hit", {
        retry_after_ms: backoffMs,
        attempt: attempt + 1,
      });

      await this._sleep(backoffMs);
      return; // Continue retry
    }

    if (status >= 500) {
      // Server errors - retryable
      if (attempt >= this._maxRetries) {
        throw new Error(`Server error after ${attempt + 1} attempts: ${errorMessage}`);
      }
      return; // Continue retry
    }

    // Client errors (4xx except 429) - not retryable
    throw new Error(`Client error: ${errorMessage}`);
  }

  /**
   * Maps local chat messages to OpenRouter format
   *
   * @param messages - Array of local chat messages
   * @returns Array of OpenRouter messages
   */
  private _mapToOpenRouterMessages(messages: ChatMessage[]): OpenRouterMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    }));
  }

  /**
   * Extracts model response from API response
   *
   * @param apiResponse - Raw API response
   * @param durationMs - Request duration in milliseconds
   * @returns Formatted model response
   */
  private _extractModelResponse(apiResponse: OpenRouterSuccessResponse, durationMs: number): ModelResponse {
    const choice = apiResponse.choices[0];

    if (!choice) {
      throw new Error("No choices in API response");
    }

    return {
      id: apiResponse.id,
      model: apiResponse.model,
      content: choice.message.content,
      role: choice.message.role,
      finish_reason: choice.finish_reason,
      usage: apiResponse.usage,
      metadata: {
        request_id: apiResponse.id,
        generation_time_ms: durationMs,
      },
    };
  }

  /**
   * Sends a request with automatic retry on validation failure
   *
   * @param conversationId - Conversation identifier
   * @param payload - Request payload
   * @param responseFormat - Optional response format for validation
   * @returns Model response
   */
  private async _sendWithValidationRetry(
    conversationId: string,
    payload: RequestPayload,
    responseFormat?: ResponseFormat
  ): Promise<ModelResponse> {
    let lastError: Error | null = null;
    let lastResponse: ModelResponse | null = null;

    for (let attempt = 0; attempt <= this._maxValidationRetries; attempt++) {
      const startTime = Date.now();

      try {
        const response = await this._request(payload);
        const duration = Date.now() - startTime;

        // Extract response
        const modelResponse = this._extractModelResponse(response, duration);
        lastResponse = modelResponse;

        // Apply response format validation if specified
        if (responseFormat) {
          const validationResult = responseValidator.validate(modelResponse.content, responseFormat);

          if (!validationResult.valid) {
            const errorMsg = validationResult.errors?.map((e) => `${e.path}: ${e.message}`).join("; ");

            // If strict mode or out of retries, throw
            if (responseFormat.json_schema.strict || attempt >= this._maxValidationRetries) {
              throw new Error(`Response validation failed: ${errorMsg}`);
            }

            // Log validation failure
            this._logTelemetry("validation_retry", {
              conversation_id: conversationId,
              attempt: attempt + 1,
              errors: errorMsg,
            });

            // Retry with additional instruction
            payload.messages = [
              ...payload.messages,
              {
                role: "assistant",
                content: modelResponse.content,
              },
              {
                role: "user",
                content:
                  `Your previous response did not match the required JSON schema. ` +
                  `Validation errors: ${errorMsg}. ` +
                  `Please provide a corrected response that strictly follows the schema.`,
              },
            ];

            // Continue to next attempt
            continue;
          }
        }

        // Record success for circuit breaker
        this._recordSuccess();

        // Log telemetry
        this._logTelemetry("chat_completion_success", {
          conversation_id: conversationId,
          model: payload.model,
          duration_ms: duration,
          usage: modelResponse.usage,
          validation_attempts: attempt + 1,
        });

        return modelResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's a non-validation error, don't retry
        if (!lastError.message.includes("validation failed")) {
          break;
        }
      }
    }

    // All attempts exhausted
    this._recordFailure();

    this._logTelemetry("chat_completion_error", {
      conversation_id: conversationId,
      model: payload.model,
      error: lastError?.message || "Unknown error",
    });

    throw (
      lastError ||
      new Error(
        `Validation failed after ${this._maxValidationRetries + 1} attempts. Last response: ${lastResponse?.content}`
      )
    );
  }

  /**
   * Handles rate limit information from response headers
   *
   * @param headers - Response headers
   */
  private _handleRateLimitHeaders(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining !== null && reset !== null) {
      this._logTelemetry("rate_limit_info", {
        remaining: parseInt(remaining, 10),
        reset_timestamp: parseInt(reset, 10),
      });
    }
  }

  /**
   * Checks if rate limit allows the request
   *
   * @throws Error if rate limit is exceeded
   */
  private async _checkRateLimit(): Promise<void> {
    if (!this._rateLimit) return;

    const now = Date.now();
    const windowMs = this._rateLimit.perSeconds * 1000;

    // Remove old timestamps outside the window
    this._requestTimestamps = this._requestTimestamps.filter((timestamp) => now - timestamp < windowMs);

    // Check if limit exceeded
    if (this._requestTimestamps.length >= this._rateLimit.requests) {
      const oldestTimestamp = this._requestTimestamps[0];
      const waitMs = windowMs - (now - oldestTimestamp);

      if (waitMs > 0) {
        this._logTelemetry("rate_limit_wait", { wait_ms: waitMs });
        await this._sleep(waitMs);
      }
    }

    // Add current timestamp
    this._requestTimestamps.push(now);
  }

  /**
   * Logs telemetry event
   *
   * @param event - Event name
   * @param data - Event data
   */
  private _logTelemetry(event: string, data: Record<string, unknown>): void {
    if (!this._telemetry) return;

    try {
      this._telemetry.logEvent(event, {
        ...data,
        timestamp: new Date().toISOString(),
        service: "openrouter",
      });
    } catch (error) {
      // Silently fail telemetry logging
      console.error("Telemetry logging failed:", error);
    }
  }

  /**
   * Calculates exponential backoff delay
   *
   * @param attempt - Current retry attempt (0-indexed)
   * @returns Backoff delay in milliseconds
   */
  private _calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialMs = this._retryBackoffBaseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialMs; // 30% jitter
    return Math.min(exponentialMs + jitter, 60000); // Cap at 60 seconds
  }

  /**
   * Sleep utility function
   *
   * @param ms - Milliseconds to sleep
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks circuit breaker state before making a request
   *
   * @throws Error if circuit is open
   */
  private _checkCircuitBreaker(): void {
    if (!this._circuitBreakerConfig) return;

    const now = Date.now();

    if (this._circuitState === CircuitState.OPEN) {
      // Check if timeout has passed to transition to half-open
      if (now >= this._nextAttemptTime) {
        this._circuitState = CircuitState.HALF_OPEN;
        this._successCount = 0;
        this._logTelemetry("circuit_breaker_half_open", {
          state: this._circuitState,
        });
      } else {
        const waitMs = this._nextAttemptTime - now;
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry in ${Math.ceil(waitMs / 1000)}s`);
      }
    }
  }

  /**
   * Records a successful request for circuit breaker
   */
  private _recordSuccess(): void {
    if (!this._circuitBreakerConfig) return;

    this._failureCount = 0;

    if (this._circuitState === CircuitState.HALF_OPEN) {
      this._successCount++;

      if (this._successCount >= this._circuitBreakerConfig.successThreshold) {
        // Transition to closed
        this._circuitState = CircuitState.CLOSED;
        this._successCount = 0;
        this._logTelemetry("circuit_breaker_closed", {
          state: this._circuitState,
        });
      }
    }
  }

  /**
   * Records a failed request for circuit breaker
   */
  private _recordFailure(): void {
    if (!this._circuitBreakerConfig) return;

    this._failureCount++;

    if (
      this._circuitState === CircuitState.HALF_OPEN ||
      this._failureCount >= this._circuitBreakerConfig.failureThreshold
    ) {
      // Transition to open
      this._circuitState = CircuitState.OPEN;
      this._nextAttemptTime = Date.now() + this._circuitBreakerConfig.timeout;
      this._failureCount = 0;
      this._successCount = 0;

      this._logTelemetry("circuit_breaker_open", {
        state: this._circuitState,
        next_attempt_time: new Date(this._nextAttemptTime).toISOString(),
      });
    }
  }
}
