import { NavLink } from 'react-router-dom';

type SectionTab = {
  to: string;
  label: string;
  helper: string;
};

type SectionTabsProps = {
  ariaLabel: string;
  tabs: SectionTab[];
};

export default function SectionTabs({ ariaLabel, tabs }: SectionTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-3">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? 'border-brand-400/60 bg-brand-500/15 text-brand-50 shadow-[0_0_0_1px_rgba(96,165,250,0.2)]'
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`
            }
          >
            <span className="block text-sm font-semibold">{tab.label}</span>
            <span className="mt-1 block text-xs text-slate-400">{tab.helper}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
