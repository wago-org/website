// Light/dark theme toggle. The initial theme is resolved before paint by a
// small inline script in <head> (see index.html), which reads the saved choice
// or the system preference and sets data-theme on <html>. This module only
// handles the toggle button and persistence.

type Theme = "light" | "dark";

const STORAGE_KEY = "wago-theme";
const THEME_COLOR: Record<Theme, string> = {
  light: "#f7f8fa",
  dark: "#0d0f12",
};

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

export function initThemeToggle(): void {
  const btn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  if (!btn) return;

  const sync = (theme: Theme): void => {
    btn.setAttribute("aria-pressed", String(theme === "dark"));
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  };
  sync(current());

  btn.addEventListener("click", () => {
    const next: Theme = current() === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — apply for this session only */
    }
    apply(next);
    sync(next);
  });
}
