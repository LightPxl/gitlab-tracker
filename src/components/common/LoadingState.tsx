import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'card' | 'table';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  type = 'spinner',
  size = 'md',
  message = 'Loading...',
  rows = 3,
  className = '',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  if (type === 'spinner') {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className={`${sizeClasses[size]} animate-spin`} />
          {message && <span className="text-muted-foreground">{message}</span>}
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (type === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  // Default: skeleton
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

// Specialized loading components
export function PageLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingState type="spinner" size="lg" message="Loading page..." />
    </div>
  );
}

export function SectionLoadingState() {
  return (
    <div className="py-8">
      <LoadingState type="spinner" message="Loading data..." />
    </div>
  );
}

export function CardLoadingState() {
  return <LoadingState type="card" />;
}

export function TableLoadingState({ rows = 5 }: { rows?: number }) {
  return <LoadingState type="table" rows={rows} />;
}

export function InlineLoadingState() {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}