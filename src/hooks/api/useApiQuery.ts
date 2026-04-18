import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiResponse, ApiError } from '@/api/types/common';
import { ApiErrorHandler } from '@/api/error-handling';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';

// Smart retry function that doesn't retry non-retryable errors (403, 404, etc.)
const shouldRetry = (failureCount: number, error: any, maxRetries: number = 3): boolean => {
  if (failureCount >= maxRetries) return false;
  
  // Don't retry client errors (400-499) except for rate limiting (429) and timeout (408)
  const status = error?.status;
  if (status && status >= 400 && status < 500 && status !== 429 && status !== 408) {
    return false;
  }
  
  // Only retry server errors (500+) and network errors
  return ApiErrorHandler.isRetryableError(error);
};

// Base hook for API calls with consistent error handling
export function useApiQuery<TData, TError = ApiError>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
): ApiResponse<TData> & {
  refetch: () => void;
  isRefetching: boolean;
} {
  const maxRetries = typeof options?.retry === 'number' ? options.retry : 1;
  
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error) {
        const apiError = ApiErrorHandler.handleFetchError(error);
        // Only log errors that aren't expected (not 403/404 for batch operations)
        if (apiError.status !== 403 && apiError.status !== 404) {
          ApiErrorHandler.logError(apiError, queryKey.join('-'));
        }
        throw apiError;
      }
    },
    ...options,
    // Override retry to use smart retry logic
    retry: (failureCount, error) => shouldRetry(failureCount, error, maxRetries),
    // Reduce retry delay for faster failure
    retryDelay: (attemptIndex) => Math.min(500 * Math.pow(1.5, attemptIndex), 3000),
  });

  return {
    data: query.data || null,
    error: (query.error as ApiError) || null,
    loading: query.isLoading,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

// Base hook for API mutations
export function useApiMutation<TData, TVariables, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (error) {
        const apiError = ApiErrorHandler.handleFetchError(error);
        ApiErrorHandler.logError(apiError, 'mutation');
        throw apiError;
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries on successful mutations
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// Hook for handling loading states across multiple queries
export function useLoadingState(queries: Array<{ loading: boolean; error: any }>) {
  const isLoading = queries.some(q => q.loading);
  const allLoading = queries.every(q => q.loading);
  const hasError = queries.some(q => q.error);
  const errors = queries.filter(q => q.error).map(q => q.error);
  const hasAnyData = queries.some(q => !q.loading && !q.error);

  return {
    isLoading,
    allLoading,
    hasError,
    errors,
    // isReady is true when NOT loading and has no errors
    isReady: !isLoading && !hasError,
    // isPartiallyReady is true when at least some data is available (even if some queries failed)
    isPartiallyReady: !allLoading && hasAnyData,
  };
}

// Hook for automatic retry logic
export function useRetryQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  maxRetries: number = 3
) {
  return useApiQuery(
    queryKey,
    queryFn,
    {
      retry: (failureCount, error: any) => {
        if (failureCount >= maxRetries) return false;
        
        const apiError = error as ApiError;
        return ApiErrorHandler.isRetryableError(apiError);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
}

// Hook for batch operations with progress tracking
export function useBatchOperation<TItem, TResult>(
  items: TItem[],
  operation: (item: TItem) => Promise<TResult>,
  options?: {
    batchSize?: number;
    enabled?: boolean;
    onProgress?: (completed: number, total: number) => void;
  }
) {
  const { batchSize = 10, enabled = true, onProgress } = options || {};

  return useQuery({
    queryKey: ['batch-operation', items.length],
    queryFn: async () => {
      const results: TResult[] = [];
      let completed = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(item => operation(item))
        );

        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
          completed++;
          onProgress?.(completed, items.length);
        });

        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    },
    enabled: enabled && items.length > 0,
    ...QUERY_CONFIGS.BATCH_OPERATIONS,
  });
}