export type PricingRates = {
  web: number; mobile: number; wordpress: number; hybrid: number;
  design: number; maintenance: number; minimum: number;
  complexity: number; urgency: number; vat: number; discount: number;
};

export const DEFAULT_RATES: PricingRates = {
  web: 45, mobile: 50, wordpress: 35, hybrid: 55,
  design: 40, maintenance: 20, minimum: 500,
  complexity: 1, urgency: 1.2, vat: 0, discount: 0,
};

export function rateForType(type: "Web"|"Mobile"|"WordPress"|"Hybrid", rates: PricingRates) {
  return ({ Web: rates.web, Mobile: rates.mobile, WordPress: rates.wordpress, Hybrid: rates.hybrid })[type];
}

export function priceEstimate(hours: number, type: "Web"|"Mobile"|"WordPress"|"Hybrid", rates: PricingRates, complexity = 1) {
  const rate = rateForType(type, rates);
  const base = hours * rate;
  const adjusted = base * complexity * rates.urgency;
  const discounted = adjusted * (1 - rates.discount / 100);
  const final = Math.max(rates.minimum, discounted * (1 + rates.vat / 100));
  return { rate, base, adjusted, discounted, final };
}

export function loadRates(): PricingRates {
  if (typeof window === "undefined") return DEFAULT_RATES;
  try {
    const raw = window.localStorage.getItem("devestimate-pricing-rates");
    return raw ? { ...DEFAULT_RATES, ...JSON.parse(raw) } : DEFAULT_RATES;
  } catch { return DEFAULT_RATES; }
}
