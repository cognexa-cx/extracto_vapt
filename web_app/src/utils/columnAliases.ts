// The extractor names the same field differently from row to row (address /
// addresses, email / emails, phone / phone_numbers ...). Tables built from
// the raw keys then show that field in two or three columns. These helpers
// merge the spellings into ONE column; each row's own stored key is only
// read, never renamed, so nothing is changed or lost.
const ALIAS_GROUPS: string[][] = [
  ["name", "company_name", "business_name", "organization_name", "organisation_name", "entity_name", "vendor_name", "supplier_name", "party_name", "firm_name"],
  ["address", "addresses", "office_address", "registered_address"],
  ["email", "emails", "email_id", "email_address"],
  ["phone_numbers", "phone_number", "phone", "phones", "mobile", "mobile_number", "contact_number", "contact_numbers", "telephone"],
  ["website", "websites", "web", "url"],
  ["member_since", "membership_since"],
  ["description", "business_description"],
];

export const canonicalKey = (k: string): string =>
  ALIAS_GROUPS.find((g) => g.includes(k))?.[0] || k;

const aliasesOf = (col: string): string[] =>
  ALIAS_GROUPS.find((g) => g[0] === col) || [col];

const isEmpty = (v: any) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Unique column keys for a list of row objects, with alias spellings merged. */
export const mergedColumns = (rows: any[]): string[] =>
  Array.from(
    new Set(rows.flatMap((r) => Object.keys(r || {}).map(canonicalKey))),
  );

/** The value of merged column `col` in `row` (first non-empty alias wins). */
export const pickCell = (row: any, col: string) => {
  if (!row) return undefined;
  const al = aliasesOf(col);
  const key = al.find((k) => k in row && !isEmpty(row[k])) ?? al.find((k) => k in row);
  return key === undefined ? undefined : row[key];
};

/** Readable text for a cell: lists line by line, objects as "Label: value". */
export const cellText = (v: any): string => {
  if (v === null || v === undefined || v === "") return "-";
  if (Array.isArray(v)) {
    const parts = v
      .map((x) => (x && typeof x === "object" ? cellText(x) : String(x)))
      .filter((x) => x && x !== "-");
    return parts.length ? parts.join("\n") : "-";
  }
  if (typeof v === "object") {
    const parts = Object.entries(v)
      .map(([k, x]) => {
        const t = cellText(x);
        return t === "-" ? "" : `${k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${t}`;
      })
      .filter(Boolean);
    return parts.length ? parts.join("\n") : "-";
  }
  return String(v);
};
