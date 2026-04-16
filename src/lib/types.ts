// === API Response ===

export interface PriceResponse {
  success: boolean;
  data: PriceData;
}

export interface PriceData {
  date: string;
  zone: string;
  currency: string;
  unit: string;
  source: string;
  prices: HourlyPrice[];
  highlights: Highlights;
}

export interface HourlyPrice {
  hour: string; // "14:00-15:00"
  price: number; // 0.0433
  color: 'green' | 'orange' | 'red';
}

export interface Highlights {
  average: number;
  min: HourlyPrice;
  max: HourlyPrice;
  current: HourlyPrice;
}

// === Appliances ===

export interface Appliance {
  id: string;
  name: string;
  icon: string;
  durationHours: number;
  isCustom: boolean;
}

export interface ApplianceWindow {
  appliance: Appliance;
  startHour: number; // 14
  endHour: number; // 16
  avgPrice: number; // 0.0437
  savings: number; // % savings vs worst window
}
