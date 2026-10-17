import fs from "fs";
import path from "path";

function getAllKeys(obj: Record<string, any>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

function verifyTranslations() {
  const enPath = path.join(process.cwd(), "messages", "en.json");
  const bnPath = path.join(process.cwd(), "messages", "bn.json");

  if (!fs.existsSync(enPath) || !fs.existsSync(bnPath)) {
    console.error("❌ Translation files missing!");
    process.exit(1);
  }

  const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  const bn = JSON.parse(fs.readFileSync(bnPath, "utf-8"));

  const enKeys = new Set(getAllKeys(en));
  const bnKeys = new Set(getAllKeys(bn));

  const missingInBn = [...enKeys].filter((k) => !bnKeys.has(k));
  const missingInEn = [...bnKeys].filter((k) => !enKeys.has(k));

  let hasError = false;

  if (missingInBn.length > 0) {
    console.error(`❌ Keys present in en.json but missing in bn.json (${missingInBn.length}):`);
    missingInBn.forEach((k) => console.error(`  - ${k}`));
    hasError = true;
  }

  if (missingInEn.length > 0) {
    console.error(`❌ Keys present in bn.json but missing in en.json (${missingInEn.length}):`);
    missingInEn.forEach((k) => console.error(`  - ${k}`));
    hasError = true;
  }

  if (hasError) {
    console.error("\n❌ Translation key verification failed!");
    process.exit(1);
  }

  console.log(`✅ Translation parity check passed! All ${enKeys.size} translation keys match between en.json and bn.json.`);
}

verifyTranslations();
