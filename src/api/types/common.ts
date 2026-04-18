// API Response wrapper for consistent error handling
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

// Standardized API Error
export interface ApiError {
  message: string;
  code?: string | number;
  status?: number;
  timestamp: string;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  perPage?: number;
}

// Date range filter
export interface DateRangeFilter {
  since?: Date;
  until?: Date;
}

// Common query options
export interface QueryOptions {
  retries?: number;
  timeout?: number;
  cache?: boolean;
  staleTime?: number;
}

// Repository interface for standardized data access
export interface Repository<TEntity, TCreateData = Partial<TEntity>, TUpdateData = Partial<TEntity>> {
  findById(id: string | number): Promise<TEntity | null>;
  findMany(params?: any): Promise<TEntity[]>;
  create?(data: TCreateData): Promise<TEntity>;
  update?(id: string | number, data: TUpdateData): Promise<TEntity>;
  delete?(id: string | number): Promise<boolean>;
}

// HTTP Client interface
export interface HttpClient {
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  post<T>(path: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T>(path: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T>(path: string, config?: RequestConfig): Promise<T>;
}

// Request configuration
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  timeout?: number;
  retries?: number;
  silentOnAccessDenied?: boolean; // Return empty array on 403/404 instead of throwing
  defaultValue?: unknown; // Default value to return when silentOnAccessDenied is true
}

// Cache strategies
export type CacheStrategy = 'no-cache' | 'cache-first' | 'network-first' | 'cache-and-network';

// Query configuration for React Query
export interface QueryConfig {
  staleTime: number;
  cacheTime: number;
  retry: number | boolean;
  refetchOnWindowFocus: boolean;
}

// Batch processing utilities
export interface BatchConfig {
  batchSize: number;
  concurrency: number;
  delayMs?: number;
}