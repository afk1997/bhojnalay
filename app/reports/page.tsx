'use client';

import { useState, useEffect } from 'react';
import { PlateEntry, DailySummary, Rates, DEFAULT_RATES } from '@/lib/types';
import { getPlateEntriesByDateRange, aggregateEntriesToSummary, getRates } from '@/lib/supabase';
import { exportToExcel } from '@/lib/excel';

export default function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [entries, setEntries] = useState<PlateEntry[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
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
    setLoading(false);
  };

  // Calculate totals
  const emptyMealCounts = () => ({ navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 });
  const totals = {
    guest: emptyMealCounts(),
    staff: emptyMealCounts(),
    sevak: emptyMealCounts(),
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
  });

  const guestTotal = totals.guest.navkarshi + totals.guest.lunch + totals.guest.chovihar + totals.guest.tea_coffee + totals.guest.parcel;
  const staffTotal = totals.staff.navkarshi + totals.staff.lunch + totals.staff.chovihar + totals.staff.tea_coffee + totals.staff.parcel;
  const sevakTotal = totals.sevak.navkarshi + totals.sevak.lunch + totals.sevak.chovihar + totals.sevak.tea_coffee + totals.sevak.parcel;

  // Calculate total catering (use default if no entry exists for a day)
  const totalCatering = summaries.reduce((acc, s) => {
    return acc + (s.catering > 0 ? s.catering : rates.catering_staff_default);
  }, 0);

  const grandTotal = guestTotal + staffTotal + sevakTotal + totalCatering;
  const totalAmount =
    totals.guest.navkarshi * rates.navkarshi +
    totals.guest.lunch * rates.lunch +
    totals.guest.chovihar * rates.chovihar +
    totals.guest.tea_coffee * rates.tea_coffee +
    totals.guest.parcel * rates.parcel;

  const handleExport = () => {
    const filename = `bhojnalay_${startDate}_to_${endDate}${guestsOnly ? '_guests_only' : ''}.xlsx`;
    exportToExcel(summaries, rates, filename, guestsOnly);
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
          <div className="text-3xl font-bold">{guestsOnly ? guestTotal : grandTotal}</div>
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
            <span className="font-semibold">{guestTotal} plates</span>
          </div>
          {!guestsOnly && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-blue-600">Staff</span>
                <span className="font-semibold">{staffTotal} plates</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-600">Sevaks</span>
                <span className="font-semibold">{sevakTotal} plates</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Catering Staff</span>
                <span className="font-semibold">{totalCatering} plates</span>
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
                  <th className="px-3 py-3 text-right text-gray-600">Total</th>
                  <th className="px-3 py-3 text-right text-green-600">Amt</th>
                </tr>
                <tr className="text-xs text-gray-400">
                  <th></th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.map((summary) => {
                  const gTotal =
                    summary.guest.navkarshi + summary.guest.lunch + summary.guest.chovihar + summary.guest.tea_coffee + summary.guest.parcel;
                  const sTotal =
                    summary.staff.navkarshi + summary.staff.lunch + summary.staff.chovihar + summary.staff.tea_coffee + summary.staff.parcel;
                  const svTotal =
                    summary.sevak.navkarshi + summary.sevak.lunch + summary.sevak.chovihar + summary.sevak.tea_coffee + summary.sevak.parcel;
                  const cateringForDay = summary.catering > 0 ? summary.catering : rates.catering_staff_default;
                  const rowTotal = gTotal + sTotal + svTotal + cateringForDay;
                  const rowAmount =
                    summary.guest.navkarshi * rates.navkarshi +
                    summary.guest.lunch * rates.lunch +
                    summary.guest.chovihar * rates.chovihar +
                    summary.guest.tea_coffee * rates.tea_coffee +
                    summary.guest.parcel * rates.parcel;

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
                        {guestsOnly ? gTotal : rowTotal}
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
                  <td className="px-3 py-2 text-right">{guestsOnly ? guestTotal : grandTotal}</td>
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
