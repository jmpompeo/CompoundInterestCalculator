type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  align = 'left'
}: PageHeaderProps) {
  const isCentered = align === 'center';

  return (
    <header className={`space-y-3 ${isCentered ? 'text-center' : 'text-left'}`}>
      {eyebrow ? (
        <p className={`text-xs font-semibold uppercase tracking-[0.35em] text-brand-300 ${isCentered ? 'justify-center' : ''}`}>
          {eyebrow}
        </p>
      ) : null}
      <div className={isCentered ? 'mx-auto max-w-3xl' : 'max-w-3xl'}>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-sm text-slate-300 sm:text-base">{description}</p> : null}
      </div>
    </header>
  );
}
