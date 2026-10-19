import { Locale, toBanglaDigits } from "./format";

const BENGALI_ORDINALS: Record<number, string> = {
  1: "১ম তলা",
  2: "২য় তলা",
  3: "৩য় তলা",
  4: "৪র্থ তলা",
  5: "৫ম তলা",
  6: "৬ষ্ঠ তলা",
  7: "৭ম তলা",
  8: "৮ম তলা",
  9: "৯ম তলা",
  10: "১০ম তলা",
};

const ENGLISH_ORDINALS: Record<number, string> = {
  1: "1st Floor",
  2: "2nd Floor",
  3: "3rd Floor",
  4: "4th Floor",
  5: "5th Floor",
  6: "6th Floor",
  7: "7th Floor",
  8: "8th Floor",
  9: "9th Floor",
  10: "10th Floor",
};

export interface FloorOption {
  value: string;
  label: string;
}

/**
 * Returns formatted ordinal floor name (e.g. "১ম তলা" / "1st Floor")
 */
export function getFloorOrdinal(floorNum: number, locale: Locale = "bn"): string {
  if (locale === "bn") {
    if (BENGALI_ORDINALS[floorNum]) return BENGALI_ORDINALS[floorNum];
    return `${toBanglaDigits(floorNum)}-তম তলা`;
  }
  if (ENGLISH_ORDINALS[floorNum]) return ENGLISH_ORDINALS[floorNum];
  const j = floorNum % 10;
  const k = floorNum % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";
  return `${floorNum}${suffix} Floor`;
}

/**
 * Formats any stored floor string into localized human-friendly name
 */
export function formatFloorName(rawFloor: string, locale: Locale = "bn"): string {
  if (!rawFloor) return "";
  const lower = rawFloor.trim().toLowerCase();

  if (lower === "ground" || lower === "ground floor" || lower === "নিচতলা") {
    return locale === "bn" ? "নিচতলা" : "Ground Floor";
  }
  if (lower === "basement" || lower === "বেসমেন্ট") {
    return locale === "bn" ? "বেসমেন্ট" : "Basement";
  }

  // Extract digit if like "1st Floor", "2nd", "3", "৪র্থ তলা"
  const matchLatin = rawFloor.match(/(\d+)/);
  if (matchLatin) {
    const num = parseInt(matchLatin[1], 10);
    if (!isNaN(num) && num > 0) {
      return getFloorOrdinal(num, locale);
    }
  }

  return rawFloor;
}

/**
 * Generates dynamic floor options based on the market's totalFloors (default 5, up to N)
 */
export function generateFloorOptions(
  totalFloors: number = 5,
  locale: Locale = "bn",
  includeCustom: boolean = true
): FloorOption[] {
  const count = Math.max(1, Math.min(100, totalFloors || 5));
  const options: FloorOption[] = [];

  // 1. Basement
  options.push({
    value: "Basement",
    label: locale === "bn" ? "বেসমেন্ট" : "Basement",
  });

  // 2. Ground Floor
  options.push({
    value: "Ground",
    label: locale === "bn" ? "নিচতলা" : "Ground Floor",
  });

  // 3. Floors 1 to totalFloors
  for (let i = 1; i <= count; i++) {
    const canonicalValue = `${i}${i === 1 ? "st" : i === 2 ? "nd" : i === 3 ? "rd" : "th"} Floor`;
    options.push({
      value: canonicalValue,
      label: getFloorOrdinal(i, locale),
    });
  }

  // 4. Custom Floor option
  if (includeCustom) {
    options.push({
      value: "CUSTOM",
      label: locale === "bn" ? "+ অন্য কোনো তলা লিখুন (Custom)..." : "+ Custom Floor...",
    });
  }

  return options;
}
