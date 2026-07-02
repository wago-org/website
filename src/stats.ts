// Hydrate the page from data/stats.json - the file the "sync" CI job
// regenerates from wago's own SPECTEST.md / FEATURES.md. The HTML ships with
// sensible static defaults (so the page is correct with JS disabled and as a
// fallback if the fetch fails); when the JSON loads we refresh the numbers and
// rebuild the conformance table before reveal.ts animates them.

type Status = "pass" | "partial" | "planned" | "none";

interface Version {
  version: string;
  label: string;
  sub: string;
  status: Status;
  done: number;
  total: number;
  features: { label: string; status: Status }[];
}

interface Stats {
  mvp: { filesPass: number; filesTotal: number; percent: number; assertionsPass: number };
  coverage: number | null;
  versions: Version[];
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
  none: "tag--none",
};

// Pill text: "none" (not-planned) reads better as "n/a" on the page.
const TAG_TEXT: Record<Status, string> = {
  pass: "pass",
  partial: "partial",
  planned: "planned",
  none: "n/a",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

// Render one <details> dropdown per major wasm version, each listing its
// sub-features with a status pill. A shared name= makes them an exclusive
// accordion (opening one collapses the others, no JS needed); only the first
// group starts open. Long lists scroll inside the body rather than expanding the
// page (see .vgroup__body in CSS).
function renderVersions(versions: Version[]): void {
  const host = document.querySelector<HTMLElement>("[data-versions]");
  if (!host || !Array.isArray(versions) || versions.length === 0) return;
  host.innerHTML = versions
    .filter((v) => v && Array.isArray(v.features) && TAG_CLASS[v.status])
    .map((v, i) => {
      const rows = v.features
        .filter((f) => f && TAG_CLASS[f.status])
        .map(
          (f) =>
            `<div class="vgroup__row"><span class="vgroup__feat">${escapeHtml(
              f.label,
            )}</span><span class="tag ${TAG_CLASS[f.status]}">${TAG_TEXT[f.status]}</span></div>`,
        )
        .join("");
      const open = i === 0 ? " open" : "";
      return `<details class="vgroup" name="wasm-versions"${open}>\
<summary class="vgroup__head"><span class="vgroup__chevron" aria-hidden="true"></span>\
<span class="vgroup__title">${escapeHtml(v.label)}</span>\
<span class="vgroup__sub">${escapeHtml(v.sub)}</span>\
<span class="vgroup__count">${v.done}/${v.total}</span>\
<span class="tag ${TAG_CLASS[v.status]}">${TAG_TEXT[v.status]}</span></summary>\
<div class="vgroup__body">${rows}</div></details>`;
    })
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

  renderVersions(data.versions);
}
