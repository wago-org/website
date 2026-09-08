// Parser-blocking head bootstrap. This stays separate from the deferred main
// module because theme and launch phase must be selected before the page paints.
(() => {
    const key = "wagoTheme";
    let theme: "light" | "dark" = "dark";

    try {
        const stored = localStorage.getItem(key);
        if (stored === "light" || stored === "dark") {
            theme = stored;
        } else if (stored !== null) {
            // Migrate the previous system-bound preference format.
            const preference = JSON.parse(stored) as {
                theme?: unknown;
            };
            if (preference.theme === "light" || preference.theme === "dark") {
                theme = preference.theme;
                localStorage.setItem(key, theme);
            } else {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // Storage may be unavailable; keep the dark default.
    }

    document.documentElement.dataset.theme = theme;
    document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "light" ? "#f7f4ff" : "#1a1547");
})();

(() => {
    let phase: string | null = null;

    try {
        const requested = new URLSearchParams(location.search).get("phase");
        if (requested === "pre" || requested === "post") {
            localStorage.setItem("wagoPhase", requested);
        }
        phase = localStorage.getItem("wagoPhase");
    } catch {
        // Storage may be unavailable; the date-based default still works.
    }

    // Do not infer a release from the calendar. The canonical Wago source still
    // describes a pre-v0.1 private preview; `?phase=post` remains available for
    // explicitly previewing the eventual public-release layout.
    if (phase !== "pre" && phase !== "post") phase = "pre";

    document.documentElement.classList.remove("phase-pre", "phase-post");
    document.documentElement.classList.add(`phase-${phase}`);
})();

// GoatCounter is cookie-free and only loads on the production hostname so
// local development and preview traffic are not counted.
if (location.hostname === "wago.sh") {
    const analytics = document.createElement("script");
    analytics.async = true;
    analytics.src = "https://gc.zgo.at/count.js";
    analytics.dataset.goatcounter = "https://wago.goatcounter.com/count";
    document.head.appendChild(analytics);
}
