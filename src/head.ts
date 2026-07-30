// Parser-blocking head bootstrap. This stays separate from the deferred main
// module because the launch phase must be selected before the page paints.
(() => {
    const launch = Date.UTC(2026, 7, 1); // 2026-08-01T00:00:00Z
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

    if (phase !== "pre" && phase !== "post") {
        phase = Date.now() >= launch ? "post" : "pre";
    }

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
