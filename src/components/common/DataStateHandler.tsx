import React from 'react';
import { LoadingState, PageLoadingState, SectionLoadingState } from './LoadingState';
import { ApiErrorDisplay, NetworkError, AuthenticationError, NotFoundError } from './ApiErrorDisplay';
import { ErrorBoundary } from './ErrorBoundary';
import { ApiResponse, ApiError } from '@/api/types/common';

interface DataStateHandlerProps<T> {
  data: ApiResponse<T> | { data: T | null; error: any; loading: boolean };
  children: (data: T) => React.ReactNode;
  
  // Loading customization
  loadingComponent?: React.ReactNode;
  loadingType?: 'page' | 'section' | 'inline' | 'card' | 'table';
  loadingMessage?: string;

  // Error customization
  errorComponent?: React.ReactNode;
  errorType?: 'page' | 'section' | 'inline';
  onRetry?: () => void;
  showErrorDetails?: boolean;

  // Empty state
  emptyComponent?: React.ReactNode;
  emptyMessage?: string;

  // Additional options
  className?: string;
  errorBoundary?: boolean;
}

/**
 * Comprehensive data state handler that manages loading, error, and empty states
 */
export function DataStateHandler<T>({
  data,
  children,
  loadingComponent,
  loadingType = 'section',
  loadingMessage,
  errorComponent,
  errorType = 'section',
  onRetry,
  showErrorDetails = false,
  emptyComponent,
  emptyMessage = 'No data available',
  className = '',
  errorBoundary = false,
}: DataStateHandlerProps<T>) {
  const { data: responseData, error, loading } = data;

  // Loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    switch (loadingType) {
      case 'page':
        return <PageLoadingState />;
      case 'section':
        return <SectionLoadingState />;
      case 'inline':
        return (
          <div className="flex items-center gap-2">
            <LoadingState type="spinner" size="sm" />
          </div>
        );
      case 'card':
        return <LoadingState type="card" className={className} />;
      case 'table':
        return <LoadingState type="table" className={className} />;
      default:
        return <LoadingState message={loadingMessage} className={className} />;
    }
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    const errorVariant = errorType === 'page' ? 'card' : 
                        errorType === 'inline' ? 'inline' : 'alert';

    return (
      <ApiErrorDisplay
        error={error}
        onRetry={onRetry}
        variant={errorVariant}
        showDetails={showErrorDetails}
        className={className}
      />
    );
  }

  // Empty state
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }

    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  // Success state - render children with data
  const content = children(responseData);

  // Wrap with error boundary if requested
  if (errorBoundary) {
    return (
      <ErrorBoundary level="section">
        {content}
      </ErrorBoundary>
    );
  }

  return <>{content}</>;
}

// Convenience wrapper for common patterns
interface SimpleDataHandlerProps<T> {
  query: { data: T | null; error: any; loading: boolean; refetch?: () => void };
  children: (data: T) => React.ReactNode;
  fallback?: {
    loading?: React.ReactNode;
    error?: React.ReactNode;
    empty?: React.ReactNode;
  };
  className?: string;
}

export function SimpleDataHandler<T>({
  query,
  children,
  fallback,
  className,
}: SimpleDataHandlerProps<T>) {
  return (
    <DataStateHandler
      data={query}
      onRetry={query.refetch}
      loadingComponent={fallback?.loading}
      errorComponent={fallback?.error}
      emptyComponent={fallback?.empty}
      className={className}
      errorBoundary={true}
    >
      {children}
    </DataStateHandler>
  );
}

// Hook for consistent data state handling
export function useDataState<T>(apiResponse: ApiResponse<T>) {
  const { data, error, loading } = apiResponse;

  const state = {
    isLoading: loading,
    hasError: !!error,
    hasData: !!data,
    isEmpty: !loading && !error && (!data || (Array.isArray(data) && data.length === 0)),
    isReady: !loading && !error && !!data,
  };

  return {
    ...state,
    data,
    error,
    loading,
  };
}