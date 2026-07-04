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
