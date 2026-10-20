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

const ONES_EN = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS_EN = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

const BANGLA_NUMBERS_MAP: Record<number, string> = {
  0: "শূন্য", 1: "এক", 2: "দুই", 3: "তিন", 4: "চার", 5: "পাঁচ", 6: "ছয়", 7: "সাত", 8: "আট", 9: "নয়", 10: "দশ",
  11: "এগারো", 12: "বারো", 13: "তেরো", 14: "চৌদ্দ", 15: "পনেরো", 16: "ষোলো", 17: "সতেরো", 18: "আঠারো", 19: "উনিশ", 20: "বিশ",
  21: "একুশ", 22: "বাইশ", 23: "তেইশ", 24: "চব্বিশ", 25: "পঁচিশ", 26: "ছাব্বিশ", 27: "সাতাশ", 28: "আঠাশ", 29: "উনত্রিশ", 30: "ত্রিশ",
  31: "একত্রিশ", 32: "বত্রিশ", 33: "তেত্রিশ", 34: "চৌত্রিশ", 35: "পঁয়ত্রিশ", 36: "ছত্রিশ", 37: "সাঁইত্রিশ", 38: "আটত্রিশ", 39: "উনচল্লিশ", 40: "চল্লিশ",
  41: "একচল্লিশ", 42: "বিয়াল্লিশ", 43: "তেতাল্লিশ", 44: "চুয়াল্লিশ", 45: "পঁয়তাল্লিশ", 46: "ছেচল্লিশ", 47: "সাতচল্লিশ", 48: "আটচল্লিশ", 49: "উনপঞ্চাশ", 50: "পঞ্চাশ",
  51: "একান্ন", 52: "বায়ান্ন", 53: "তিপ্পান্ন", 54: "চুয়ান্ন", 55: "পঞ্চান্ন", 56: "ছাপ্পান্ন", 57: "সাতান্ন", 58: "আটান্ন", 59: "উনষাট", 60: "ষাট",
  61: "একষট্টি", 62: "বাষট্টি", 63: "তেষট্টি", 64: "চৌষট্টি", 65: "পঁয়ষট্টি", 66: "ছেষট্টি", 67: "সাতষট্টি", 68: "আটষট্টি", 69: "উনসত্তর", 70: "সত্তর",
  71: "একাত্তর", 72: "বাহাত্তর", 73: "তিয়াত্তর", 74: "চুয়াত্তর", 75: "পঁচাত্তর", 76: "ছিয়াত্তর", 77: "সাতাত্তর", 78: "আটাত্তর", 79: "উনআশি", 80: "আশি",
  81: "একাশি", 82: "বিরাশি", 83: "তিরাশি", 84: "চুরাশি", 85: "পঁচাশি", 86: "ছিয়াশি", 87: "সাতাশি", 88: "অষ্টআশি", 89: "উননব্বই", 90: "নব্বই",
  91: "একানব্বই", 92: "বিরানব্বই", 93: "তিরানব্বই", 94: "চুরানব্বই", 95: "পঁচানব্বই", 96: "ছিয়ানব্বই", 97: "সাতানব্বই", 98: "আটানব্বই", 99: "নিরানব্বই",
};

