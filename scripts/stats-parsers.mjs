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

// Parse the old detailed feature matrix and the current proposal tables. In
// the latter, status is the second column and the third is perspective.
export function parseFeatureRows(text) {
  const statuses = [["🚧", "partial"], ["🔌", "plugin"], ["✅", "done"], ["✔", "done"], ["🏁", "flag"], ["⬜", "planned"], ["⏱", "planned"], ["❌", "unsupported"], ["🕳", "none"]];
  const rows = [];
  let mvp = false;
  let statusIndex = -1;
  for (const line of text.split("\n")) {
    const heading = line.match(/^(#{2,6})\s+(.*)/);
    if (heading) {
      mvp = heading[1].length >= 3 && /^WebAssembly\s+1\.0\s*\(MVP\)$/i.test(heading[2].trim());
      statusIndex = -1;
      continue;
    }
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (/^feature$/i.test(cells[0] ?? "")) {
      statusIndex = cells.findIndex((cell) => /^status$/i.test(cell));
      continue;
    }
    if (statusIndex < 0 || cells.length <= statusIndex) continue;
    const hit = statuses.find(([symbol]) => cells[statusIndex].includes(symbol));
    if (!hit && cells[statusIndex] !== "") continue;
    const feature = cells[0].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
    if (feature) rows.push({ feature, status: hit?.[1] ?? "unknown", mvp });
  }
  if (rows.length < 10) throw new Error(`FEATURES.md: only parsed ${rows.length} feature rows - format changed?`);
  return rows;
}

export function parsePlatformTargets(text) {
  const normalized = text.replace(/\s+/g, " ");
  const common = ["linux/amd64", "linux/arm64", "darwin/amd64", "darwin/arm64", "windows/amd64", "windows/arm64"];
  if (normalized.includes("Wago supports Linux on amd64, arm64, and riscv64, plus macOS and Windows on amd64 and arm64")) return [...common, "linux/riscv64"];
  if (normalized.includes("Wago supports Linux, macOS, and Windows on amd64 and arm64")) return common;
  throw new Error("README.md: platform support statement changed");
}
