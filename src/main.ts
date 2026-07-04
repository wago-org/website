// Entry point - wires up the interactive pieces of the landing page.
import { initStats } from "./stats.js";
import { initReveal } from "./reveal.js";
import { initTabs } from "./tabs.js";
import { initCopyButtons } from "./copy.js";
import { initInstallSplit } from "./install-split.js";
import { initSparkles } from "./sparkles.js";
import { initScrollSpy } from "./scrollspy.js";
import { initEditor } from "./editor.js";

async function init(): Promise<void> {
    initSparkles();
    initEditor();
    // Refresh numbers/statuses from data/stats.json first, then animate them.
    await initStats();
    initTabs();
    initReveal();
    initCopyButtons();
    initInstallSplit();
    initScrollSpy();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    void init();
}
