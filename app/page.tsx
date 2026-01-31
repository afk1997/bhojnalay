'use client';

import { useState, useEffect, Suspense } from 'react';
import { PlateEntry, Rates, DEFAULT_RATES, Category, MealType } from '@/lib/types';
import {
  addPlateEntry,
  getPlateEntriesByDate,
  updatePlateEntry,
  deletePlateEntry,
  getRates,
} from '@/lib/supabase';

function HomePageContent() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [entries, setEntries] = useState<PlateEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [category, setCategory] = useState<Category>('guest');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [count, setCount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category>('guest');
  const [editMealType, setEditMealType] = useState<MealType>('lunch');
  const [editCount, setEditCount] = useState<string>('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // View mode: 'log' or 'summary'
  const [viewMode, setViewMode] = useState<'log' | 'summary'>('log');

  // Summary edit state
  const [summaryEdits, setSummaryEdits] = useState<Record<string, string>>({});

  // Load data
  useEffect(() => {
    getRates().then(setRates);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [date]);

  const loadEntries = async () => {
    setLoading(true);
    const data = await getPlateEntriesByDate(date);
    setEntries(data);
    setLoading(false);
  };

  // Calculate summary
  const emptyMealCounts = () => ({ navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 });
  const summary = {
    guest: emptyMealCounts(),
    staff: emptyMealCounts(),
    sevak: emptyMealCounts(),
    catering: 0,
  };

  entries.forEach((entry) => {
    if (entry.category === 'catering') {
      summary.catering += entry.count;
    } else {
      summary[entry.category][entry.meal_type] += entry.count;
    }
  });

  // Use default catering if no catering entry exists for this day
  const hasCateringEntry = entries.some(e => e.category === 'catering');
  const cateringCount = hasCateringEntry ? summary.catering : rates.catering_staff_default;

  const guestTotal = summary.guest.navkarshi + summary.guest.lunch + summary.guest.chovihar + summary.guest.tea_coffee + summary.guest.parcel;
  const staffTotal = summary.staff.navkarshi + summary.staff.lunch + summary.staff.chovihar + summary.staff.tea_coffee + summary.staff.parcel;
  const sevakTotal = summary.sevak.navkarshi + summary.sevak.lunch + summary.sevak.chovihar + summary.sevak.tea_coffee + summary.sevak.parcel;
  const grandTotal = guestTotal + staffTotal + sevakTotal + cateringCount;

  const totalAmount =
    summary.guest.navkarshi * rates.navkarshi +
    summary.guest.lunch * rates.lunch +
    summary.guest.chovihar * rates.chovihar +
    summary.guest.tea_coffee * rates.tea_coffee +
    summary.guest.parcel * rates.parcel;

  // Handlers
  const handleAdd = async () => {
    const countNum = parseInt(count) || 0;
    if (countNum <= 0) return;
    setSaving(true);

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    const entry = await addPlateEntry({
      date,
      time,
      category,
      meal_type: mealType,
      count: countNum,
    });

    if (entry) {
      setEntries([...entries, entry]);
      setCount(''); // Reset count to empty
    }
    setSaving(false);
  };

  const handleEdit = (entry: PlateEntry) => {
    setEditingId(entry.id);
    setEditCategory(entry.category);
    setEditMealType(entry.meal_type);
    setEditCount(entry.count.toString());
  };

  const handleSaveEdit = async () => {
    const editCountNum = parseInt(editCount) || 0;
    if (!editingId || editCountNum <= 0) return;

    const success = await updatePlateEntry(editingId, {
      category: editCategory,
      meal_type: editMealType,
      count: editCountNum,
    });

    if (success) {
      setEntries(
        entries.map((e) =>
          e.id === editingId
            ? { ...e, category: editCategory, meal_type: editMealType, count: editCountNum }
            : e
        )
      );
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deletePlateEntry(id);
    if (success) {
      setEntries(entries.filter((e) => e.id !== id));
      setDeleteConfirm(null);
    }
  };

  const getCategoryLabel = (cat: Category) => {
    const labels: Record<Category, string> = {
      guest: 'Guest',
      staff: 'Staff',
      sevak: 'Sevak',
      catering: 'Catering',
    };
    return labels[cat];
  };

  const getMealLabel = (meal: MealType) => {
    const labels: Record<MealType, string> = {
      navkarshi: 'Navkarshi',
      lunch: 'Lunch',
      chovihar: 'Chovihar',
      tea_coffee: 'Tea/Coffee',
      parcel: 'Parcel',
    };
    return labels[meal];
  };

  // Helper to format date without timezone issues
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const getCategoryColor = (cat: Category) => {
    const colors: Record<Category, string> = {
      guest: 'text-orange-600 bg-orange-50',
      staff: 'text-blue-600 bg-blue-50',
      sevak: 'text-purple-600 bg-purple-50',
      catering: 'text-gray-600 bg-gray-100',
    };
    return colors[cat];
  };

  // Handle saving catering count
  const handleSaveCatering = async (newCount: number) => {
    if (newCount < 0) return;
    setSaving(true);

    // Find existing catering entry for this date
    const existingCatering = entries.find(e => e.category === 'catering');

    if (existingCatering) {
      // Update existing entry
      const success = await updatePlateEntry(existingCatering.id, { count: newCount });
      if (success) {
        setEntries(entries.map(e =>
          e.id === existingCatering.id ? { ...e, count: newCount } : e
        ));
      }
    } else {
      // Create new catering entry
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);
      const entry = await addPlateEntry({
        date,
        time,
        category: 'catering',
        meal_type: 'lunch', // placeholder, not used for catering
        count: newCount,
      });
      if (entry) {
        setEntries([...entries, entry]);
      }
    }
    setSaving(false);
  };

  // Handle summary cell edit
  const handleSummaryEdit = async (cat: 'guest' | 'staff' | 'sevak', meal: MealType, newValue: number) => {
    if (newValue < 0) return;

    const currentValue = summary[cat][meal];
    const diff = newValue - currentValue;

    if (diff === 0) return;

    setSaving(true);

    if (diff > 0) {
      // Add new entry for the difference
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);
      const entry = await addPlateEntry({
        date,
        time,
        category: cat,
        meal_type: meal,
        count: diff,
      });
      if (entry) {
        setEntries([...entries, entry]);
      }
    } else {
      // Need to reduce - find entries to modify/delete
      let remaining = Math.abs(diff);
      const matchingEntries = entries.filter(e => e.category === cat && e.meal_type === meal);
      const updatedEntries = [...entries];
      const entriesToDelete: string[] = [];

      for (const entry of matchingEntries) {
        if (remaining <= 0) break;

        if (entry.count <= remaining) {
          // Delete this entry entirely
          entriesToDelete.push(entry.id);
          remaining -= entry.count;
        } else {
          // Reduce this entry
          const newCount = entry.count - remaining;
          await updatePlateEntry(entry.id, { count: newCount });
          const idx = updatedEntries.findIndex(e => e.id === entry.id);
          if (idx !== -1) {
            updatedEntries[idx] = { ...updatedEntries[idx], count: newCount };
          }
          remaining = 0;
        }
      }

      // Delete entries marked for deletion
      for (const id of entriesToDelete) {
        await deletePlateEntry(id);
      }

      setEntries(updatedEntries.filter(e => !entriesToDelete.includes(e.id)));
    }

    setSaving(false);
    setSummaryEdits({});
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-orange-600 mb-4">
        Bhojnalay Plate Count
      </h1>

      {/* Date Picker */}
      <div className="mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center font-medium"
        />
      </div>

      {/* Add Entry Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ADD NEW ENTRY</h2>

        {/* Category Selection */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {(['guest', 'staff', 'sevak'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  category === cat
                    ? cat === 'guest'
                      ? 'bg-orange-500 text-white'
                      : cat === 'staff'
                      ? 'bg-blue-500 text-white'
                      : 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Meal Selection */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Item</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(['navkarshi', 'lunch', 'chovihar'] as MealType[]).map((meal) => (
              <button
                key={meal}
                onClick={() => setMealType(meal)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mealType === meal
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getMealLabel(meal)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['tea_coffee', 'parcel'] as MealType[]).map((meal) => (
              <button
                key={meal}
                onClick={() => setMealType(meal)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  mealType === meal
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getMealLabel(meal)}
              </button>
            ))}
          </div>
        </div>

        {/* Count Input */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Count</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(String(Math.max(0, (parseInt(count) || 0) - 1)))}
              className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold text-gray-600"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="0"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-bold"
            />
            <button
              onClick={() => setCount(String((parseInt(count) || 0) + 1))}
              className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold text-gray-600"
            >
              +
            </button>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAdd}
          disabled={saving || (parseInt(count) || 0) <= 0}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        >
          {saving ? 'Adding...' : 'Add Entry'}
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('log')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'log'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Entry Log
        </button>
        <button
          onClick={() => setViewMode('summary')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'summary'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Edit Summary
        </button>
      </div>

      {/* Summary Edit View */}
      {viewMode === 'summary' && (
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-500">
              EDIT SUMMARY FOR {formatDate(date)}
            </h2>
          </div>
          <div className="p-4">
            {/* Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-gray-500 text-center">
              <div></div>
              <div>N</div>
              <div>L</div>
              <div>C</div>
              <div>T</div>
              <div>P</div>
              <div>Total</div>
            </div>
            {/* Guest Row */}
            <div className="grid grid-cols-7 gap-1 mb-2 items-center">
              <div className="text-orange-600 font-medium text-sm">Guest</div>
              {(['navkarshi', 'lunch', 'chovihar', 'tea_coffee', 'parcel'] as MealType[]).map((meal) => (
                <input
                  key={`guest-${meal}`}
                  type="number"
                  min="0"
                  value={summaryEdits[`guest-${meal}`] ?? summary.guest[meal]}
                  onChange={(e) => setSummaryEdits({ ...summaryEdits, [`guest-${meal}`]: e.target.value })}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val !== summary.guest[meal]) {
                      handleSummaryEdit('guest', meal, val);
                    }
                  }}
                  className="w-full px-1 py-1 border rounded text-center text-sm"
                />
              ))}
              <div className="text-center font-semibold text-sm">{guestTotal}</div>
            </div>
            {/* Staff Row */}
            <div className="grid grid-cols-7 gap-1 mb-2 items-center">
              <div className="text-blue-600 font-medium text-sm">Staff</div>
              {(['navkarshi', 'lunch', 'chovihar', 'tea_coffee', 'parcel'] as MealType[]).map((meal) => (
                <input
                  key={`staff-${meal}`}
                  type="number"
                  min="0"
                  value={summaryEdits[`staff-${meal}`] ?? summary.staff[meal]}
                  onChange={(e) => setSummaryEdits({ ...summaryEdits, [`staff-${meal}`]: e.target.value })}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val !== summary.staff[meal]) {
                      handleSummaryEdit('staff', meal, val);
                    }
                  }}
                  className="w-full px-1 py-1 border rounded text-center text-sm"
                />
              ))}
              <div className="text-center font-semibold text-sm">{staffTotal}</div>
            </div>
            {/* Sevak Row */}
            <div className="grid grid-cols-7 gap-1 mb-2 items-center">
              <div className="text-purple-600 font-medium text-sm">Sevak</div>
              {(['navkarshi', 'lunch', 'chovihar', 'tea_coffee', 'parcel'] as MealType[]).map((meal) => (
                <input
                  key={`sevak-${meal}`}
                  type="number"
                  min="0"
                  value={summaryEdits[`sevak-${meal}`] ?? summary.sevak[meal]}
                  onChange={(e) => setSummaryEdits({ ...summaryEdits, [`sevak-${meal}`]: e.target.value })}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val !== summary.sevak[meal]) {
                      handleSummaryEdit('sevak', meal, val);
                    }
                  }}
                  className="w-full px-1 py-1 border rounded text-center text-sm"
                />
              ))}
              <div className="text-center font-semibold text-sm">{sevakTotal}</div>
            </div>
            {/* Catering Row */}
            <div className="grid grid-cols-7 gap-1 mb-2 items-center border-t pt-2">
              <div className="text-gray-600 font-medium text-sm">Catering</div>
              <div className="col-span-5">
                <input
                  type="number"
                  min="0"
                  value={summaryEdits['catering'] ?? cateringCount}
                  onChange={(e) => setSummaryEdits({ ...summaryEdits, catering: e.target.value })}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val !== cateringCount) {
                      handleSaveCatering(val);
                    }
                  }}
                  className="w-20 px-2 py-1 border rounded text-center text-sm"
                />
                <span className="text-xs text-gray-400 ml-2">
                  (Default: {rates.catering_staff_default})
                </span>
              </div>
              <div className="text-center font-semibold text-sm">{cateringCount}</div>
            </div>
            {/* Totals */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Grand Total</span>
                <span className="font-bold">{grandTotal} plates</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 mt-1">
                <span className="font-medium">Amount (Guests only)</span>
                <span className="font-bold">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Log */}
      {viewMode === 'log' && (
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-sm font-semibold text-gray-500">
            {date === today
              ? `TODAY'S ENTRIES (${entries.length})`
              : `ENTRIES FOR ${formatDate(date)} (${entries.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No entries yet. Add your first entry above.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {entries.map((entry, index) => (
              <div key={entry.id} className="px-4 py-3">
                {editingId === entry.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(['guest', 'staff', 'sevak'] as Category[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setEditCategory(cat)}
                          className={`py-1 px-2 rounded text-xs font-medium ${
                            editCategory === cat
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getCategoryLabel(cat)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1 mb-1">
                      {(['navkarshi', 'lunch', 'chovihar'] as MealType[]).map((meal) => (
                        <button
                          key={meal}
                          onClick={() => setEditMealType(meal)}
                          className={`py-1 px-2 rounded text-xs font-medium ${
                            editMealType === meal
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getMealLabel(meal)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      {(['tea_coffee', 'parcel'] as MealType[]).map((meal) => (
                        <button
                          key={meal}
                          onClick={() => setEditMealType(meal)}
                          className={`py-1 px-2 rounded text-xs font-medium ${
                            editMealType === meal
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getMealLabel(meal)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={editCount}
                        onChange={(e) => setEditCount(e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1 border rounded text-center"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 py-1 bg-green-500 text-white rounded text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-10">
                        {entry.time}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                          entry.category
                        )}`}
                      >
                        {getCategoryLabel(entry.category)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getMealLabel(entry.meal_type)}
                      </span>
                      <span className="text-lg font-bold">{entry.count}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          {date === today ? "TODAY'S SUMMARY" : `SUMMARY FOR ${formatDate(date)}`}
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-orange-600 font-medium">Guests</span>
            <span className="text-xs">
              N:{summary.guest.navkarshi} L:{summary.guest.lunch} C:{summary.guest.chovihar} T:{summary.guest.tea_coffee} P:{summary.guest.parcel}
              <strong className="ml-1">= {guestTotal}</strong>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-600 font-medium">Staff</span>
            <span className="text-xs">
              N:{summary.staff.navkarshi} L:{summary.staff.lunch} C:{summary.staff.chovihar} T:{summary.staff.tea_coffee} P:{summary.staff.parcel}
              <strong className="ml-1">= {staffTotal}</strong>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-600 font-medium">Sevaks</span>
            <span className="text-xs">
              N:{summary.sevak.navkarshi} L:{summary.sevak.lunch} C:{summary.sevak.chovihar} T:{summary.sevak.tea_coffee} P:{summary.sevak.parcel}
              <strong className="ml-1">= {sevakTotal}</strong>
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600 font-medium">Catering Staff</span>
            <span className="font-semibold">{cateringCount}</span>
          </div>
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
        <div className="flex justify-between items-center mb-2">
          <span className="text-orange-100">Total Plates</span>
          <span className="text-2xl font-bold">{grandTotal}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-orange-100">Amount (Guests only)</span>
          <span className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Entry?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this entry? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
