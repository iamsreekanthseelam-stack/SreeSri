/**
 * Format a number as Indian Rupees with lakhs/crores notation.
 * 1,00,000 = 1 lakh; 1,00,00,000 = 1 crore
 */
export function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000_000) {
    return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(2)}L`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * Full rupee amount without abbreviation, proper Indian format.
 */
export function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format gain/loss with sign and color class.
 */
export function gainLossClass(value: number): string {
  return value >= 0 ? "text-gain" : "text-loss";
}

/**
 * Format a percentage with sign.
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a number with sign (for gain/loss in rupees).
 */
export function formatINRWithSign(amount: number): string {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}${formatINR(amount)}`;
}

/**
 * Calculate compound interest maturity value.
 */
export function calcCompoundInterest(
  principal: number,
  ratePercent: number,
  years: number,
  timesPerYear: number,
): number {
  return (
    principal * (1 + ratePercent / 100 / timesPerYear) ** (timesPerYear * years)
  );
}

/**
 * Calculate simple interest current value.
 */
export function calcSimpleInterest(
  principal: number,
  ratePercent: number,
  years: number,
): number {
  return principal * (1 + (ratePercent / 100) * years);
}

/**
 * Days between two date strings (YYYY-MM-DD).
 */
export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Years between two date strings.
 */
export function yearsBetween(dateA: string, dateB: string): number {
  return daysBetween(dateA, dateB) / 365.25;
}

/**
 * Format a date string as DD MMM YYYY.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Today's date as YYYY-MM-DD.
 */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Annualized return (CAGR) as percentage.
 */
export function calcCAGR(
  invested: number,
  current: number,
  years: number,
): number {
  if (invested <= 0 || years <= 0) return 0;
  return ((current / invested) ** (1 / years) - 1) * 100;
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) using Newton-Raphson.
 * cashflows: array of { amount (negative = outflow/investment), date: YYYY-MM-DD }
 * Returns annualised rate as a percentage (e.g. 12.5 means 12.5%).
 */
export function calcXIRR(
  cashflows: { amount: number; date: string }[],
): number {
  if (cashflows.length < 2) return 0;
  const dates = cashflows.map((c) => new Date(c.date).getTime());
  const t0 = dates[0];
  const years = dates.map((d) => (d - t0) / (365.25 * 24 * 60 * 60 * 1000));

  function npv(rate: number): number {
    return cashflows.reduce((sum, c, i) => {
      return sum + c.amount / (1 + rate) ** years[i];
    }, 0);
  }

  function dnpv(rate: number): number {
    return cashflows.reduce((sum, c, i) => {
      if (years[i] === 0) return sum;
      return sum - (years[i] * c.amount) / (1 + rate) ** (years[i] + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const n = npv(rate);
    const d = dnpv(rate);
    if (Math.abs(d) < 1e-12) break;
    const newRate = rate - n / d;
    if (Math.abs(newRate - rate) < 1e-8) {
      rate = newRate;
      break;
    }
    rate = newRate;
    if (rate <= -1) {
      rate = -0.999;
      break;
    }
  }
  return rate * 100;
}

/**
 * Compounding frequency label to times-per-year number.
 */
export function freqToTimesPerYear(freq: string): number {
  switch (freq) {
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "halfyearly":
      return 2;
    case "annually":
      return 1;
    default:
      return 4;
  }
}
