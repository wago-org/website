// Hero install disclosure. Platform switching is handled by tabs.ts and command
// copying by copy.ts; this module owns only disclosure state and dismissal.

export function initInstallSplit(): void {
    const split = document.querySelector<HTMLElement>("[data-install-split]");
    if (!split) return;

    const trigger = split.querySelector<HTMLButtonElement>(".install-split__trigger");
    const panel = split.querySelector<HTMLElement>(".install-split__panel");
    if (!trigger || !panel) return;
    const closeButton = panel.querySelector<HTMLButtonElement>(".install-split__close");
    const commands = panel.querySelectorAll<HTMLElement>(".install-command");
    let collapseTimer: number | undefined;
    let closeAnimationTimer: number | undefined;

    const finishClose = (): void => {
        if (closeAnimationTimer !== undefined) {
            window.clearTimeout(closeAnimationTimer);
            closeAnimationTimer = undefined;
        }
        split.classList.remove("is-closing");
        panel.hidden = true;
    };

    const close = (): void => {
        if (collapseTimer !== undefined) {
            window.clearTimeout(collapseTimer);
            collapseTimer = undefined;
        }
        if (!split.classList.contains("is-open")) return;
        split.classList.remove("is-open");
        split.classList.add("is-closing");
        trigger.setAttribute("aria-expanded", "false");
        const closeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 280;
        closeAnimationTimer = window.setTimeout(finishClose, closeDuration);
    };

    const open = (): void => {
        if (closeAnimationTimer !== undefined) finishClose();
        split.style.setProperty("--install-trigger-width", `${trigger.offsetWidth}px`);
        split.style.setProperty("--install-trigger-height", `${trigger.offsetHeight}px`);
        split.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        panel.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
    };

    trigger.addEventListener("click", () => {
        if (split.classList.contains("is-open")) close();
        else open();
    });
    closeButton?.addEventListener("click", () => {
        close();
        trigger.focus();
    });

    commands.forEach((command) => {
        command.addEventListener("click", (event) => {
            const target = event.target;
            if (target instanceof Element && target.closest("[data-copy]")) return;
            command.querySelector<HTMLButtonElement>("[data-copy]")?.click();
        });
    });

    panel.addEventListener("copy-success", (event) => {
        if (collapseTimer !== undefined) window.clearTimeout(collapseTimer);
        const resetDelay =
            event instanceof CustomEvent && typeof event.detail?.resetDelay === "number"
                ? event.detail.resetDelay
                : 1400;
        collapseTimer = window.setTimeout(() => {
            collapseTimer = undefined;
            close();
        }, resetDelay);
    });

    // Dismiss on outside click or Escape, but keep it open while interacting
    // with the options (so the "✓ copied" flash stays visible).
    document.addEventListener("click", (e) => {
        if (!split.contains(e.target as Node)) close();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && split.classList.contains("is-open")) {
            close();
            trigger.focus();
        }
    });
}
