import { KeyboardEvent } from 'react';

export const preventInvalidNumericInput = (event: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
};

export const parseNumber = (value: string): number | null => {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

export const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
