export type CalculationResponse = {
  startingPrincipal: number;
  annualRatePercent: number;
  compoundingCadence: string;
  durationYears: number;
  monthlyContribution: number;
  endingBalance: number;
  currencyDisplay: string;
  calculationVersion: string;
  traceId: string;
  responseId: string;
  clientReference?: string;
  requestedAt?: string;
  calculatedAt: string;
};

export type ValidationProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

export type GrowthFormState = {
  principal: string;
  annualRatePercent: string;
  durationYears: string;
  monthlyContribution: string;
  compoundingCadence: string;
  clientReference: string;
};

export const cadenceOptions = [
  { value: 'Annual', label: 'Annual', helper: 'Once per year' },
  { value: 'SemiAnnual', label: 'Semi-Annual', helper: 'Twice per year' },
  { value: 'Quarterly', label: 'Quarterly', helper: 'Four times per year' },
  { value: 'Monthly', label: 'Monthly', helper: 'Twelve times per year' }
];

export const initialContributionForm: GrowthFormState = {
  principal: '10000',
  annualRatePercent: '5.25',
  compoundingCadence: 'Annual',
  durationYears: '10',
  monthlyContribution: '100',
  clientReference: ''
};

export const initialSavingsForm: GrowthFormState = {
  principal: '10000',
  annualRatePercent: '5.25',
  compoundingCadence: 'Annual',
  durationYears: '10',
  monthlyContribution: '0',
  clientReference: ''
};
