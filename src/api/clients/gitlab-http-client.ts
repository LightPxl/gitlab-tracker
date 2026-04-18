import { HttpClient, RequestConfig } from '@/api/types/common';
import { ApiErrorHandler, RetryStrategy } from '@/api/error-handling';
import { storage } from '@/lib/storage';

export class GitLabHttpClient implements HttpClient {
  private defaultTimeout: number = 10000; // Reduced from 20s to 10s for faster timeout

  private getBaseUrl(): string {
    const url = storage.getUrl().replace(/\/$/, '');
    return `${url}/api/v4`;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = storage.getToken();
    if (!token) {
      throw ApiErrorHandler.createError(
        'No GitLab token found. Please configure your token in settings.',
        401,
        'NO_TOKEN'
      );
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    path: string, 
    options: RequestInit = {},
    config?: RequestConfig
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = config?.timeout || this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${this.getBaseUrl()}${path}`;
      const headers = {
        ...this.getAuthHeaders(),
        ...config?.headers,
        ...options.headers,
      };

      // Add query parameters if provided
      const urlWithParams = config?.params
        ? (() => {
            const searchParams = new URLSearchParams();
            Object.entries(config.params).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
              }
            });
            const query = searchParams.toString();
            return query ? `${url}?${query}` : url;
          })()
        : url;

      const response = await fetch(urlWithParams, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        storage.removeToken();
        // Redirect to settings page
        if (typeof window !== 'undefined') {
          window.location.href = '/settings';
        }
        throw ApiErrorHandler.createError(
          'Authentication failed. Please check your GitLab token.',
          401,
          'UNAUTHORIZED'
        );
      }

      // Handle 403/404 silently when configured (common for inaccessible projects)
      if (config?.silentOnAccessDenied && (response.status === 403 || response.status === 404)) {
        // Return defaultValue - can be null, [], or any specified value
        return config.defaultValue as T;
      }

      // Handle other HTTP errors
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorBody = await response.json();
          if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        } catch {
          // Ignore JSON parsing errors
        }

        throw ApiErrorHandler.createError(errorMessage, response.status);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw ApiErrorHandler.handleFetchError(error, path);
    }
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    const retries = config?.retries ?? 2;
    return RetryStrategy.withRetry(
      () => this.makeRequest<T>(path, { method: 'GET' }, config),
      retries
    );
  }

  async post<T>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    const retries = config?.retries ?? 1; // Less retries for mutations
    return RetryStrategy.withRetry(
      () => this.makeRequest<T>(path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }, config),
      retries
    );
  }

  async put<T>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    const retries = config?.retries ?? 1;
    return RetryStrategy.withRetry(
      () => this.makeRequest<T>(path, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }, config),
      retries
    );
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    const retries = config?.retries ?? 1;
    return RetryStrategy.withRetry(
      () => this.makeRequest<T>(path, { method: 'DELETE' }, config),
      retries
    );
  }

  // Utility method for batch processing with concurrency control
  // Optimized to prevent browser freezing
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      concurrency?: number;
      delayMs?: number;
    } = {}
  ): Promise<R[]> {
    const {
      batchSize = 5,        // Smaller batches to prevent overwhelming browser
      concurrency = 3,      // Lower concurrency to prevent tab crash
      delayMs = 100         // More delay to let browser breathe
    } = options;

    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch in concurrency-limited chunks
      for (let j = 0; j < batch.length; j += concurrency) {
        const chunk = batch.slice(j, j + concurrency);
        const chunkResults = await Promise.all(
          chunk.map(async (item, index): Promise<R | null> => {
            const staggerMs = delayMs * (j + index);
            if (staggerMs > 0) {
              await new Promise(resolve => setTimeout(resolve, staggerMs));
            }

            try {
              return await processor(item);
            } catch {
              return null;
            }
          })
        );

        for (const result of chunkResults) {
          if (result !== null) {
            results.push(result);
          }
        }
      }

      // IMPORTANT: Yield to main thread between batches to prevent "not responding"
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return results;
  }
}

// Singleton instance
export const gitlabHttpClient = new GitLabHttpClient();