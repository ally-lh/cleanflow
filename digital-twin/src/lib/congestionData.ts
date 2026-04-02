// Ported from src/components/admin/analytics/CongestionPanel.tsx
// Static congestion configuration for Singapore postal districts.

export interface DistrictCongestion {
  code: string;
  orders: number;
  dist: number;
  risk: "High" | "Medium" | "Low";
  factor: number;
  window: string;
  expressway: string;
}

export const DISTRICT_CONFIG: DistrictCongestion[] = [
  { code: "33", orders: 60, dist: 3.884,  risk: "High",   factor: 1.72, window: "Before 8 am or after 7 pm", expressway: "AYE / CTE" },
  { code: "21", orders: 37, dist: 3.692,  risk: "High",   factor: 1.68, window: "Before 8 am or after 7 pm", expressway: "AYE / PIE" },
  { code: "38", orders: 35, dist: 4.801,  risk: "Medium", factor: 1.48, window: "9–11 am or 2–4 pm",         expressway: "CTE / SLE" },
  { code: "20", orders: 24, dist: 3.569,  risk: "High",   factor: 1.65, window: "Before 8 am or after 7 pm", expressway: "AYE"       },
  { code: "36", orders: 15, dist: 5.14,   risk: "Medium", factor: 1.45, window: "9–11 am or 2–4 pm",         expressway: "PIE"       },
  { code: "19", orders: 15, dist: 3.306,  risk: "Medium", factor: 1.42, window: "9–11 am or 3–5 pm",         expressway: "BKE / PIE" },
  { code: "52", orders: 10, dist: 13.44,  risk: "Low",    factor: 1.28, window: "Any off-peak",               expressway: "TPE / ECP" },
  { code: "35", orders: 8,  dist: 5.16,   risk: "Medium", factor: 1.44, window: "9–11 am or 2–4 pm",         expressway: "CTE"       },
  { code: "73", orders: 6,  dist: 15.56,  risk: "Low",    factor: 1.25, window: "Any off-peak",               expressway: "SLE"       },
  { code: "64", orders: 6,  dist: 14.58,  risk: "Medium", factor: 1.43, window: "9–11 am or 2–4 pm",         expressway: "ECP"       },
  { code: "65", orders: 5,  dist: 10.46,  risk: "Medium", factor: 1.40, window: "9–11 am or 2–4 pm",         expressway: "KPE / PIE" },
  { code: "12", orders: 4,  dist: 7.47,   risk: "Medium", factor: 1.46, window: "9–11 am or 2–4 pm",         expressway: "CTE"       },
  { code: "76", orders: 4,  dist: 13.87,  risk: "Low",    factor: 1.30, window: "Any off-peak",               expressway: "ECP"       },
  { code: "82", orders: 2,  dist: 13.51,  risk: "Low",    factor: 1.27, window: "Any off-peak",               expressway: "TPE"       },
  { code: "57", orders: 1,  dist: 5.44,   risk: "Medium", factor: 1.50, window: "9–11 am or 2–4 pm",         expressway: "AYE"       },
];

// 18 values, one per hour from 5 am to 10 pm.
export const HOURS = [
  "5am","6am","7am","8am","9am","10am","11am","12pm",
  "1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm",
];
export const CONGESTION_IDX = [
  1.05, 1.10, 1.35, 1.80, 1.55, 1.25, 1.15, 1.30,
  1.40, 1.25, 1.35, 1.55, 1.70, 1.85, 1.50, 1.20, 1.10, 1.05,
];

export const RISK_COLORS: Record<string, string> = {
  High:   "#ef4444",
  Medium: "#f59e0b",
  Low:    "#14b8a6",
};
