import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/api/types/common';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // You could integrate with error reporting services here
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      return this.renderDefaultError();
    }

    return this.props.children;
  }

  private renderDefaultError() {
    const { level = 'page' } = this.props;
    const { error } = this.state;

    const isApiError = error && 'status' in error && 'code' in error;
    const errorMessage = error?.message || 'An unexpected error occurred';

    if (level === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (level === 'section') {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error in this section</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    // Component level (minimal)
    return (
      <div className="p-2 border border-destructive rounded bg-destructive/5">
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {isApiError ? 'Failed to load data' : 'Component error'}
          <Button
            variant="link"
            size="sm"
            onClick={this.handleRetry}
            className="h-auto p-0 text-xs underline"
          >
            Retry
          </Button>
        </p>
      </div>
    );
  }
}

// Higher-order component wrapper for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

export default ErrorBoundary;
