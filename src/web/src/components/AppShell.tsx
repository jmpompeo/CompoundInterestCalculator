import { NavLink, Outlet } from 'react-router-dom';

const primaryNavItems = [
  {
    to: '/growth',
    label: 'Growth',
    helper: 'Savings and compounding'
  },
  {
    to: '/loans',
    label: 'Loans',
    helper: 'Auto and mortgage planning'
  },
  {
    to: '/budget',
    label: 'Budget',
    helper: 'Monthly spending controls'
  },
  {
    to: '/debt',
    label: 'Debt',
    helper: 'Balances and payoff progress'
  }
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-300">Finance Workspace</p>
            <p className="text-sm text-slate-300">Growth, borrowing, budgeting, and debt planning in one app.</p>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-3">
              {primaryNavItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                      isActive
                        ? 'border-brand-400/60 bg-brand-500/15 text-brand-50 shadow-[0_0_0_1px_rgba(96,165,250,0.2)]'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                  <span className="ml-2 text-xs text-slate-400">{item.helper}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
