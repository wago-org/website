// Tabbed panels (the performance section's General/Compile/Instantiate/Exec
// control). Each [data-tabs] tablist owns a set of [role=tab] buttons and their
// [role=tabpanel] panels. Switching a tab reveals its panel and re-animates the
// panel's [data-bar] fills — hidden panels never intersect the viewport, so the
// scroll-reveal in reveal.ts can't fill them; tabs.ts does it on activation.
//
// The default tab is left to reveal.ts (it fills on scroll-in like before), so
// the first paint keeps the scroll animation. Without JS, only the initially
// unhidden panel shows — a graceful, if static, fallback.

export function initTabs(): void {
  document
    .querySelectorAll<HTMLElement>("[data-tabs]")
    .forEach(setupTablist);
}

function setupTablist(list: HTMLElement): void {
  const tabs = Array.from(
    list.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );
  if (!tabs.length) return;
  const panels = tabs.map((t) =>
    document.getElementById(t.getAttribute("aria-controls") ?? "")
  );
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const select = (idx: number, animate: boolean, focus = false): void => {
    tabs.forEach((tab, i) => {
      const on = i === idx;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = !on;
      if (on) {
        if (animate && panel) fillBars(panel, reduce);
        if (focus) tab.focus();
      }
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i, true));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      let next = -1;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = i === last ? 0 : i + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = i === 0 ? last : i - 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = last;
          break;
        default:
          return;
      }
      e.preventDefault();
      select(next, true, true);
    });
  });

  // Initialize from the markup's selected tab without animating — reveal.ts
  // handles the initially-visible panel's bars on scroll.
  const initial = Math.max(
    0,
    tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")
  );
  select(initial, false);
}

function fillBars(panel: HTMLElement, reduce: boolean): void {
  const bars = panel.querySelectorAll<HTMLElement>("[data-bar]");
  bars.forEach((bar) => {
    const width = (bar.getAttribute("data-width") ?? "0") + "%";
    if (reduce) {
      bar.style.width = width;
      return;
    }
    // Reset to 0 and force a reflow so the CSS width transition re-runs each
    // time the tab is opened.
    bar.style.width = "0%";
    void bar.offsetWidth;
    requestAnimationFrame(() => {
      bar.style.width = width;
    });
  });
}

// The architecture toggle (linux/amd64 ↔ darwin/arm64). Unlike a plain tablist it
// carries the active benchmark category across a switch — pick "Instantiate" on
// amd64, flip to arm64, and you land on arm64's "Instantiate" — and it preserves
// the scroll position so toggling never jumps the page.
export function initArchToggle(): void {
  const rail = document.querySelector<HTMLElement>("[data-arch-toggle]");
  if (!rail) return;
  const tabs = Array.from(
    rail.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );
  if (!tabs.length) return;
  const panels = tabs.map((t) =>
    document.getElementById(t.getAttribute("aria-controls") ?? "")
  );

  const catTabs = (panel: HTMLElement | null): HTMLButtonElement[] =>
    panel
      ? Array.from(
          panel.querySelectorAll<HTMLButtonElement>('.vs__tabs [role="tab"]')
        )
      : [];
  const activeCat = (panel: HTMLElement | null): number =>
    catTabs(panel).findIndex(
      (t) => t.getAttribute("aria-selected") === "true"
    );
  const activeArch = (): number =>
    Math.max(
      0,
      tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")
    );

  const select = (idx: number, focus = false): void => {
    const from = activeArch();
    if (idx === from) {
      if (focus) tabs[idx]?.focus({ preventScroll: true });
      return;
    }
    const cat = activeCat(panels[from]); // category to carry over
    // Also carry how far down the row list you are, as a fraction, so 30% down on
    // amd64 resumes at 30% down on arm64 (heights can differ between the two).
    const catPanel = (arch: HTMLElement | null): HTMLElement | null =>
      arch?.querySelector<HTMLElement>(
        ".vs__main > .vs__panel:not([hidden])"
      ) ?? null;
    const src = catPanel(panels[from]);
    const srcRange = src ? src.scrollHeight - src.clientHeight : 0;
    const ratio = src && srcRange > 0 ? src.scrollTop / srcRange : 0;
    const x = window.scrollX;
    const y = window.scrollY; // freeze the page scroll across the swap

    tabs.forEach((tab, i) => {
      const on = i === idx;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = !on;
    });

    // Mirror the category onto the newly shown architecture. Clicking the target
    // tab reuses the tablist logic above (reveals its panel, re-animates bars).
    const target = catTabs(panels[idx]);
    if (cat >= 0 && cat < target.length) target[cat]?.click();

    // Resume the row list at the same fraction on the new architecture.
    const dst = catPanel(panels[idx]);
    if (dst) {
      const dstRange = dst.scrollHeight - dst.clientHeight;
      dst.scrollTop = dstRange > 0 ? Math.round(ratio * dstRange) : 0;
    }

    window.scrollTo(x, y);
    if (focus) tabs[idx]?.focus({ preventScroll: true });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      let next = -1;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = i === last ? 0 : i + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = i === 0 ? last : i - 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = last;
          break;
        default:
          return;
      }
      e.preventDefault();
      select(next, true);
    });
  });
}

// One-time "there's more" nudge. When a capped category panel scrolls and the
// user has parked on it for ~2s without scrolling, gently bounce it down and back
// so they notice the list continues. Fires at most once per page load, and stands
// down for good the moment the user scrolls a panel themselves. Honors
// prefers-reduced-motion (then it simply never fires).
export function initScrollCue(): void {
  const vs = document.querySelector<HTMLElement>(".vs");
  if (!vs) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let nudged = false;
  let timer = 0;

  const activePanel = (): HTMLElement | null =>
    vs.querySelector<HTMLElement>(
      ".vs__archpanel:not([hidden]) .vs__main > .vs__panel:not([hidden])"
    );

  const arm = (): void => {
    window.clearTimeout(timer);
    if (nudged || reduce) return;
    timer = window.setTimeout(() => {
      const p = activePanel();
      if (nudged || !p) return;
      if (p.scrollHeight - p.clientHeight > 8 && p.scrollTop === 0) {
        nudged = true; // set first so the bounce's own scroll events are ignored
        p.scrollTo({ top: 80, behavior: "smooth" });
        window.setTimeout(() => p.scrollTo({ top: 0, behavior: "smooth" }), 700);
      }
    }, 2000);
  };

  // Re-arm after the visible panel changes (category or architecture switch).
  vs.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest('[role="tab"]')) {
      window.setTimeout(arm, 0); // after the tab/arch swap settles
    }
  });
  // A genuine user scroll means they've found it — never nudge again.
  vs.querySelectorAll<HTMLElement>(".vs__main > .vs__panel").forEach((p) => {
    p.addEventListener(
      "scroll",
      () => {
        if (nudged) return; // our own bounce also scrolls; ignore once armed
        nudged = true;
        window.clearTimeout(timer);
      },
      { passive: true }
    );
  });

  arm(); // the tab shown on load
}
