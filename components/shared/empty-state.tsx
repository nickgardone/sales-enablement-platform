export function EmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}
