import type { HighDtiWindow } from './config';

export function calculateMaxLoanAmount(monthlyPayment: number, aprPercent: number, nMonths: number): number {
  if (monthlyPayment <= 0 || nMonths <= 0) return 0;
  if (aprPercent <= 0) return monthlyPayment * nMonths;
  const r = aprPercent / 100 / 12;
  if (r <= 0) return monthlyPayment * nMonths;
  const pv = monthlyPayment * (1 - Math.pow(1 + r, -nMonths)) / r;
  return Math.round(pv * 100) / 100;
}

export function calculateMonthlyPayment(principal: number, aprPercent: number, nMonths: number): number {
  if (principal <= 0 || nMonths <= 0) return 0;
  if (aprPercent <= 0) return principal / nMonths;
  const r = aprPercent / 100 / 12;
  if (r <= 0) return principal / nMonths;
  const pmt = principal * r * Math.pow(1 + r, nMonths) / (Math.pow(1 + r, nMonths) - 1);
  return Math.round(pmt * 100) / 100;
}

export function isInHighDtiWindow(today: Date, windows: HighDtiWindow[]): boolean {
  for (const w of windows) {
    const start = new Date(w.start + 'T00:00:00');
    const end = new Date(w.end + 'T23:59:59');
    if (today >= start && today <= end) return true;
  }
  return false;
}

export function pickNpApr(aprMin: number, aprMax: number): number {
  return (aprMin + aprMax) / 2;
}
