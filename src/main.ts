// Entry point - wires up the interactive pieces of the landing page.
import { initThemeToggle } from "./theme.js";
import { initHeroTerminal } from "./terminal.js";
import { initReveal } from "./reveal.js";
import { initCopyButtons } from "./copy.js";

function init(): void {
    initThemeToggle();
    initHeroTerminal();
    initReveal();
    initCopyButtons();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
