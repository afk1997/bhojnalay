import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlateEntry, DailySummary, Rates, RateRecord, DEFAULT_RATES, Category, MealType, SpecialDailyRates, DEFAULT_SPECIAL_RATES } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization of Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============ PLATE ENTRIES (New Log-based System) ============

export async function addPlateEntry(
  entry: Omit<PlateEntry, 'id' | 'created_at'>
): Promise<PlateEntry | null> {
  const newEntry: PlateEntry = {
    ...entry,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return addPlateEntryLocal(newEntry);
  }

  const { data, error } = await supabase
    .from('plate_entries')
    .insert(newEntry)
    .select()
    .single();

  if (error) {
    console.error('Error adding plate entry:', error);
    // Fallback to local storage
    return addPlateEntryLocal(newEntry);
  }
  return data;
}

export async function getPlateEntriesByDate(date: string): Promise<PlateEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getPlateEntriesLocalByDate(date);
  }

  const { data, error } = await supabase
    .from('plate_entries')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching plate entries:', error);
    return getPlateEntriesLocalByDate(date);
  }
  return data || [];
}

export async function getPlateEntriesByDateRange(
  startDate: string,
  endDate: string
): Promise<PlateEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getPlateEntriesLocalByDateRange(startDate, endDate);
  }

  const { data, error } = await supabase
    .from('plate_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching plate entries:', error);
    return getPlateEntriesLocalByDateRange(startDate, endDate);
  }
  return data || [];
}

export async function updatePlateEntry(
  id: string,
  updates: Partial<Pick<PlateEntry, 'category' | 'meal_type' | 'count'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return updatePlateEntryLocal(id, updates);
  }

  const { error } = await supabase
    .from('plate_entries')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating plate entry:', error);
    return updatePlateEntryLocal(id, updates);
  }
  return true;
}

export async function deletePlateEntry(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return deletePlateEntryLocal(id);
  }

  const { error } = await supabase
    .from('plate_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting plate entry:', error);
    return deletePlateEntryLocal(id);
  }
  return true;
}

// Aggregate entries into daily summaries for reports
export function aggregateEntriesToSummary(entries: PlateEntry[]): Map<string, DailySummary> {
  const summaries = new Map<string, DailySummary>();

  const emptyMealCounts = () => ({ navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 });

  entries.forEach((entry) => {
    if (!summaries.has(entry.date)) {
      summaries.set(entry.date, {
        date: entry.date,
        guest: emptyMealCounts(),
        staff: emptyMealCounts(),
        sevak: emptyMealCounts(),
        special: emptyMealCounts(),
        catering: 0,
      });
    }

    const summary = summaries.get(entry.date)!;
    if (entry.category === 'catering') {
      // Catering is a single count, not broken down by meal type
      summary.catering += entry.count;
    } else {
      summary[entry.category][entry.meal_type] += entry.count;
    }
  });

  return summaries;
}

// ============ RATES ============

export async function getRates(): Promise<Rates> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getRatesLocal();
  }

  const { data, error } = await supabase.from('rates').select('*');

  if (error || !data || data.length === 0) {
    return getRatesLocal();
  }

  const rates: Rates = { ...DEFAULT_RATES };
  data.forEach((record: RateRecord) => {
    rates[record.meal_type] = record.rate;
  });
  return rates;
}

export async function saveRates(rates: Rates): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return saveRatesLocal(rates);
  }

  const records: RateRecord[] = [
    { meal_type: 'navkarshi', rate: rates.navkarshi },
    { meal_type: 'lunch', rate: rates.lunch },
    { meal_type: 'chovihar', rate: rates.chovihar },
    { meal_type: 'tea_coffee', rate: rates.tea_coffee },
    { meal_type: 'parcel', rate: rates.parcel },
  ];

  const { error } = await supabase
    .from('rates')
    .upsert(records, { onConflict: 'meal_type' });

  if (error) {
    console.error('Error saving rates:', error);
    return saveRatesLocal(rates);
  }
  return true;
}

// ============ SPECIAL DAILY RATES ============

export async function getSpecialRatesForDate(date: string): Promise<SpecialDailyRates | null> {
  // For now, only use local storage for special rates (simpler)
  return getSpecialRatesLocalForDate(date);
}

export async function saveSpecialRatesForDate(
  date: string,
  rates: Omit<SpecialDailyRates, 'date'>
): Promise<boolean> {
  return saveSpecialRatesLocalForDate(date, rates);
}

export async function getSpecialRatesForDateRange(
  startDate: string,
  endDate: string
): Promise<Map<string, SpecialDailyRates>> {
  return getSpecialRatesLocalForDateRange(startDate, endDate);
}

// ============ LOCAL STORAGE FUNCTIONS ============

const PLATE_ENTRIES_KEY = 'bhojnalay_plate_entries';
const RATES_KEY = 'bhojnalay_rates';
const SPECIAL_RATES_KEY = 'bhojnalay_special_daily_rates';

function getLocalPlateEntries(): PlateEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PLATE_ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalPlateEntries(entries: PlateEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLATE_ENTRIES_KEY, JSON.stringify(entries));
}

function addPlateEntryLocal(entry: PlateEntry): PlateEntry {
  const entries = getLocalPlateEntries();
  entries.push(entry);
  saveLocalPlateEntries(entries);
  return entry;
}

function getPlateEntriesLocalByDate(date: string): PlateEntry[] {
  const entries = getLocalPlateEntries();
  return entries
    .filter((e) => e.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getPlateEntriesLocalByDateRange(startDate: string, endDate: string): PlateEntry[] {
  const entries = getLocalPlateEntries();
  return entries
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
}

function updatePlateEntryLocal(
  id: string,
  updates: Partial<Pick<PlateEntry, 'category' | 'meal_type' | 'count'>>
): boolean {
  const entries = getLocalPlateEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return false;
  entries[index] = { ...entries[index], ...updates };
  saveLocalPlateEntries(entries);
  return true;
}

function deletePlateEntryLocal(id: string): boolean {
  const entries = getLocalPlateEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  saveLocalPlateEntries(filtered);
  return true;
}

function getRatesLocal(): Rates {
  if (typeof window === 'undefined') return DEFAULT_RATES;
  const rates = localStorage.getItem(RATES_KEY);
  return rates ? JSON.parse(rates) : DEFAULT_RATES;
}

function saveRatesLocal(rates: Rates): boolean {
  if (typeof window === 'undefined') return false;
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  return true;
}

// Special daily rates local storage functions
function getLocalSpecialRates(): Record<string, SpecialDailyRates> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(SPECIAL_RATES_KEY);
  return data ? JSON.parse(data) : {};
}

function saveLocalSpecialRates(rates: Record<string, SpecialDailyRates>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPECIAL_RATES_KEY, JSON.stringify(rates));
}

function getSpecialRatesLocalForDate(date: string): SpecialDailyRates | null {
  const allRates = getLocalSpecialRates();
  return allRates[date] || null;
}

function saveSpecialRatesLocalForDate(
  date: string,
  rates: Omit<SpecialDailyRates, 'date'>
): boolean {
  const allRates = getLocalSpecialRates();
  allRates[date] = { date, ...rates };
  saveLocalSpecialRates(allRates);
  return true;
}

function getSpecialRatesLocalForDateRange(
  startDate: string,
  endDate: string
): Map<string, SpecialDailyRates> {
  const allRates = getLocalSpecialRates();
  const result = new Map<string, SpecialDailyRates>();

  Object.entries(allRates).forEach(([date, rates]) => {
    if (date >= startDate && date <= endDate) {
      result.set(date, rates);
    }
  });

  return result;
}
