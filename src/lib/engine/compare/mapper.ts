import type { ColumnProfile, ColumnMappingSuggestion } from "./types";

/**
 * Standard Levenshtein Distance for string comparison.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array<number[]>(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    const row = (matrix[i] = new Array<number>(an + 1));
    row[0] = i;
  }
  const firstRow = matrix[0]!;
  for (let j = 1; j <= an; ++j) {
    firstRow[j] = j;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          Math.min(
            matrix[i]![j - 1]! + 1, // insertion
            matrix[i - 1]![j]! + 1, // deletion
          ),
        );
      }
    }
  }
  return matrix[bn]![an]!;
}

function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(a, b);
  return Math.max(0, 1.0 - dist / maxLen);
}

const COMMON_ALIASES: Record<string, string[]> = {
  id: ["code", "key", "number", "num", "identifier", "ref", "reference", "no"],
  cust: ["customer", "client", "buyer", "account"],
  customer: ["client", "buyer", "account", "cust"],
  order: ["sale", "transaction", "invoice", "ord", "purchase"],
  amount: ["total", "price", "cost", "sum", "revenue", "val", "value", "subtotal", "balance"],
  price: ["amount", "cost", "rate", "fee", "charge", "unit_price"],
  qty: ["quantity", "count", "units", "volume"],
  quantity: ["qty", "count", "units", "volume"],
  date: ["dt", "time", "timestamp", "datetime", "day"],
  email: ["mail", "e_mail", "email_address", "contact_email"],
  phone: ["telephone", "mobile", "cell", "contact_number", "phone_number", "tel"],
  address: ["addr", "street", "location", "residence"],
  city: ["town", "municipality"],
  state: ["province", "region", "territory"],
  postal: ["zip", "zipcode", "postcode", "postal_code"],
  zip: ["postal", "zipcode", "postcode", "postal_code"],
  first_name: ["fname", "given_name", "forename"],
  last_name: ["lname", "surname", "family_name"],
  name: ["title", "description", "label", "full_name"],
  desc: ["description", "details", "summary", "notes"],
  description: ["desc", "details", "summary", "notes"],
  status: ["state", "condition", "stage"],
  product: ["item", "sku", "good", "merchandise", "prod"],
  sku: ["product_code", "item_code", "product_id", "item_id"],
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0),
  );
}

function tokenSimilarity(a: string, b: string): number {
  const tA = getTokens(a);
  const tB = getTokens(b);
  if (tA.size === 0 && tB.size === 0) return 1.0;
  if (tA.size === 0 || tB.size === 0) return 0.0;

  let intersection = 0;
  for (const t of tA) {
    if (tB.has(t)) intersection++;
  }
  const union = new Set([...tA, ...tB]).size;
  return union > 0 ? intersection / union : 0;
}

function checkAliasMatch(a: string, b: string): boolean {
  const normA = a.toLowerCase();
  const normB = b.toLowerCase();

  for (const [key, aliases] of Object.entries(COMMON_ALIASES)) {
    const group = [key, ...aliases];
    const hasA = group.some((term) => normA.includes(term));
    const hasB = group.some((term) => normB.includes(term));
    if (hasA && hasB) return true;
  }
  return false;
}

export function inferColumnMappings(
  source1Cols: ColumnProfile[],
  source2Cols: ColumnProfile[],
): ColumnMappingSuggestion[] {
  const suggestions: ColumnMappingSuggestion[] = [];
  const assignedS2 = new Set<string>();

  // Pass 1: For each Source 1 column, calculate similarity against all unassigned Source 2 columns
  for (const s1 of source1Cols) {
    let bestMatch: {
      s2Col: ColumnProfile;
      score: number;
      method: ColumnMappingSuggestion["mappingMethod"];
    } | null = null;

    const s1Norm = normalizeName(s1.name);

    for (const s2 of source2Cols) {
      if (assignedS2.has(s2.name)) continue;

      const s2Norm = normalizeName(s2.name);
      let score = 0;
      let method: ColumnMappingSuggestion["mappingMethod"] = "semantic";

      // 1. Exact match
      if (s1.name === s2.name) {
        score = 1.0;
        method = "exact";
      } else if (s1Norm === s2Norm) {
        // 2. Normalized match (e.g. order_id <-> orderId)
        score = 0.95;
        method = "normalized";
      } else {
        // 3. Token similarity
        const tokSim = tokenSimilarity(s1.name, s2.name);
        // 4. String similarity
        const strSim = stringSimilarity(s1Norm, s2Norm);
        // 5. Alias match
        const isAlias = checkAliasMatch(s1.name, s2.name);

        let combined = Math.max(tokSim, strSim);
        if (isAlias) {
          combined = Math.max(combined, 0.85);
        }

        // Type compatibility bonus or penalty
        const isTypeMatch = s1.inferredType === s2.inferredType;
        if (isTypeMatch) {
          combined = Math.min(1.0, combined + 0.05);
        } else if (
          (s1.inferredType === "integer" && s2.inferredType === "float") ||
          (s1.inferredType === "float" && s2.inferredType === "integer") ||
          (s1.inferredType === "date" && s2.inferredType === "timestamp") ||
          (s1.inferredType === "timestamp" && s2.inferredType === "date")
        ) {
          // Compatible
        } else {
          // Type clash penalty
          combined = combined * 0.8;
        }

        score = combined;
        method = isAlias ? "semantic" : strSim > tokSim ? "normalized" : "semantic";
      }

      if (score > 0.45 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { s2Col: s2, score, method };
      }
    }

    if (bestMatch && bestMatch.score >= 0.5) {
      assignedS2.add(bestMatch.s2Col.name);
      const isTypeMatch = s1.inferredType === bestMatch.s2Col.inferredType;

      // Primary key recommendation
      const isKeyCandidate =
        (s1.isLikelyKey && bestMatch.s2Col.isLikelyKey) ||
        (s1.name.toLowerCase().includes("id") && bestMatch.s2Col.name.toLowerCase().includes("id") && s1.uniquePercentage > 90);

      suggestions.push({
        source1Column: s1.name,
        source2Column: bestMatch.s2Col.name,
        detectedSimilarity: Math.round(bestMatch.score * 100) / 100,
        mappingMethod: bestMatch.method,
        isKey: isKeyCandidate,
        manuallyConfirmed: bestMatch.score >= 0.9,
        ignored: false,
        typeMatch: isTypeMatch,
      });
    } else {
      // Unmapped Source 1 column
      suggestions.push({
        source1Column: s1.name,
        source2Column: "",
        detectedSimilarity: 0,
        mappingMethod: "manual",
        isKey: s1.isLikelyKey,
        manuallyConfirmed: false,
        ignored: false,
        typeMatch: false,
      });
    }
  }

  // Ensure at least one key column is selected by default if available
  const hasKey = suggestions.some((s) => s.isKey && s.source2Column);
  if (!hasKey) {
    const firstUnique = suggestions.find((s) => {
      const s1 = source1Cols.find((c) => c.name === s.source1Column);
      return s1?.isLikelyKey && s.source2Column;
    });
    if (firstUnique) {
      firstUnique.isKey = true;
    } else {
      const firstMapped = suggestions.find((s) => s.source2Column);
      if (firstMapped) {
        firstMapped.isKey = true;
      }
    }
  }

  return suggestions;
}
