type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={`animate-pulse rounded-2xl bg-surface-strong/80 ${className}`.trim()}
    />
  );
}