import * as XLSX from 'xlsx';
import { DailySummary, Rates } from './types';

export function exportToExcel(summaries: DailySummary[], rates: Rates, filename: string, guestsOnly: boolean = false) {
  const data = summaries.map((summary) => {
    const guestTotal = summary.guest.navkarshi + summary.guest.lunch + summary.guest.chovihar + summary.guest.tea_coffee + summary.guest.parcel;
    const navkarshiAmt = summary.guest.navkarshi * rates.navkarshi;
    const lunchAmt = summary.guest.lunch * rates.lunch;
    const choviharAmt = summary.guest.chovihar * rates.chovihar;
    const teaCoffeeAmt = summary.guest.tea_coffee * rates.tea_coffee;
    const parcelAmt = summary.guest.parcel * rates.parcel;
    const totalAmt = navkarshiAmt + lunchAmt + choviharAmt + teaCoffeeAmt + parcelAmt;
    const cateringForDay = summary.catering > 0 ? summary.catering : rates.catering_staff_default;

    if (guestsOnly) {
      return {
        'Date': summary.date,
        'Navkarshi': summary.guest.navkarshi,
        'Lunch': summary.guest.lunch,
        'Chovihar': summary.guest.chovihar,
        'Tea/Coffee': summary.guest.tea_coffee,
        'Parcel': summary.guest.parcel,
        'Total Plates': guestTotal,
        'Navkarshi Amount': navkarshiAmt,
        'Lunch Amount': lunchAmt,
        'Chovihar Amount': choviharAmt,
        'Tea/Coffee Amount': teaCoffeeAmt,
        'Parcel Amount': parcelAmt,
        'Total Amount': totalAmt,
      };
    }

    const staffTotal = summary.staff.navkarshi + summary.staff.lunch + summary.staff.chovihar + summary.staff.tea_coffee + summary.staff.parcel;
    const sevakTotal = summary.sevak.navkarshi + summary.sevak.lunch + summary.sevak.chovihar + summary.sevak.tea_coffee + summary.sevak.parcel;
    const grandTotal = guestTotal + staffTotal + sevakTotal + cateringForDay;

    return {
      'Date': summary.date,
      'Guest Navkarshi': summary.guest.navkarshi,
      'Guest Lunch': summary.guest.lunch,
      'Guest Chovihar': summary.guest.chovihar,
      'Guest Tea/Coffee': summary.guest.tea_coffee,
      'Guest Parcel': summary.guest.parcel,
      'Guest Total': guestTotal,
      'Staff Navkarshi': summary.staff.navkarshi,
      'Staff Lunch': summary.staff.lunch,
      'Staff Chovihar': summary.staff.chovihar,
      'Staff Tea/Coffee': summary.staff.tea_coffee,
      'Staff Parcel': summary.staff.parcel,
      'Staff Total': staffTotal,
      'Sevak Navkarshi': summary.sevak.navkarshi,
      'Sevak Lunch': summary.sevak.lunch,
      'Sevak Chovihar': summary.sevak.chovihar,
      'Sevak Tea/Coffee': summary.sevak.tea_coffee,
      'Sevak Parcel': summary.sevak.parcel,
      'Sevak Total': sevakTotal,
      'Catering Staff': cateringForDay,
      'Grand Total Plates': grandTotal,
      'Navkarshi Amount': navkarshiAmt,
      'Lunch Amount': lunchAmt,
      'Chovihar Amount': choviharAmt,
      'Tea/Coffee Amount': teaCoffeeAmt,
      'Parcel Amount': parcelAmt,
      'Total Amount': totalAmt,
    };
  });

  // Add summary row
  const totals = summaries.reduce(
    (acc, summary) => {
      acc.guestNavkarshi += summary.guest.navkarshi;
      acc.guestLunch += summary.guest.lunch;
      acc.guestChovihar += summary.guest.chovihar;
      acc.guestTeaCoffee += summary.guest.tea_coffee;
      acc.guestParcel += summary.guest.parcel;
      acc.staffNavkarshi += summary.staff.navkarshi;
      acc.staffLunch += summary.staff.lunch;
      acc.staffChovihar += summary.staff.chovihar;
      acc.staffTeaCoffee += summary.staff.tea_coffee;
      acc.staffParcel += summary.staff.parcel;
      acc.sevakNavkarshi += summary.sevak.navkarshi;
      acc.sevakLunch += summary.sevak.lunch;
      acc.sevakChovihar += summary.sevak.chovihar;
      acc.sevakTeaCoffee += summary.sevak.tea_coffee;
      acc.sevakParcel += summary.sevak.parcel;
      acc.catering += summary.catering > 0 ? summary.catering : rates.catering_staff_default;
      return acc;
    },
    {
      guestNavkarshi: 0,
      guestLunch: 0,
      guestChovihar: 0,
      guestTeaCoffee: 0,
      guestParcel: 0,
      staffNavkarshi: 0,
      staffLunch: 0,
      staffChovihar: 0,
      staffTeaCoffee: 0,
      staffParcel: 0,
      sevakNavkarshi: 0,
      sevakLunch: 0,
      sevakChovihar: 0,
      sevakTeaCoffee: 0,
      sevakParcel: 0,
      catering: 0,
    }
  );

  const guestTotal = totals.guestNavkarshi + totals.guestLunch + totals.guestChovihar + totals.guestTeaCoffee + totals.guestParcel;
  const totalAmt =
    totals.guestNavkarshi * rates.navkarshi +
    totals.guestLunch * rates.lunch +
    totals.guestChovihar * rates.chovihar +
    totals.guestTeaCoffee * rates.tea_coffee +
    totals.guestParcel * rates.parcel;

  if (guestsOnly) {
    data.push({
      'Date': 'TOTAL',
      'Navkarshi': totals.guestNavkarshi,
      'Lunch': totals.guestLunch,
      'Chovihar': totals.guestChovihar,
      'Tea/Coffee': totals.guestTeaCoffee,
      'Parcel': totals.guestParcel,
      'Total Plates': guestTotal,
      'Navkarshi Amount': totals.guestNavkarshi * rates.navkarshi,
      'Lunch Amount': totals.guestLunch * rates.lunch,
      'Chovihar Amount': totals.guestChovihar * rates.chovihar,
      'Tea/Coffee Amount': totals.guestTeaCoffee * rates.tea_coffee,
      'Parcel Amount': totals.guestParcel * rates.parcel,
      'Total Amount': totalAmt,
    });
  } else {
    const staffTotal = totals.staffNavkarshi + totals.staffLunch + totals.staffChovihar + totals.staffTeaCoffee + totals.staffParcel;
    const sevakTotal = totals.sevakNavkarshi + totals.sevakLunch + totals.sevakChovihar + totals.sevakTeaCoffee + totals.sevakParcel;
    const grandTotal = guestTotal + staffTotal + sevakTotal + totals.catering;

    data.push({
      'Date': 'TOTAL',
      'Guest Navkarshi': totals.guestNavkarshi,
      'Guest Lunch': totals.guestLunch,
      'Guest Chovihar': totals.guestChovihar,
      'Guest Tea/Coffee': totals.guestTeaCoffee,
      'Guest Parcel': totals.guestParcel,
      'Guest Total': guestTotal,
      'Staff Navkarshi': totals.staffNavkarshi,
      'Staff Lunch': totals.staffLunch,
      'Staff Chovihar': totals.staffChovihar,
      'Staff Tea/Coffee': totals.staffTeaCoffee,
      'Staff Parcel': totals.staffParcel,
      'Staff Total': staffTotal,
      'Sevak Navkarshi': totals.sevakNavkarshi,
      'Sevak Lunch': totals.sevakLunch,
      'Sevak Chovihar': totals.sevakChovihar,
      'Sevak Tea/Coffee': totals.sevakTeaCoffee,
      'Sevak Parcel': totals.sevakParcel,
      'Sevak Total': sevakTotal,
      'Catering Staff': totals.catering,
      'Grand Total Plates': grandTotal,
      'Navkarshi Amount': totals.guestNavkarshi * rates.navkarshi,
      'Lunch Amount': totals.guestLunch * rates.lunch,
      'Chovihar Amount': totals.guestChovihar * rates.chovihar,
      'Tea/Coffee Amount': totals.guestTeaCoffee * rates.tea_coffee,
      'Parcel Amount': totals.guestParcel * rates.parcel,
      'Total Amount': totalAmt,
    });
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, guestsOnly ? 'Guest Plates' : 'Plate Count');

  // Add rates sheet
  const ratesData = [
    { 'Item': 'Navkarshi', 'Rate': rates.navkarshi },
    { 'Item': 'Lunch', 'Rate': rates.lunch },
    { 'Item': 'Chovihar', 'Rate': rates.chovihar },
    { 'Item': 'Tea/Coffee', 'Rate': rates.tea_coffee },
    { 'Item': 'Parcel', 'Rate': rates.parcel },
  ];
  const ratesWs = XLSX.utils.json_to_sheet(ratesData);
  XLSX.utils.book_append_sheet(wb, ratesWs, 'Rates');

  XLSX.writeFile(wb, filename);
}
