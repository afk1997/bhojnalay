'use client';

import { useState, useEffect } from 'react';
import { PlateEntry, DailySummary, Rates, DEFAULT_RATES, SpecialDailyRates, getPlateCount } from '@/lib/types';
import { getPlateEntriesByDateRange, aggregateEntriesToSummary, getRates, getSpecialRatesForDateRange } from '@/lib/supabase';
import { exportToExcel } from '@/lib/excel';

export default function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [entries, setEntries] = useState<PlateEntry[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [specialRatesMap, setSpecialRatesMap] = useState<Map<string, SpecialDailyRates>>(new Map());
  const [loading, setLoading] = useState(false);
  const [guestsOnly, setGuestsOnly] = useState(false);

  useEffect(() => {
    getRates().then(setRates);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [startDate, endDate]);

  const loadEntries = async () => {
    setLoading(true);
    const data = await getPlateEntriesByDateRange(startDate, endDate);
    setEntries(data);

    // Aggregate into daily summaries
    const summaryMap = aggregateEntriesToSummary(data);
    const sortedSummaries = Array.from(summaryMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    setSummaries(sortedSummaries);

    // Load special rates for date range
    const specialRates = await getSpecialRatesForDateRange(startDate, endDate);
    setSpecialRatesMap(specialRates);

    setLoading(false);
  };

  // Calculate totals
  const emptyMealCounts = () => ({ navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 });
  const totals = {
    guest: emptyMealCounts(),
    staff: emptyMealCounts(),
    sevak: emptyMealCounts(),
    special: emptyMealCounts(),
  };

  summaries.forEach((summary) => {
    totals.guest.navkarshi += summary.guest.navkarshi;
    totals.guest.lunch += summary.guest.lunch;
    totals.guest.chovihar += summary.guest.chovihar;
    totals.guest.tea_coffee += summary.guest.tea_coffee;
    totals.guest.parcel += summary.guest.parcel;
    totals.staff.navkarshi += summary.staff.navkarshi;
    totals.staff.lunch += summary.staff.lunch;
    totals.staff.chovihar += summary.staff.chovihar;
    totals.staff.tea_coffee += summary.staff.tea_coffee;
    totals.staff.parcel += summary.staff.parcel;
    totals.sevak.navkarshi += summary.sevak.navkarshi;
    totals.sevak.lunch += summary.sevak.lunch;
    totals.sevak.chovihar += summary.sevak.chovihar;
    totals.sevak.tea_coffee += summary.sevak.tea_coffee;
    totals.sevak.parcel += summary.sevak.parcel;
    totals.special.navkarshi += summary.special.navkarshi;
    totals.special.lunch += summary.special.lunch;
    totals.special.chovihar += summary.special.chovihar;
    totals.special.tea_coffee += summary.special.tea_coffee;
    totals.special.parcel += summary.special.parcel;
  });

  // Plate counts (excluding tea_coffee)
  const guestPlates = getPlateCount(totals.guest);
  const staffPlates = getPlateCount(totals.staff);
  const sevakPlates = getPlateCount(totals.sevak);
  const specialPlates = getPlateCount(totals.special);

  // Tea counts
  const guestTea = totals.guest.tea_coffee;
  const staffTea = totals.staff.tea_coffee;
  const sevakTea = totals.sevak.tea_coffee;
  const specialTea = totals.special.tea_coffee;

  // Total counts
  const guestTotal = guestPlates + guestTea;
  const staffTotal = staffPlates + staffTea;
  const sevakTotal = sevakPlates + sevakTea;
  const specialTotal = specialPlates + specialTea;

  // Calculate total catering (use default if no entry exists for a day)
  const totalCatering = summaries.reduce((acc, s) => {
    return acc + (s.catering > 0 ? s.catering : rates.catering_staff_default);
  }, 0);

  // Grand totals
  const totalPlates = guestPlates + staffPlates + sevakPlates + specialPlates + totalCatering;
  const totalTeaCoffee = guestTea + staffTea + sevakTea + specialTea;
  const grandTotal = totalPlates + totalTeaCoffee;

  // Guest amount (global rates)
  const guestAmount =
    totals.guest.navkarshi * rates.navkarshi +
    totals.guest.lunch * rates.lunch +
    totals.guest.chovihar * rates.chovihar +
    totals.guest.tea_coffee * rates.tea_coffee +
    totals.guest.parcel * rates.parcel;

  // Special amount (sum of daily rates)
  const specialAmount = summaries.reduce((acc, summary) => {
    const dailyRates = specialRatesMap.get(summary.date) || { navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 };
    return acc +
      summary.special.navkarshi * dailyRates.navkarshi +
      summary.special.lunch * dailyRates.lunch +
      summary.special.chovihar * dailyRates.chovihar +
      summary.special.tea_coffee * dailyRates.tea_coffee +
      summary.special.parcel * dailyRates.parcel;
  }, 0);

  const totalAmount = guestAmount + specialAmount;

  const handleExport = () => {
    const filename = `bhojnalay_${startDate}_to_${endDate}${guestsOnly ? '_guests_only' : ''}.xlsx`;
    exportToExcel(summaries, rates, specialRatesMap, filename, guestsOnly);
  };

  const formatDate = (dateStr: string) => {
    // Parse YYYY-MM-DD directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Reports
      </h1>
      <p className="text-center text-gray-500 mb-6">
        View and export plate count data
      </p>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 no-print">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={guestsOnly}
            onChange={(e) => setGuestsOnly(e.target.checked)}
            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">Show Guests Only (Paid)</span>
        </label>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="text-orange-100 text-sm">{guestsOnly ? 'Guest Plates' : 'Total Plates'}</div>
          <div className="text-3xl font-bold">{guestsOnly ? guestPlates : totalPlates}</div>
          <div className="text-orange-200 text-sm">+ {guestsOnly ? guestTea : totalTeaCoffee} Tea/Coffee</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-green-100 text-sm">Total Amount</div>
          <div className="text-3xl font-bold">₹{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-gray-700 mb-3">Category Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-orange-600">Guests</span>
            <span className="text-sm">{guestPlates} plates + {guestTea} tea</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pink-600">Special</span>
            <span className="text-sm">{specialPlates} plates + {specialTea} tea</span>
          </div>
          {!guestsOnly && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-blue-600">Staff</span>
                <span className="text-sm">{staffPlates} plates + {staffTea} tea</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-600">Sevaks</span>
                <span className="text-sm">{sevakPlates} plates + {sevakTea} tea</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Catering Staff</span>
                <span className="font-semibold">{totalCatering}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={summaries.length === 0}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors mb-4 no-print"
      >
        Download Excel Report
      </button>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : summaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No data found for selected date range
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-gray-600">Date</th>
                  <th className="px-3 py-3 text-center text-orange-600" colSpan={5}>
                    Guests
                  </th>
                  <th className="px-3 py-3 text-center text-pink-600" colSpan={5}>
                    Special
                  </th>
                  {!guestsOnly && (
                    <>
                      <th className="px-3 py-3 text-center text-blue-600" colSpan={5}>
                        Staff
                      </th>
                      <th className="px-3 py-3 text-center text-purple-600" colSpan={5}>
                        Sevaks
                      </th>
                      <th className="px-3 py-3 text-center text-gray-600">
                        Cat
                      </th>
                    </>
                  )}
                  <th className="px-3 py-3 text-right text-gray-600">Plates</th>
                  <th className="px-3 py-3 text-right text-teal-600">Tea</th>
                  <th className="px-3 py-3 text-right text-green-600">Amt</th>
                </tr>
                <tr className="text-xs text-gray-400">
                  <th></th>
                  <th className="px-1">N</th>
                  <th className="px-1">L</th>
                  <th className="px-1">C</th>
                  <th className="px-1">T</th>
                  <th className="px-1">P</th>
                  <th className="px-1">N</th>
                  <th className="px-1">L</th>
                  <th className="px-1">C</th>
                  <th className="px-1">T</th>
                  <th className="px-1">P</th>
                  {!guestsOnly && (
                    <>
                      <th className="px-1">N</th>
                      <th className="px-1">L</th>
                      <th className="px-1">C</th>
                      <th className="px-1">T</th>
                      <th className="px-1">P</th>
                      <th className="px-1">N</th>
                      <th className="px-1">L</th>
                      <th className="px-1">C</th>
                      <th className="px-1">T</th>
                      <th className="px-1">P</th>
                      <th className="px-1"></th>
                    </>
                  )}
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.map((summary) => {
                  // Plate counts (excluding tea_coffee)
                  const gPlates = getPlateCount(summary.guest);
                  const spPlates = getPlateCount(summary.special);
                  const sPlates = getPlateCount(summary.staff);
                  const svPlates = getPlateCount(summary.sevak);
                  const cateringForDay = summary.catering > 0 ? summary.catering : rates.catering_staff_default;

                  // Tea counts
                  const gTea = summary.guest.tea_coffee;
                  const spTea = summary.special.tea_coffee;
                  const sTea = summary.staff.tea_coffee;
                  const svTea = summary.sevak.tea_coffee;

                  // Row totals
                  const rowPlates = gPlates + spPlates + sPlates + svPlates + cateringForDay;
                  const rowTea = gTea + spTea + sTea + svTea;
                  const guestsOnlyPlates = gPlates + spPlates;
                  const guestsOnlyTea = gTea + spTea;

                  // Guest amount (global rates)
                  const guestRowAmount =
                    summary.guest.navkarshi * rates.navkarshi +
                    summary.guest.lunch * rates.lunch +
                    summary.guest.chovihar * rates.chovihar +
                    summary.guest.tea_coffee * rates.tea_coffee +
                    summary.guest.parcel * rates.parcel;

                  // Special amount (daily rates)
                  const dailyRates = specialRatesMap.get(summary.date) || { navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 };
                  const specialRowAmount =
                    summary.special.navkarshi * dailyRates.navkarshi +
                    summary.special.lunch * dailyRates.lunch +
                    summary.special.chovihar * dailyRates.chovihar +
                    summary.special.tea_coffee * dailyRates.tea_coffee +
                    summary.special.parcel * dailyRates.parcel;

                  const rowAmount = guestRowAmount + specialRowAmount;

                  return (
                    <tr key={summary.date} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">
                        {formatDate(summary.date)}
                      </td>
                      <td className="px-1 py-2 text-center text-orange-600">
                        {summary.guest.navkarshi}
                      </td>
                      <td className="px-1 py-2 text-center text-orange-600">
                        {summary.guest.lunch}
                      </td>
                      <td className="px-1 py-2 text-center text-orange-600">
                        {summary.guest.chovihar}
                      </td>
                      <td className="px-1 py-2 text-center text-orange-600">
                        {summary.guest.tea_coffee}
                      </td>
                      <td className="px-1 py-2 text-center text-orange-600">
                        {summary.guest.parcel}
                      </td>
                      <td className="px-1 py-2 text-center text-pink-600">
                        {summary.special.navkarshi}
                      </td>
                      <td className="px-1 py-2 text-center text-pink-600">
                        {summary.special.lunch}
                      </td>
                      <td className="px-1 py-2 text-center text-pink-600">
                        {summary.special.chovihar}
                      </td>
                      <td className="px-1 py-2 text-center text-pink-600">
                        {summary.special.tea_coffee}
                      </td>
                      <td className="px-1 py-2 text-center text-pink-600">
                        {summary.special.parcel}
                      </td>
                      {!guestsOnly && (
                        <>
                          <td className="px-1 py-2 text-center text-blue-600">
                            {summary.staff.navkarshi}
                          </td>
                          <td className="px-1 py-2 text-center text-blue-600">
                            {summary.staff.lunch}
                          </td>
                          <td className="px-1 py-2 text-center text-blue-600">
                            {summary.staff.chovihar}
                          </td>
                          <td className="px-1 py-2 text-center text-blue-600">
                            {summary.staff.tea_coffee}
                          </td>
                          <td className="px-1 py-2 text-center text-blue-600">
                            {summary.staff.parcel}
                          </td>
                          <td className="px-1 py-2 text-center text-purple-600">
                            {summary.sevak.navkarshi}
                          </td>
                          <td className="px-1 py-2 text-center text-purple-600">
                            {summary.sevak.lunch}
                          </td>
                          <td className="px-1 py-2 text-center text-purple-600">
                            {summary.sevak.chovihar}
                          </td>
                          <td className="px-1 py-2 text-center text-purple-600">
                            {summary.sevak.tea_coffee}
                          </td>
                          <td className="px-1 py-2 text-center text-purple-600">
                            {summary.sevak.parcel}
                          </td>
                          <td className="px-1 py-2 text-center text-gray-600">
                            {cateringForDay}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right font-semibold">
                        {guestsOnly ? guestsOnlyPlates : rowPlates}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-teal-600">
                        {guestsOnly ? guestsOnlyTea : rowTea}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600">
                        ₹{rowAmount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-1 py-2 text-center">{totals.guest.navkarshi}</td>
                  <td className="px-1 py-2 text-center">{totals.guest.lunch}</td>
                  <td className="px-1 py-2 text-center">{totals.guest.chovihar}</td>
                  <td className="px-1 py-2 text-center">{totals.guest.tea_coffee}</td>
                  <td className="px-1 py-2 text-center">{totals.guest.parcel}</td>
                  <td className="px-1 py-2 text-center">{totals.special.navkarshi}</td>
                  <td className="px-1 py-2 text-center">{totals.special.lunch}</td>
                  <td className="px-1 py-2 text-center">{totals.special.chovihar}</td>
                  <td className="px-1 py-2 text-center">{totals.special.tea_coffee}</td>
                  <td className="px-1 py-2 text-center">{totals.special.parcel}</td>
                  {!guestsOnly && (
                    <>
                      <td className="px-1 py-2 text-center">{totals.staff.navkarshi}</td>
                      <td className="px-1 py-2 text-center">{totals.staff.lunch}</td>
                      <td className="px-1 py-2 text-center">{totals.staff.chovihar}</td>
                      <td className="px-1 py-2 text-center">{totals.staff.tea_coffee}</td>
                      <td className="px-1 py-2 text-center">{totals.staff.parcel}</td>
                      <td className="px-1 py-2 text-center">{totals.sevak.navkarshi}</td>
                      <td className="px-1 py-2 text-center">{totals.sevak.lunch}</td>
                      <td className="px-1 py-2 text-center">{totals.sevak.chovihar}</td>
                      <td className="px-1 py-2 text-center">{totals.sevak.tea_coffee}</td>
                      <td className="px-1 py-2 text-center">{totals.sevak.parcel}</td>
                      <td className="px-1 py-2 text-center">{totalCatering}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right">{guestsOnly ? guestPlates + specialPlates : totalPlates}</td>
                  <td className="px-3 py-2 text-right text-teal-600">{guestsOnly ? guestTea + specialTea : totalTeaCoffee}</td>
                  <td className="px-3 py-2 text-right text-green-600">
                    ₹{totalAmount}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={() => window.print()}
        className="w-full py-3 mt-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors no-print"
      >
        Print Report
      </button>
    </div>
  );
}
