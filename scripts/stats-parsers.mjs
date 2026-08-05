export function parseSIMDAssertions(text) {
  const row = text
    .split("\n")
    .find(
      (line) =>
        /^\|\s*(?:\*\*)?SIMD(?:\s|`|\()/i.test(line) &&
        /\bofficial\b/i.test(line),
    );
  const match = row?.match(/([\d,]+)\s+assertions\b/i);
  if (!match) {
    throw new Error("FEATURES.md: could not find the official SIMD assertion count");
  }
  return Number(match[1].replace(/,/g, ""));
}
