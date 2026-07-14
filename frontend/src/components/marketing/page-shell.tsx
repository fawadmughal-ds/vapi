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
    <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-4 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[100px] animate-aurora" />
      <div className="mx-auto max-w-3xl text-center">
        <p className="telemetry-label mb-4">NextCall / Neural Voice Infrastructure</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      </div>
      <div className="mt-14">{children}</div>
    </div>
  );
}
