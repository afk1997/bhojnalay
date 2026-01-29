// New individual plate entry (for log-based system)
export type Category = 'guest' | 'staff' | 'sevak';
export type MealType = 'navkarshi' | 'lunch' | 'chovihar';

export interface PlateEntry {
  id: string;
  date: string;
  time: string;
  category: Category;
  meal_type: MealType;
  count: number;
  created_at?: string;
}

// Legacy daily summary (kept for backward compatibility)
export interface DailyEntry {
  id?: string;
  date: string;
  guest_navkarshi: number;
  guest_lunch: number;
  guest_chovihar: number;
  staff_navkarshi: number;
  staff_lunch: number;
  staff_chovihar: number;
  sevak_navkarshi: number;
  sevak_lunch: number;
  sevak_chovihar: number;
  created_at?: string;
}

// Aggregated summary calculated from PlateEntries
export interface DailySummary {
  date: string;
  guest: { navkarshi: number; lunch: number; chovihar: number };
  staff: { navkarshi: number; lunch: number; chovihar: number };
  sevak: { navkarshi: number; lunch: number; chovihar: number };
}

export interface Rates {
  navkarshi: number;
  lunch: number;
  chovihar: number;
}

export interface RateRecord {
  id?: string;
  meal_type: 'navkarshi' | 'lunch' | 'chovihar';
  rate: number;
  updated_at?: string;
}

export interface EntryFormData {
  date: string;
  guests: {
    navkarshi: number;
    lunch: number;
    chovihar: number;
  };
  staff: {
    navkarshi: number;
    lunch: number;
    chovihar: number;
  };
  sevaks: {
    navkarshi: number;
    lunch: number;
    chovihar: number;
  };
}

export const DEFAULT_RATES: Rates = {
  navkarshi: 50,
  lunch: 100,
  chovihar: 50,
};
