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

// The end-to-end chart has a matched ARM64/AMD64 dataset. Prefer the visitor's
// architecture when the browser exposes it, while keeping an explicit switch
// for browsers (notably Safari) that intentionally hide CPU architecture.
export function initStartupArchitecture(): void {
  const rail = document.querySelector<HTMLElement>("[data-startup-arch-toggle]");
  if (!rail) return;
  const tabs = Array.from(rail.querySelectorAll<HTMLButtonElement>("[data-startup-arch-target]"));
  if (!tabs.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let manuallySelected = false;

  const select = (arch: string, focus = false): void => {
    tabs.forEach((tab) => {
      const on = tab.dataset.startupArchTarget === arch;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !on;
      if (on && panel) {
        const active = panel.querySelector<HTMLElement>('.chart__panel:not([hidden])');
        if (active) fillBars(active, reduce);
        if (focus) tab.focus({ preventScroll: true });
      }
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      manuallySelected = true;
      select(tab.dataset.startupArchTarget ?? "arm64");
    });
    tab.addEventListener("keydown", (event) => {
      let next = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      manuallySelected = true;
      select(tabs[next]?.dataset.startupArchTarget ?? "arm64", true);
    });
  });

  const detected = detectArchitecture();
  if (detected) select(detected);

  const uaData = (navigator as Navigator & {
    userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }> };
  }).userAgentData;
  void uaData?.getHighEntropyValues?.(["architecture", "bitness"]).then((values) => {
    if (manuallySelected) return;
    const architecture = normalizeArchitecture(`${values.architecture ?? ""}${values.bitness ?? ""}`);
    if (architecture) select(architecture);
  }).catch(() => {});
}

function detectArchitecture(): "arm64" | "amd64" | null {
  const hint = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  return normalizeArchitecture(hint) ?? (/macintosh|macintel|iphone|ipad|android/.test(hint) ? "arm64" : null);
}

function normalizeArchitecture(value: string): "arm64" | "amd64" | null {
  const hint = value.toLowerCase();
  if (/arm64|aarch64|armv8|arm64-bit/.test(hint) || /^arm64?$/.test(hint)) return "arm64";
  if (/amd64|x86_64|x86-64|win64|x64|x8664/.test(hint) || /^x86(?:64)?$/.test(hint)) return "amd64";
  return null;
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

// The benchmark platform controls carry the active category across architecture
// and backend switches, while preserving the row-list scroll position.
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

  const activeBackendPanel = (arch: HTMLElement | null): HTMLElement | null =>
    arch?.querySelector<HTMLElement>(".vs__backendpanel:not([hidden])") ?? null;
  const catTabs = (panel: HTMLElement | null): HTMLButtonElement[] =>
    activeBackendPanel(panel)
      ? Array.from(
          activeBackendPanel(panel)!.querySelectorAll<HTMLButtonElement>('.vs__tabs [role="tab"]')
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
  const backendTabs = (arch: HTMLElement | null): HTMLButtonElement[] =>
    arch
      ? Array.from(
          arch.querySelectorAll<HTMLButtonElement>('[data-backend-toggle] > [role="tab"]')
        )
      : [];
  const activeBackend = (arch: HTMLElement | null): number =>
    Math.max(
      0,
      backendTabs(arch).findIndex(
        (tab) => tab.getAttribute("aria-selected") === "true"
      )
    );
  const selectBackend = (arch: HTMLElement | null, idx: number): void => {
    backendTabs(arch).forEach((button, i) => {
      const on = i === idx;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
      const target = document.getElementById(button.getAttribute("aria-controls") ?? "");
      if (target) target.hidden = !on;
    });
  };
  const catPanel = (arch: HTMLElement | null): HTMLElement | null =>
    activeBackendPanel(arch)?.querySelector<HTMLElement>(
      ".vs__main > .vs__panel:not([hidden])"
    ) ?? null;

  const select = (idx: number, focus = false): void => {
    const from = activeArch();
    if (idx === from) {
      if (focus) tabs[idx]?.focus({ preventScroll: true });
      return;
    }
    const cat = activeCat(panels[from]); // category to carry over
    const backend = activeBackend(panels[from]);
    // Also carry how far down the row list you are, as a fraction, so 30% down on
    // amd64 resumes at 30% down on arm64 (heights can differ between the two).
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

    selectBackend(panels[idx], backend);
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

  panels.forEach((arch) => {
    const buttons = backendTabs(arch);
    buttons.forEach((button, i) => {
      const activate = (focus = false): void => {
        const from = activeBackend(arch);
        if (i === from) {
          if (focus) button.focus({ preventScroll: true });
          return;
        }
        const cat = activeCat(arch);
        const src = catPanel(arch);
        const srcRange = src ? src.scrollHeight - src.clientHeight : 0;
        const ratio = src && srcRange > 0 ? src.scrollTop / srcRange : 0;
        const x = window.scrollX;
        const y = window.scrollY;

        selectBackend(arch, i);
        const target = catTabs(arch);
        if (cat >= 0 && cat < target.length) target[cat]?.click();
        const dst = catPanel(arch);
        if (dst) {
          const dstRange = dst.scrollHeight - dst.clientHeight;
          dst.scrollTop = dstRange > 0 ? Math.round(ratio * dstRange) : 0;
        }
        window.scrollTo(x, y);
        if (focus) button.focus({ preventScroll: true });
      };

      button.addEventListener("click", () => activate());
      button.addEventListener("keydown", (event) => {
        let next = -1;
        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            next = i === buttons.length - 1 ? 0 : i + 1;
            break;
          case "ArrowLeft":
          case "ArrowUp":
            next = i === 0 ? buttons.length - 1 : i - 1;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = buttons.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        buttons[next]?.click();
        buttons[next]?.focus({ preventScroll: true });
      });
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
