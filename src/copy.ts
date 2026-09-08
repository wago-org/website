// Copy-to-clipboard buttons. Any [data-copy] element copies its attribute
// value and briefly shows the result in its [data-copy-label] child.

export function initCopyButtons(): void {
    const buttons = document.querySelectorAll<HTMLElement>("[data-copy]");
    const resetTimers = new WeakMap<HTMLElement, number>();

    buttons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const text = btn.getAttribute("data-copy") ?? "";
            const label = btn.querySelector<HTMLElement>("[data-copy-label]");
            const ok = await copyText(text);
            if (!label) return;
            const orig = label.dataset.copyOriginal ?? label.textContent ?? "";
            label.dataset.copyOriginal = orig;
            const previousTimer = resetTimers.get(btn);
            if (previousTimer !== undefined) window.clearTimeout(previousTimer);

            btn.dataset.copyState = ok ? "success" : "error";
            label.textContent = ok
                ? (btn.dataset.copySuccess ?? "✓ copied")
                : "⚠ copy failed";
            const resetDelay = Number(btn.dataset.copyResetDelay) || 1400;
            const resetTimer = window.setTimeout(() => {
                label.textContent = orig;
                delete btn.dataset.copyState;
                resetTimers.delete(btn);
            }, resetDelay);
            resetTimers.set(btn, resetTimer);
            if (ok) {
                btn.dispatchEvent(
                    new CustomEvent("copy-success", {
                        bubbles: true,
                        detail: { resetDelay },
                    }),
                );
            }
        });
    });
}

// Copies text, returning whether it actually landed on the clipboard.
async function copyText(text: string): Promise<boolean> {
    // Preferred path: the async Clipboard API — but it only exists in secure
    // contexts (https, or http://localhost). On a plain-HTTP LAN origin like
    // http://hub:3000, navigator.clipboard is undefined, so we fall through.
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            /* permission denied or non-secure — try the legacy path */
        }
    }
    return legacyCopy(text);
}

// Fallback for insecure contexts: select a hidden textarea and execCommand.
// Deprecated but still works where the Clipboard API is unavailable.
function legacyCopy(text: string): boolean {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch {
        ok = false;
    }
    document.body.removeChild(ta);
    return ok;
}
