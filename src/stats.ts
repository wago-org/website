// Hydrate the page from data/stats.json - the file the "sync" CI job
// regenerates from wago's own SPECTEST.md / FEATURES.md. The HTML ships with
// sensible static defaults (so the page is correct with JS disabled and as a
// fallback if the fetch fails); when the JSON loads we refresh the numbers and
// rebuild the conformance table before reveal.ts animates them.

type Status = "pass" | "partial" | "planned";

interface Stats {
  mvp: { filesPass: number; filesTotal: number; percent: number; assertionsPass: number };
  coverage: number | null;
  summary: { label: string; status: Status }[];
}

// Point every [data-count][data-stat=key] node at a fresh target so reveal.ts
// animates to the live value.
function setTargets(key: string, value: number): void {
  document.querySelectorAll<HTMLElement>(`[data-stat="${key}"]`).forEach((n) => {
    n.setAttribute("data-target", String(value));
  });
}

const TAG_CLASS: Record<Status, string> = {
  pass: "tag--pass",
  partial: "tag--partial",
  planned: "tag--planned",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function renderSummary(rows: Stats["summary"]): void {
  const host = document.querySelector<HTMLElement>("[data-summary]");
  if (!host || !Array.isArray(rows) || rows.length === 0) return;
  host.innerHTML = rows
    .filter((r) => r && TAG_CLASS[r.status])
    .map(
      (r) =>
        `<div class="summary__row"><span class="summary__label">${escapeHtml(
          r.label,
        )}</span><span class="tag ${TAG_CLASS[r.status]}">${r.status}</span></div>`,
    )
    .join("");
}

export async function initStats(): Promise<void> {
  let data: Stats;
  try {
    const res = await fetch("/data/stats.json", { cache: "no-cache" });
    if (!res.ok) return;
    data = (await res.json()) as Stats;
  } catch {
    return; // keep the static fallback already in the HTML
  }
  if (!data?.mvp) return;

  setTargets("files", data.mvp.filesPass);
  setTargets("assertions", data.mvp.assertionsPass);
  setTargets("conf", data.mvp.percent);
  if (typeof data.coverage === "number") setTargets("coverage", data.coverage);

  document.querySelectorAll<HTMLElement>("[data-stat-total]").forEach((n) => {
    n.textContent = "/" + data.mvp.filesTotal;
  });
  document.querySelectorAll<HTMLElement>("[data-stat-bar]").forEach((n) => {
    n.setAttribute("data-width", String(data.mvp.percent));
  });

  renderSummary(data.summary);
}
