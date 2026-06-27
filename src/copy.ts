// Copy-to-clipboard buttons. Any [data-copy] element copies its attribute
// value and briefly flashes a confirmation in its [data-copy-label] child.

export function initCopyButtons(): void {
    const buttons = document.querySelectorAll<HTMLElement>("[data-copy]");

    buttons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const text = btn.getAttribute("data-copy") ?? "";
            const label = btn.querySelector<HTMLElement>("[data-copy-label]");
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                /* clipboard unavailable (insecure context) - flash anyway */
            }
            if (!label) return;
            const orig = label.textContent;
            label.textContent = "✓ copied";
            setTimeout(() => {
                label.textContent = orig;
            }, 1400);
        });
    });
}
