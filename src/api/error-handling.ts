import { ApiError } from '@/api/types/common';

export class ApiErrorHandler {
  static createError(
    message: string, 
    status?: number, 
    code?: string | number
  ): ApiError {
    return {
      message,
      status,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  static handleFetchError(error: any, context?: string): ApiError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createError(
        'Network error: Please check your internet connection',
        0,
        'NETWORK_ERROR'
      );
    }

    if (error.name === 'AbortError') {
      return this.createError(
        'Request timeout: The server took too long to respond',
        408,
        'TIMEOUT'
      );
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return this.createError(
        'Authentication failed: Please check your GitLab token',
        401,
        'UNAUTHORIZED'
      );
    }

    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      return this.createError(
        'Access denied: Insufficient permissions for this action',
        403,
        'FORBIDDEN'
      );
    }

    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return this.createError(
        'Resource not found',
        404,
        'NOT_FOUND'
      );
    }

    // Default error
    return this.createError(
      error.message || 'An unexpected error occurred',
      error.status || 500,
      error.code || 'UNKNOWN_ERROR'
    );
  }

  static isRetryableError(error: ApiError): boolean {
    if (!error.status) return true; // Network errors are retryable
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }

  static logError(error: ApiError, context?: string): void {
    const prefix = context ? `[${context}]` : '[API Error]';
    
    if (error.status === 404 || error.code === 'NOT_FOUND') {
      // Don't spam logs for expected 404s
      console.debug(`${prefix} ${error.message}`, { error });
    } else if (error.status && error.status < 500) {
      // Client errors (400-499)
      console.warn(`${prefix} ${error.message}`, { error });
    } else {
      // Server errors (500+) or unknown errors
      console.error(`${prefix} ${error.message}`, { error });
    }
  }
}

export class RetryStrategy {
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        const apiError = ApiErrorHandler.handleFetchError(error);
        
        // Don't retry non-retryable errors
        if (!ApiErrorHandler.isRetryableError(apiError)) {
          throw apiError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw ApiErrorHandler.handleFetchError(lastError);
  }
}