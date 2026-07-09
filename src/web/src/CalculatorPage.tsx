import { Outlet } from 'react-router-dom';
import PageHeader from './components/PageHeader';
import SectionTabs from './components/SectionTabs';

export default function CalculatorPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Growth"
        title="Plan your growth with confidence"
        description="Compare recurring contributions against fixed-balance savings without mixing in unrelated debt tools."
        align="center"
      />

      <SectionTabs
        ariaLabel="Growth calculators"
        tabs={[
          { to: 'contribution', label: 'Contribution growth', helper: 'Monthly deposits plus compounding' },
          { to: 'savings', label: 'Savings growth', helper: 'Fixed balance, HYSA, and CD scenarios' }
        ]}
      />

      <Outlet />
    </div>
  );
}
