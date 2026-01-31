// New individual plate entry (for log-based system)
export type Category = 'guest' | 'staff' | 'sevak' | 'catering';
export type MealType = 'navkarshi' | 'lunch' | 'chovihar' | 'tea_coffee' | 'parcel';

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
export interface MealCounts {
  navkarshi: number;
  lunch: number;
  chovihar: number;
  tea_coffee: number;
  parcel: number;
}

export interface DailySummary {
  date: string;
  guest: MealCounts;
  staff: MealCounts;
  sevak: MealCounts;
  catering: number;  // Single count for catering staff (no meal breakdown)
}

export interface Rates {
  navkarshi: number;
  lunch: number;
  chovihar: number;
  tea_coffee: number;
  parcel: number;
  catering_staff_default: number;
}

export interface RateRecord {
  id?: string;
  meal_type: MealType;
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
  tea_coffee: 20,
  parcel: 30,
  catering_staff_default: 10,
};
