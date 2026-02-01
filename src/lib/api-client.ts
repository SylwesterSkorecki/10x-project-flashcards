import type { ApiError } from "@/types";

/**
 * API client helper for making authenticated requests
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new ApiClientError(errorData.error.message, response.status, errorData.error.code, errorData.error.details);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", signal });
  }

  async post<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      signal,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  isValidationError(): boolean {
    return this.code === "validation_error";
  }

  isUnauthorized(): boolean {
    return this.status === 401 || this.code === "unauthorized";
  }

  isNotFound(): boolean {
    return this.status === 404 || this.code === "not_found";
  }

  isDuplicateError(): boolean {
    return this.code === "duplicate_front" || this.code === "duplicate_source";
  }

  isRateLimitError(): boolean {
    return this.status === 429;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
