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
  const [count, setCount] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category>('guest');
  const [editMealType, setEditMealType] = useState<MealType>('lunch');
  const [editCount, setEditCount] = useState<number>(1);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
  const summary = {
    guest: { navkarshi: 0, lunch: 0, chovihar: 0 },
    staff: { navkarshi: 0, lunch: 0, chovihar: 0 },
    sevak: { navkarshi: 0, lunch: 0, chovihar: 0 },
  };

  entries.forEach((entry) => {
    summary[entry.category][entry.meal_type] += entry.count;
  });

  const guestTotal = summary.guest.navkarshi + summary.guest.lunch + summary.guest.chovihar;
  const staffTotal = summary.staff.navkarshi + summary.staff.lunch + summary.staff.chovihar;
  const sevakTotal = summary.sevak.navkarshi + summary.sevak.lunch + summary.sevak.chovihar;
  const grandTotal = guestTotal + staffTotal + sevakTotal;

  const totalAmount =
    summary.guest.navkarshi * rates.navkarshi +
    summary.guest.lunch * rates.lunch +
    summary.guest.chovihar * rates.chovihar;

  // Handlers
  const handleAdd = async () => {
    if (count <= 0) return;
    setSaving(true);

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    const entry = await addPlateEntry({
      date,
      time,
      category,
      meal_type: mealType,
      count,
    });

    if (entry) {
      setEntries([...entries, entry]);
      setCount(1); // Reset count
    }
    setSaving(false);
  };

  const handleEdit = (entry: PlateEntry) => {
    setEditingId(entry.id);
    setEditCategory(entry.category);
    setEditMealType(entry.meal_type);
    setEditCount(entry.count);
  };

  const handleSaveEdit = async () => {
    if (!editingId || editCount <= 0) return;

    const success = await updatePlateEntry(editingId, {
      category: editCategory,
      meal_type: editMealType,
      count: editCount,
    });

    if (success) {
      setEntries(
        entries.map((e) =>
          e.id === editingId
            ? { ...e, category: editCategory, meal_type: editMealType, count: editCount }
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
    return cat === 'guest' ? 'Guest' : cat === 'staff' ? 'Staff' : 'Sevak';
  };

  const getMealLabel = (meal: MealType) => {
    return meal === 'navkarshi' ? 'Navkarshi' : meal === 'lunch' ? 'Lunch' : 'Chovihar';
  };

  const getCategoryColor = (cat: Category) => {
    return cat === 'guest'
      ? 'text-orange-600 bg-orange-50'
      : cat === 'staff'
      ? 'text-blue-600 bg-blue-50'
      : 'text-purple-600 bg-purple-50';
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
          <label className="text-xs text-gray-500 mb-1 block">Meal</label>
          <div className="grid grid-cols-3 gap-2">
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
        </div>

        {/* Count Input */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Count</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold text-gray-600"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-bold"
            />
            <button
              onClick={() => setCount(count + 1)}
              className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold text-gray-600"
            >
              +
            </button>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAdd}
          disabled={saving || count <= 0}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        >
          {saving ? 'Adding...' : 'Add Entry'}
        </button>
      </div>

      {/* Entry Log */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-sm font-semibold text-gray-500">
            TODAY'S ENTRIES ({entries.length})
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
                    <div className="grid grid-cols-3 gap-2">
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
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={editCount}
                        onChange={(e) => setEditCount(Math.max(1, parseInt(e.target.value) || 1))}
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

      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">TODAY'S SUMMARY</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-orange-600 font-medium">Guests</span>
            <span>
              N:{summary.guest.navkarshi} L:{summary.guest.lunch} C:{summary.guest.chovihar}
              <strong className="ml-2">= {guestTotal}</strong>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-600 font-medium">Staff</span>
            <span>
              N:{summary.staff.navkarshi} L:{summary.staff.lunch} C:{summary.staff.chovihar}
              <strong className="ml-2">= {staffTotal}</strong>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-600 font-medium">Sevaks</span>
            <span>
              N:{summary.sevak.navkarshi} L:{summary.sevak.lunch} C:{summary.sevak.chovihar}
              <strong className="ml-2">= {sevakTotal}</strong>
            </span>
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
