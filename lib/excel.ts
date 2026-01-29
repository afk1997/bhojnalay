import * as XLSX from 'xlsx';
import { DailySummary, Rates } from './types';

export function exportToExcel(summaries: DailySummary[], rates: Rates, filename: string) {
  const data = summaries.map((summary) => {
    const guestTotal = summary.guest.navkarshi + summary.guest.lunch + summary.guest.chovihar;
    const staffTotal = summary.staff.navkarshi + summary.staff.lunch + summary.staff.chovihar;
    const sevakTotal = summary.sevak.navkarshi + summary.sevak.lunch + summary.sevak.chovihar;
    const grandTotal = guestTotal + staffTotal + sevakTotal;

    const navkarshiAmt = summary.guest.navkarshi * rates.navkarshi;
    const lunchAmt = summary.guest.lunch * rates.lunch;
    const choviharAmt = summary.guest.chovihar * rates.chovihar;
    const totalAmt = navkarshiAmt + lunchAmt + choviharAmt;

    return {
      'Date': summary.date,
      'Guest Navkarshi': summary.guest.navkarshi,
      'Guest Lunch': summary.guest.lunch,
      'Guest Chovihar': summary.guest.chovihar,
      'Guest Total': guestTotal,
      'Staff Navkarshi': summary.staff.navkarshi,
      'Staff Lunch': summary.staff.lunch,
      'Staff Chovihar': summary.staff.chovihar,
      'Staff Total': staffTotal,
      'Sevak Navkarshi': summary.sevak.navkarshi,
      'Sevak Lunch': summary.sevak.lunch,
      'Sevak Chovihar': summary.sevak.chovihar,
      'Sevak Total': sevakTotal,
      'Grand Total Plates': grandTotal,
      'Navkarshi Amount': navkarshiAmt,
      'Lunch Amount': lunchAmt,
      'Chovihar Amount': choviharAmt,
      'Total Amount': totalAmt,
    };
  });

  // Add summary row
  const totals = summaries.reduce(
    (acc, summary) => {
      acc.guestNavkarshi += summary.guest.navkarshi;
      acc.guestLunch += summary.guest.lunch;
      acc.guestChovihar += summary.guest.chovihar;
      acc.staffNavkarshi += summary.staff.navkarshi;
      acc.staffLunch += summary.staff.lunch;
      acc.staffChovihar += summary.staff.chovihar;
      acc.sevakNavkarshi += summary.sevak.navkarshi;
      acc.sevakLunch += summary.sevak.lunch;
      acc.sevakChovihar += summary.sevak.chovihar;
      return acc;
    },
    {
      guestNavkarshi: 0,
      guestLunch: 0,
      guestChovihar: 0,
      staffNavkarshi: 0,
      staffLunch: 0,
      staffChovihar: 0,
      sevakNavkarshi: 0,
      sevakLunch: 0,
      sevakChovihar: 0,
    }
  );

  const guestTotal = totals.guestNavkarshi + totals.guestLunch + totals.guestChovihar;
  const staffTotal = totals.staffNavkarshi + totals.staffLunch + totals.staffChovihar;
  const sevakTotal = totals.sevakNavkarshi + totals.sevakLunch + totals.sevakChovihar;
  const grandTotal = guestTotal + staffTotal + sevakTotal;
  const totalAmt =
    totals.guestNavkarshi * rates.navkarshi +
    totals.guestLunch * rates.lunch +
    totals.guestChovihar * rates.chovihar;

  data.push({
    'Date': 'TOTAL',
    'Guest Navkarshi': totals.guestNavkarshi,
    'Guest Lunch': totals.guestLunch,
    'Guest Chovihar': totals.guestChovihar,
    'Guest Total': guestTotal,
    'Staff Navkarshi': totals.staffNavkarshi,
    'Staff Lunch': totals.staffLunch,
    'Staff Chovihar': totals.staffChovihar,
    'Staff Total': staffTotal,
    'Sevak Navkarshi': totals.sevakNavkarshi,
    'Sevak Lunch': totals.sevakLunch,
    'Sevak Chovihar': totals.sevakChovihar,
    'Sevak Total': sevakTotal,
    'Grand Total Plates': grandTotal,
    'Navkarshi Amount': totals.guestNavkarshi * rates.navkarshi,
    'Lunch Amount': totals.guestLunch * rates.lunch,
    'Chovihar Amount': totals.guestChovihar * rates.chovihar,
    'Total Amount': totalAmt,
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plate Count');

  // Add rates sheet
  const ratesData = [
    { 'Meal': 'Navkarshi', 'Rate': rates.navkarshi },
    { 'Meal': 'Lunch', 'Rate': rates.lunch },
    { 'Meal': 'Chovihar', 'Rate': rates.chovihar },
  ];
  const ratesWs = XLSX.utils.json_to_sheet(ratesData);
  XLSX.utils.book_append_sheet(wb, ratesWs, 'Rates');

  XLSX.writeFile(wb, filename);
}
