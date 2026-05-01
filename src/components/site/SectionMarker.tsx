export function SectionMarker({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-6">
      {children}
    </div>
  );
}
