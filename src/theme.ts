type Theme = "light" | "dark";

const storageKey = "wagoTheme";

function activeTheme(): Theme {
    const value = document.documentElement.dataset.theme;
    if (value === "light" || value === "dark") return value;
    return "dark";
}

function renderTheme(theme: Theme, toggle: HTMLButtonElement): void {
    const next = theme === "dark" ? "light" : "dark";
    const label = `Switch to ${next} mode`;

    document.documentElement.dataset.theme = theme;
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    toggle.setAttribute("aria-pressed", String(theme === "light"));
    document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "light" ? "#f7f4ff" : "#1a1547");
}

export function initTheme(): void {
    const toggle = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
    if (!toggle) return;

    renderTheme(activeTheme(), toggle);

    toggle.addEventListener("click", () => {
        const theme: Theme = activeTheme() === "dark" ? "light" : "dark";
        try {
            localStorage.setItem(storageKey, theme);
        } catch {
            // The toggle still works for this page load when storage is blocked.
        }
        renderTheme(theme, toggle);
    });
}
