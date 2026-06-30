// Entry point - wires up the interactive pieces of the landing page.
import { initStats } from "./stats.js";
import { initReveal } from "./reveal.js";
import { initCopyButtons } from "./copy.js";

async function init(): Promise<void> {
    // Refresh numbers/statuses from data/stats.json first, then animate them.
    await initStats();
    initReveal();
    initCopyButtons();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    void init();
}
