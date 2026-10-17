export type Locale = "en" | "bn";

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const LATIN_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const BANGLA_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BANGLA_DAYS_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const ENGLISH_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Converts Latin digits in a string or number to Bangla digits
 */
export function toBanglaDigits(val: number | string): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str.replace(/[0-9]/g, (char) => BANGLA_DIGITS[parseInt(char, 10)]);
}

/**
 * Normalizes Bangla digits (০-৯) to Latin digits (0-9)
 */
export function toLatinDigits(val: string): string {
  if (!val) return "";
  return val.replace(/[০-৯]/g, (char) => {
    const idx = BANGLA_DIGITS.indexOf(char);
    return idx !== -1 ? String(idx) : char;
  });
}

/**
 * Normalizes user input by converting Bangla digits to Latin and removing unwanted spaces
 */
export function normalizeBanglaInput(val: string): string {
  return toLatinDigits(val).trim();
}

/**
 * Formats a number with Indian numbering system grouping (e.g. 1,25,000)
 */
export function formatIndianNumbering(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toString().split(".");
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? "." + parts[1] : "";

  if (integerPart.length <= 3) {
    return (isNegative ? "-" : "") + integerPart + decimalPart;
  }

  // Last 3 digits
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  // Preceding digits grouped in sets of 2
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return (isNegative ? "-" : "") + formattedOther + "," + lastThree + decimalPart;
}

/**
 * Formats standard numbers with active locale
 */
export function formatNumber(
  num: number,
  locale: Locale = "bn",
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  if (num === null || num === undefined || isNaN(num)) return locale === "bn" ? "০" : "0";

  let formatted = "";
  if (options && (options.maximumFractionDigits !== undefined || options.minimumFractionDigits !== undefined)) {
    const fractionDigits = options.maximumFractionDigits ?? 2;
    const rounded = num.toFixed(fractionDigits);
    const [intPart, decPart] = rounded.split(".");
    const formattedInt = formatIndianNumbering(parseInt(intPart, 10));
    formatted = decPart && parseInt(decPart, 10) > 0 ? `${formattedInt}.${decPart}` : formattedInt;
  } else {
    formatted = formatIndianNumbering(Math.round(num));
  }

  return locale === "bn" ? toBanglaDigits(formatted) : formatted;
}

/**
 * Formats BDT currency with ৳ symbol and Indian-style grouping (e.g. ৳ ১,২৫,০০০)
 * Database stores money in paisa (1 BDT = 100 paisa) by default.
 */
export function formatCurrency(
  amount: number,
  locale: Locale = "bn",
  isPaisa: boolean = true
): string {
  const bdtAmount = isPaisa ? Math.round(amount / 100) : Math.round(amount);
  const formattedNumber = formatNumber(bdtAmount, locale);
  return `৳ ${formattedNumber}`;
}

/**
 * Formats currency amount without symbol (just digits and commas)
 */
export function formatCurrencyRaw(
  amount: number,
  locale: Locale = "bn",
  isPaisa: boolean = true
): string {
  const bdtAmount = isPaisa ? Math.round(amount / 100) : Math.round(amount);
  return formatNumber(bdtAmount, locale);
}

/**
 * Formats percentage
 */
export function formatPercent(percent: number, locale: Locale = "bn"): string {
  const formatted = Math.round(percent).toString();
  return locale === "bn" ? `${toBanglaDigits(formatted)}%` : `${formatted}%`;
}

/**
 * Formats date into readable format
 */
export function formatDate(
  dateInput: Date | string | number | null | undefined,
  locale: Locale = "bn"
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (locale === "bn") {
    const bnDay = toBanglaDigits(day);
    const bnMonth = BANGLA_MONTHS[month];
    const bnYear = toBanglaDigits(year);
    return `${bnDay} ${bnMonth}, ${bnYear}`;
  }

  const enMonth = ENGLISH_MONTHS[month].substring(0, 3);
  return `${day} ${enMonth} ${year}`;
}

/**
 * Formats date to short MM/YYYY or DD/MM
 */
export function formatDateShort(
  dateInput: Date | string | number | null | undefined,
  locale: Locale = "bn"
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  const formatted = `${day}/${month}/${year}`;
  return locale === "bn" ? toBanglaDigits(formatted) : formatted;
}

/**
 * Returns month name for a given month number (1-12)
 */
export function formatMonth(month: number, locale: Locale = "bn", year?: number): string {
  const monthIdx = Math.max(0, Math.min(11, month - 1));
  const monthName = locale === "bn" ? BANGLA_MONTHS[monthIdx] : ENGLISH_MONTHS[monthIdx];
  if (year) {
    const formattedYear = locale === "bn" ? toBanglaDigits(year) : String(year);
    return `${monthName} ${formattedYear}`;
  }
  return monthName;
}

/**
 * Helper to get list of months in active locale
 */
export function getMonthList(locale: Locale = "bn"): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: locale === "bn" ? BANGLA_MONTHS[i] : ENGLISH_MONTHS[i],
  }));
}

/**
 * International Collator for sorting Bangla strings
 */
export const banglaCollator = new Intl.Collator("bn", { sensitivity: "base" });

/**
 * Sorts an array of items by a string property respecting Bangla collator
 */
export function sortBanglaStrings<T>(items: T[], getter: (item: T) => string): T[] {
  return [...items].sort((a, b) => banglaCollator.compare(getter(a) || "", getter(b) || ""));
}

/**
 * Search matching both Latin and Bangla digits
 * e.g. searching "০১" matches "Shop 01", and searching "01" matches "দোকান ০১"
 */
export function matchesSearchWithDigits(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const normalizedQuery = toLatinDigits(query).toLowerCase().trim();
  const normalizedText = toLatinDigits(text).toLowerCase();

  return normalizedText.includes(normalizedQuery);
}
