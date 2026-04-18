import { cn } from "@/lib/utils";

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted/40", className)}
            {...props}
        />
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center space-x-4 py-4 border-b border-white/5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[40%]" />
                <Skeleton className="h-3 w-[20%]" />
            </div>
            <Skeleton className="h-8 w-16" />
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="glass-card rounded-xl p-6 h-[350px] flex flex-col">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="flex-1 flex items-end gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="w-full"
                        style={{ height: `${Math.random() * 80 + 20}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
