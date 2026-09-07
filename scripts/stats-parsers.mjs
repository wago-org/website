export function parseSIMDAssertions(text) {
  const rows = text
    .split("\n")
    .filter(
      (line) =>
        /^\|\s*(?:\*\*)?SIMD(?:\s|`|\(|\|)/i.test(line),
    );
  const row = rows.find((line) => /\bofficial\b/i.test(line)) ?? rows.find((line) => /\bexecution assertions\b/i.test(line));
  const match = row?.match(/([\d,]+)\s+assertions\b/i) ?? row?.match(/^\|\s*(?:\*\*)?SIMD(?:\s|`|\(|\|).*?\|\s*([\d,]+)\s*\|/i);
  if (!match) {
    throw new Error("FEATURES.md: could not find the official SIMD assertion count");
  }
  return Number(match[1].replace(/,/g, ""));
}
