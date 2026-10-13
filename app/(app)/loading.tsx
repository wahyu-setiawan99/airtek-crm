export default function Loading() {
  return (
    <div className="grid gap-3">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
