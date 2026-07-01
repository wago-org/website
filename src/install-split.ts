// Install split-button: the "Install wago" trigger expands into two option
// buttons (curl / go get). Copying is handled by initCopyButtons via each
// option's [data-copy]; this module only owns the open/close toggle.

export function initInstallSplit(): void {
    const split = document.querySelector<HTMLElement>("[data-install-split]");
    if (!split) return;

    const trigger = split.querySelector<HTMLButtonElement>(".install-split__trigger");
    if (!trigger) return;

    const open = (): void => {
        split.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        // Move focus onto the first revealed option for keyboard users.
        split.querySelector<HTMLButtonElement>(".install-split__opt")?.focus();
    };

    const close = (): void => {
        if (!split.classList.contains("is-open")) return;
        split.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", open);

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