function convertEnglishUnderThousand(num: number): string {
  let s = "";
  if (num >= 100) {
    s += ONES_EN[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num >= 20) {
    s += TENS_EN[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  if (num > 0) {
    s += ONES_EN[num] + " ";
  }
  return s.trim();
}

function convertBanglaUnderHundred(num: number): string {
  if (num <= 0) return "";
  return BANGLA_NUMBERS_MAP[num] || String(num);
}

/**
 * Converts a number in BDT to words (Bangla and English)
 * e.g. 50000 -> "পঞ্চাশ হাজার টাকা মাত্র" or "Fifty Thousand Taka Only"
 */
export function numberToWordsBDT(amountBDT: number, locale: Locale = "bn"): string {
  const amount = Math.floor(Math.abs(amountBDT || 0));
  if (amount === 0) {
    return locale === "bn" ? "শূন্য টাকা মাত্র" : "Zero Taka Only";
  }

  if (locale === "bn") {
    let result = "";
    let n = amount;

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    if (crore > 0) {
      result += `${numberToWordsBDT(crore, "bn").replace(" টাকা মাত্র", "")} কোটি `;
    }

    const lakh = Math.floor(n / 100000);
    n %= 100000;
    if (lakh > 0) {
      result += `${convertBanglaUnderHundred(lakh)} লাখ `;
    }

    const thousand = Math.floor(n / 1000);
    n %= 1000;
    if (thousand > 0) {
      result += `${convertBanglaUnderHundred(thousand)} হাজার `;
    }

    const hundred = Math.floor(n / 100);
    n %= 100;
    if (hundred > 0) {
      result += `${convertBanglaUnderHundred(hundred)} শত `;
    }

    if (n > 0) {
      result += `${convertBanglaUnderHundred(n)} `;
    }

    return `${result.trim()} টাকা মাত্র`;
  }

  // English (Indian/Bangladeshi counting: Crore, Lakh, Thousand, Hundred)
  let result = "";
  let n = amount;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    result += `${convertEnglishUnderThousand(crore)} Crore `;
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    result += `${convertEnglishUnderThousand(lakh)} Lakh `;
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    result += `${convertEnglishUnderThousand(thousand)} Thousand `;
  }

  const hundred = Math.floor(n / 100);
  n %= 100;
  if (hundred > 0) {
    result += `${ONES_EN[hundred]} Hundred `;
  }

  if (n > 0) {
    result += `${convertEnglishUnderThousand(n)} `;
  }

  return `${result.trim()} Taka Only`;
}

/**
 * Standard Shop Blocks in Bangladeshi Markets (এ, বি, সি, ডি, ই, এফ / A, B, C, D, E, F)
 */
export const STANDARD_SHOP_BLOCKS = [
  { key: "এ", englishKey: "A", labelBn: "ব্লক এ", labelEn: "Block A" },
  { key: "বি", englishKey: "B", labelBn: "ব্লক বি", labelEn: "Block B" },
  { key: "সি", englishKey: "C", labelBn: "ব্লক সি", labelEn: "Block C" },
  { key: "ডি", englishKey: "D", labelBn: "ব্লক ডি", labelEn: "Block D" },
  { key: "ই", englishKey: "E", labelBn: "ব্লক ই", labelEn: "Block E" },
  { key: "এফ", englishKey: "F", labelBn: "ব্লক এফ", labelEn: "Block F" },
];

const BENGALI_BLOCK_ORDERS: Record<string, number> = {
  // Bengali syllables
  "এ": 1, "A": 1, "a": 1, "ক": 1,
  "বি": 2, "B": 2, "b": 2, "ব": 2, "খ": 2,
  "সি": 3, "C": 3, "c": 3, "স": 3, "গ": 3,
  "ডি": 4, "D": 4, "d": 4, "ড": 4, "ঘ": 4,
  "ই": 5, "E": 5, "e": 5, "ঙ": 5,
  "এফ": 6, "F": 6, "f": 6, "ফ": 6, "চ": 6,
  "জি": 7, "G": 7, "g": 7, "জ": 7, "ছ": 7,
  "এইচ": 8, "H": 8, "h": 8, "হ": 8,
  "আই": 9, "I": 9, "i": 9,
  "জে": 10, "J": 10, "j": 10,
  "কে": 11, "K": 11, "k": 11,
  "এল": 12, "L": 12, "l": 12, "ল": 12,
  "এম": 13, "M": 13, "m": 13, "ম": 13,
  "এন": 14, "N": 14, "n": 14, "ন": 14,
  "ও": 15, "O": 15, "o": 15,
  "পি": 16, "P": 16, "p": 16, "প": 16,
};

/**
 * Parses a shop number to extract block serial and numeric part
 * e.g. "এ-০১" -> blockKey: "এ", blockOrder: 1, num: 1
 * e.g. "B-12" -> blockKey: "B", blockOrder: 2, num: 12
 */
export function parseShopSerial(shopNumber: string) {
  if (!shopNumber) return { blockOrder: 999, blockKey: "", num: 0, raw: "" };

  const str = shopNumber.trim();
  const latinDigits = toLatinDigits(str);

  // Extract block prefix (e.g., এ, বি, সি, ডি, ই, এফ or A, B, C...)
  // Explicitly alternate multi-codepoint Bengali syllables before single letters
  const blockMatch = str.match(/^(?:ব্লক|লাইন|সেকশন|Block|Line|Sec)?\s*(এইচ|আই|এফ|বি|সি|ডি|জি|জে|কে|এল|এম|এন|পি|এ|ই|ও|[a-zA-Z]|[ক-হ])(?:[\s\-_/]+)?/i);
  let blockKey = "";
  let blockOrder = 999;

  if (blockMatch && blockMatch[1]) {
    const rawLetter = blockMatch[1];
    blockKey = rawLetter.length === 1 && /[a-zA-Z]/.test(rawLetter) ? rawLetter.toUpperCase() : rawLetter;
    if (BENGALI_BLOCK_ORDERS[rawLetter]) {
      blockOrder = BENGALI_BLOCK_ORDERS[rawLetter];
    } else if (BENGALI_BLOCK_ORDERS[blockKey]) {
      blockOrder = BENGALI_BLOCK_ORDERS[blockKey];
    }
  }

  // Extract number (first sequence of digits in string)
  const numMatch = latinDigits.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 0;

  return { blockOrder, blockKey, num, raw: str };
}

/**
 * Natural comparator for shop numbers market-wise serialized by blocks (এ, বি, সি, ডি, ই, এফ)
 */
export function compareShopSerials(aStr: string, bStr: string): number {
  const a = parseShopSerial(aStr);
  const b = parseShopSerial(bStr);

  if (a.blockOrder !== b.blockOrder) {
    return a.blockOrder - b.blockOrder;
  }
  if (a.num !== b.num) {
    return a.num - b.num;
  }
  return a.raw.localeCompare(b.raw, "bn");
}

