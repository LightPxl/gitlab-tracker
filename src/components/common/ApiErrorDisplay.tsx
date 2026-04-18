import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/api/types/common';

interface ApiErrorDisplayProps {
  error: ApiError | Error | null;
  onRetry?: () => void;
  className?: string;
  variant?: 'alert' | 'card' | 'inline';
  showDetails?: boolean;
}

export function ApiErrorDisplay({
  error,
  onRetry,
  className = '',
  variant = 'alert',
  showDetails = false,
}: ApiErrorDisplayProps) {
  if (!error) return null;

  const isApiError = 'status' in error && 'code' in error;
  const apiError = error as ApiError;

  // Determine error type and appropriate messaging
  const getErrorInfo = () => {
    if (isApiError) {
      switch (apiError.status) {
        case 401:
          return {
            icon: WifiOff,
            title: 'Authentication Error',
            message: 'Please check your GitLab token in settings.',
            variant: 'destructive' as const,
          };
        case 403:
          return {
            icon: WifiOff,
            title: 'Access Denied',
            message: 'You don\'t have permission to access this resource.',
            variant: 'destructive' as const,
          };
        case 404:
          return {
            icon: AlertCircle,
            title: 'Not Found',
            message: 'The requested resource could not be found.',
            variant: 'default' as const,
          };
        case 0:
          return {
            icon: WifiOff,
            title: 'Network Error',
            message: 'Please check your internet connection.',
            variant: 'destructive' as const,
          };
        default:
          if (apiError.status >= 500) {
            return {
              icon: AlertCircle,
              title: 'Server Error',
              message: 'GitLab server is experiencing issues. Please try again later.',
              variant: 'destructive' as const,
            };
          }
          break;
      }
    }

    // Default error info
    return {
      icon: AlertCircle,
      title: 'Error',
      message: error.message || 'An unexpected error occurred.',
      variant: 'destructive' as const,
    };
  };

  const { icon: Icon, title, message, variant: alertVariant } = getErrorInfo();

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="link"
            size="sm"
            onClick={onRetry}
            className="h-auto p-0 text-xs underline"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription>{message}</CardDescription>
          
          {showDetails && isApiError && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Technical Details</summary>
              <div className="mt-2 p-2 bg-muted rounded">
                <p>Status: {apiError.status}</p>
                <p>Code: {apiError.code}</p>
                <p>Time: {new Date(apiError.timestamp).toLocaleString()}</p>
              </div>
            </details>
          )}
          
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default: alert variant
  return (
    <Alert variant={alertVariant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{message}</p>
        
        {showDetails && isApiError && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <div className="mt-1">
              <p>Status: {apiError.status} | Code: {apiError.code}</p>
              <p>Time: {new Date(apiError.timestamp).toLocaleString()}</p>
            </div>
          </details>
        )}
        
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Specialized components for common error scenarios
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ApiErrorDisplay
      error={{
        message: 'Unable to connect to GitLab. Please check your internet connection.',
        status: 0,
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
      }}
      onRetry={onRetry}
      variant="card"
    />
  );
}

export function AuthenticationError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ApiErrorDisplay
      error={{
        message: 'Authentication failed. Please check your GitLab token in settings.',
        status: 401,
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      }}
      onRetry={onRetry}
      variant="card"
    />
  );
}

export function NotFoundError({ resource = 'resource' }: { resource?: string }) {
  return (
    <ApiErrorDisplay
      error={{
        message: `The ${resource} you're looking for could not be found.`,
        status: 404,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      }}
      variant="card"
    />
  );
}