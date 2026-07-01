// Install split-button: the "Install wago" trigger expands into two option
// buttons (curl / go get). Copying is handled by initCopyButtons via each
// option's [data-copy]; this module only owns the open/close toggle.

export function initInstallSplit(): void {
    const split = document.querySelector<HTMLElement>("[data-install-split]");
    if (!split) return;

    const trigger = split.querySelector<HTMLButtonElement>(".install-split__trigger");
    if (!trigger) return;

    // Auto-collapse back to the trigger after this much idle time. Any pointer
    // movement or key press over the component resets the countdown, so it only
    // fires once the user has stopped interacting. Overridable for tests.
    const collapseMs = Number(split.getAttribute("data-collapse-ms")) || 5000;
    let timer: number | undefined;

    const clearTimer = (): void => {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    };

    const close = (): void => {
        clearTimer();
        if (!split.classList.contains("is-open")) return;
        split.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
    };

    const armCollapse = (): void => {
        clearTimer();
        if (split.classList.contains("is-open")) {
            timer = setTimeout(close, collapseMs);
        }
    };

    const open = (): void => {
        split.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        // Move focus onto the first revealed option for keyboard users.
        split.querySelector<HTMLButtonElement>(".install-split__opt")?.focus();
        armCollapse();
    };

    trigger.addEventListener("click", open);

    // Reset the idle countdown while the user is actively using the component.
    split.addEventListener("pointermove", armCollapse);
    split.addEventListener("pointerdown", armCollapse);
    split.addEventListener("keydown", armCollapse);

    // Dismiss on outside click or Escape, but keep it open while interacting
    // with the options (so the "✓ copied" flash stays visible).
    document.addEventListener("click", (e) => {
        if (!split.contains(e.target as Node)) close();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            close();
            trigger.focus();
        }
    });
}
