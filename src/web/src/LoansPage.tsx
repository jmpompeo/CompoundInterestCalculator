import { Outlet } from 'react-router-dom';
import PageHeader from './components/PageHeader';
import SectionTabs from './components/SectionTabs';

export default function LoansPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Loans"
        title="Compare borrowing decisions with less guesswork"
        description="Keep auto and mortgage estimates together so financing choices use the same polished workflow."
        align="center"
      />

      <SectionTabs
        ariaLabel="Loan calculators"
        tabs={[
          { to: 'car', label: 'Car loan', helper: 'Taxes, fees, trade-ins, and add-ons' },
          { to: 'mortgage', label: 'Mortgage', helper: 'P&I, taxes, PMI, and total payment' }
        ]}
      />

      <Outlet />
    </div>
  );
}
