import * as XLSX from 'xlsx';
import { DailySummary, Rates, SpecialDailyRates, getPlateCount } from './types';

export function exportToExcel(
  summaries: DailySummary[],
  rates: Rates,
  specialRatesMap: Map<string, SpecialDailyRates>,
  filename: string,
  guestsOnly: boolean = false
) {
  const data = summaries.map((summary) => {
    const guestPlates = getPlateCount(summary.guest);
    const guestTea = summary.guest.tea_coffee;
    const guestTotal = guestPlates + guestTea;

    const specialPlates = getPlateCount(summary.special);
    const specialTea = summary.special.tea_coffee;
    const specialTotal = specialPlates + specialTea;

    // Guest amount (global rates)
    const guestAmt =
      summary.guest.navkarshi * rates.navkarshi +
      summary.guest.lunch * rates.lunch +
      summary.guest.chovihar * rates.chovihar +
      summary.guest.tea_coffee * rates.tea_coffee +
      summary.guest.parcel * rates.parcel;

    // Special amount (daily rates)
    const dailyRates = specialRatesMap.get(summary.date) || { navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 };
    const specialAmt =
      summary.special.navkarshi * dailyRates.navkarshi +
      summary.special.lunch * dailyRates.lunch +
      summary.special.chovihar * dailyRates.chovihar +
      summary.special.tea_coffee * dailyRates.tea_coffee +
      summary.special.parcel * dailyRates.parcel;

    const totalAmt = guestAmt + specialAmt;
    const cateringForDay = summary.catering > 0 ? summary.catering : rates.catering_staff_default;

    if (guestsOnly) {
      return {
        'Date': summary.date,
        'Guest Plates': guestPlates,
        'Guest Tea': guestTea,
        'Guest Total': guestTotal,
        'Guest Amount': guestAmt,
        'Special Plates': specialPlates,
        'Special Tea': specialTea,
        'Special Total': specialTotal,
        'Special Amount': specialAmt,
        'Total Amount': totalAmt,
      };
    }

    const staffPlates = getPlateCount(summary.staff);
    const staffTea = summary.staff.tea_coffee;
    const staffTotal = staffPlates + staffTea;

    const sevakPlates = getPlateCount(summary.sevak);
    const sevakTea = summary.sevak.tea_coffee;
    const sevakTotal = sevakPlates + sevakTea;

    const grandTotalPlates = guestPlates + specialPlates + staffPlates + sevakPlates + cateringForDay;
    const grandTotalTea = guestTea + specialTea + staffTea + sevakTea;
    const grandTotal = grandTotalPlates + grandTotalTea;

    return {
      'Date': summary.date,
      'Guest Plates': guestPlates,
      'Guest Tea': guestTea,
      'Guest Total': guestTotal,
      'Special Plates': specialPlates,
      'Special Tea': specialTea,
      'Special Total': specialTotal,
      'Staff Plates': staffPlates,
      'Staff Tea': staffTea,
      'Staff Total': staffTotal,
      'Sevak Plates': sevakPlates,
      'Sevak Tea': sevakTea,
      'Sevak Total': sevakTotal,
      'Catering': cateringForDay,
      'Total Plates': grandTotalPlates,
      'Total Tea': grandTotalTea,
      'Grand Total': grandTotal,
      'Guest Amount': guestAmt,
      'Special Amount': specialAmt,
      'Total Amount': totalAmt,
    };
  });

  // Calculate totals
  let totalGuestPlates = 0, totalGuestTea = 0, totalGuestAmt = 0;
  let totalSpecialPlates = 0, totalSpecialTea = 0, totalSpecialAmt = 0;
  let totalStaffPlates = 0, totalStaffTea = 0;
  let totalSevakPlates = 0, totalSevakTea = 0;
  let totalCatering = 0;

  summaries.forEach((summary) => {
    totalGuestPlates += getPlateCount(summary.guest);
    totalGuestTea += summary.guest.tea_coffee;
    totalGuestAmt +=
      summary.guest.navkarshi * rates.navkarshi +
      summary.guest.lunch * rates.lunch +
      summary.guest.chovihar * rates.chovihar +
      summary.guest.tea_coffee * rates.tea_coffee +
      summary.guest.parcel * rates.parcel;

    totalSpecialPlates += getPlateCount(summary.special);
    totalSpecialTea += summary.special.tea_coffee;
    const dailyRates = specialRatesMap.get(summary.date) || { navkarshi: 0, lunch: 0, chovihar: 0, tea_coffee: 0, parcel: 0 };
    totalSpecialAmt +=
      summary.special.navkarshi * dailyRates.navkarshi +
      summary.special.lunch * dailyRates.lunch +
      summary.special.chovihar * dailyRates.chovihar +
      summary.special.tea_coffee * dailyRates.tea_coffee +
      summary.special.parcel * dailyRates.parcel;

    totalStaffPlates += getPlateCount(summary.staff);
    totalStaffTea += summary.staff.tea_coffee;

    totalSevakPlates += getPlateCount(summary.sevak);
    totalSevakTea += summary.sevak.tea_coffee;

    totalCatering += summary.catering > 0 ? summary.catering : rates.catering_staff_default;
  });

  const grandTotalPlates = totalGuestPlates + totalSpecialPlates + totalStaffPlates + totalSevakPlates + totalCatering;
  const grandTotalTea = totalGuestTea + totalSpecialTea + totalStaffTea + totalSevakTea;
  const grandTotal = grandTotalPlates + grandTotalTea;
  const totalAmt = totalGuestAmt + totalSpecialAmt;

  if (guestsOnly) {
    data.push({
      'Date': 'TOTAL',
      'Guest Plates': totalGuestPlates,
      'Guest Tea': totalGuestTea,
      'Guest Total': totalGuestPlates + totalGuestTea,
      'Guest Amount': totalGuestAmt,
      'Special Plates': totalSpecialPlates,
      'Special Tea': totalSpecialTea,
      'Special Total': totalSpecialPlates + totalSpecialTea,
      'Special Amount': totalSpecialAmt,
      'Total Amount': totalAmt,
    });
  } else {
    data.push({
      'Date': 'TOTAL',
      'Guest Plates': totalGuestPlates,
      'Guest Tea': totalGuestTea,
      'Guest Total': totalGuestPlates + totalGuestTea,
      'Special Plates': totalSpecialPlates,
      'Special Tea': totalSpecialTea,
      'Special Total': totalSpecialPlates + totalSpecialTea,
      'Staff Plates': totalStaffPlates,
      'Staff Tea': totalStaffTea,
      'Staff Total': totalStaffPlates + totalStaffTea,
      'Sevak Plates': totalSevakPlates,
      'Sevak Tea': totalSevakTea,
      'Sevak Total': totalSevakPlates + totalSevakTea,
      'Catering': totalCatering,
      'Total Plates': grandTotalPlates,
      'Total Tea': grandTotalTea,
      'Grand Total': grandTotal,
      'Guest Amount': totalGuestAmt,
      'Special Amount': totalSpecialAmt,
      'Total Amount': totalAmt,
    });
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, guestsOnly ? 'Paid Guests' : 'Plate Count');

  // Add rates sheet
  const ratesData = [
    { 'Item': 'Navkarshi', 'Rate': rates.navkarshi },
    { 'Item': 'Lunch', 'Rate': rates.lunch },
    { 'Item': 'Chovihar', 'Rate': rates.chovihar },
    { 'Item': 'Tea/Coffee', 'Rate': rates.tea_coffee },
    { 'Item': 'Parcel', 'Rate': rates.parcel },
  ];
  const ratesWs = XLSX.utils.json_to_sheet(ratesData);
  XLSX.utils.book_append_sheet(wb, ratesWs, 'Guest Rates');

  XLSX.writeFile(wb, filename);
}
