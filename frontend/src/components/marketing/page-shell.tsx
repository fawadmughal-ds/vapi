export function MarketingPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      </div>
      <div className="mt-14">{children}</div>
    </div>
  );
}
