type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: string;
};

export function SectionIntro({
  eyebrow,
  title,
  description,
  aside,
}: SectionIntroProps) {
  return (
    <section className="rounded-4xl border border-line bg-surface p-8 xl:p-9 shadow-[0_16px_48px_rgba(0,0,0,0.05)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h1 className="mt-2 text-4xl xl:text-5xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-foreground/65">{description}</p>
        </div>
        {aside ? (
          <div className="rounded-3xl border border-line bg-surface-strong px-5 py-4 text-base text-foreground/65 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
