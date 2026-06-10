export type Profile = "conservador" | "moderado" | "arrojado";
export type PaymentMethod = "avista" | "2a3" | "4a6" | "7a12" | "13a18" | "19a24" | "25a36";

interface DiscountRow {
  minDays: number;
  maxDays: number;
  avista: number;
  "2a3": number;
  "4a6": number;
  "7a12": number;
  "13a18": number;
  "19a24": number;
  "25a36": number;
}

const conservador: DiscountRow[] = [
  { minDays: 0,    maxDays: 30,    avista: 0,  "2a3": 0,  "4a6": 0,  "7a12": 0,  "13a18": 0,  "19a24": 0,  "25a36": 0  },
  { minDays: 31,   maxDays: 90,    avista: 10, "2a3": 7,  "4a6": 6,  "7a12": 4,  "13a18": 3,  "19a24": 2,  "25a36": 1  },
  { minDays: 91,   maxDays: 180,   avista: 19, "2a3": 14, "4a6": 14, "7a12": 10, "13a18": 7,  "19a24": 6,  "25a36": 5  },
  { minDays: 181,  maxDays: 360,   avista: 28, "2a3": 23, "4a6": 22, "7a12": 18, "13a18": 13, "19a24": 12, "25a36": 11 },
  { minDays: 361,  maxDays: 720,   avista: 40, "2a3": 35, "4a6": 33, "7a12": 32, "13a18": 23, "19a24": 23, "25a36": 22 },
  { minDays: 721,  maxDays: 1080,  avista: 46, "2a3": 42, "4a6": 40, "7a12": 39, "13a18": 28, "19a24": 27, "25a36": 26 },
  { minDays: 1081, maxDays: 1440,  avista: 50, "2a3": 47, "4a6": 45, "7a12": 43, "13a18": 32, "19a24": 32, "25a36": 28 },
  { minDays: 1441, maxDays: 99999, avista: 65, "2a3": 63, "4a6": 55, "7a12": 51, "13a18": 46, "19a24": 44, "25a36": 38 },
];

const moderado: DiscountRow[] = [
  { minDays: 0,    maxDays: 30,    avista: 0,  "2a3": 0,  "4a6": 0,  "7a12": 0,  "13a18": 0,  "19a24": 0,  "25a36": 0  },
  { minDays: 31,   maxDays: 90,    avista: 11, "2a3": 8,  "4a6": 7,  "7a12": 4,  "13a18": 3,  "19a24": 2,  "25a36": 1  },
  { minDays: 91,   maxDays: 180,   avista: 21, "2a3": 16, "4a6": 15, "7a12": 11, "13a18": 8,  "19a24": 7,  "25a36": 6  },
  { minDays: 181,  maxDays: 360,   avista: 31, "2a3": 26, "4a6": 24, "7a12": 20, "13a18": 14, "19a24": 13, "25a36": 12 },
  { minDays: 361,  maxDays: 720,   avista: 44, "2a3": 39, "4a6": 37, "7a12": 36, "13a18": 26, "19a24": 25, "25a36": 24 },
  { minDays: 721,  maxDays: 1080,  avista: 51, "2a3": 47, "4a6": 44, "7a12": 43, "13a18": 32, "19a24": 30, "25a36": 29 },
  { minDays: 1081, maxDays: 1440,  avista: 56, "2a3": 52, "4a6": 50, "7a12": 48, "13a18": 36, "19a24": 35, "25a36": 31 },
  { minDays: 1441, maxDays: 99999, avista: 68, "2a3": 66, "4a6": 61, "7a12": 57, "13a18": 48, "19a24": 44, "25a36": 42 },
];

const arrojado: DiscountRow[] = [
  { minDays: 0,    maxDays: 30,    avista: 0,  "2a3": 0,  "4a6": 0,  "7a12": 0,  "13a18": 0,  "19a24": 0,  "25a36": 0  },
  { minDays: 31,   maxDays: 90,    avista: 12, "2a3": 8,  "4a6": 8,  "7a12": 4,  "13a18": 3,  "19a24": 2,  "25a36": 1  },
  { minDays: 91,   maxDays: 180,   avista: 23, "2a3": 18, "4a6": 17, "7a12": 12, "13a18": 9,  "19a24": 8,  "25a36": 7  },
  { minDays: 181,  maxDays: 360,   avista: 34, "2a3": 29, "4a6": 26, "7a12": 22, "13a18": 15, "19a24": 14, "25a36": 13 },
  { minDays: 361,  maxDays: 720,   avista: 48, "2a3": 43, "4a6": 41, "7a12": 40, "13a18": 29, "19a24": 28, "25a36": 26 },
  { minDays: 721,  maxDays: 1080,  avista: 56, "2a3": 52, "4a6": 48, "7a12": 47, "13a18": 35, "19a24": 33, "25a36": 32 },
  { minDays: 1081, maxDays: 1440,  avista: 62, "2a3": 57, "4a6": 55, "7a12": 53, "13a18": 40, "19a24": 39, "25a36": 34 },
  { minDays: 1441, maxDays: 99999, avista: 75, "2a3": 73, "4a6": 66, "7a12": 62, "13a18": 55, "19a24": 52, "25a36": 46 },
];

const tables: Record<Profile, DiscountRow[]> = { conservador, moderado, arrojado };

export function getDiscount(profile: Profile, days: number, method: PaymentMethod): number {
  const table = tables[profile];
  const row = table.find((r) => days >= r.minDays && days <= r.maxDays);
  return row ? row[method] : 0;
}

export function getDaysRange(days: number): string {
  if (days <= 30) return "0 a 30 dias";
  if (days <= 90) return "31 a 90 dias";
  if (days <= 180) return "91 a 180 dias";
  if (days <= 360) return "181 a 360 dias";
  if (days <= 720) return "361 a 720 dias";
  if (days <= 1080) return "721 a 1080 dias";
  if (days <= 1440) return "1081 a 1440 dias";
  return "1441+ dias";
}
