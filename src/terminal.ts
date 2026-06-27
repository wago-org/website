// Hero terminal typewriter. Renders a short scripted `bash` session into
// #hero-term with a blinking caret. Respects prefers-reduced-motion.

type ScriptItem =
  | { type: "cmd"; text: string }
  | { type: "out"; text?: string; html?: string }
  | { type: "gap" };

const PROMPT = '<span style="color:var(--green)">$</span> ';
const CARET = '<span class="terminal__caret">▋</span>';

const G = (s: string): string => `<span style="color:var(--green)">${s}</span>`;

const SCRIPT: readonly ScriptItem[] = [
  { type: "cmd", text: "go get github.com/wago-org/wago" },
  { type: "out", text: "go: added github.com/wago-org/wago v0.1.0" },
  { type: "gap" },
  { type: "cmd", text: "wago run fib.wasm 30" },
  { type: "out", html: G("832040") },
  { type: "gap" },
  { type: "cmd", text: "wago run --invoke hypot fprog.wasm 3 4" },
  { type: "out", html: G("5") },
  { type: "gap" },
  { type: "cmd", text: "wago compile fib.wasm -o fib.wago" },
  { type: "out", text: "wrote fib.wago (1.2 KB)" },
  { type: "gap" },
  { type: "cmd", text: "wago validate fib.wasm" },
  { type: "out", html: G("✓ valid") },
];

export function initHeroTerminal(): void {
  const el = document.getElementById("hero-term");
  if (!el) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lines: string[] = [];

  const render = (active: string | null): void => {
    el.innerHTML =
      lines.join("\n") + (active !== null ? "\n" + active : "") + CARET;
  };

  // Reduced motion: render the finished transcript immediately.
  if (reduce) {
    for (const item of SCRIPT) {
      if (item.type === "gap") lines.push("");
      else if (item.type === "out") lines.push(item.html ?? item.text ?? "");
      else lines.push(PROMPT + item.text);
    }
    render(null);
    return;
  }

  let si = 0;
  let ci = 0;

  const step = (): void => {
    if (si >= SCRIPT.length) {
      render(null);
      return;
    }
    const item = SCRIPT[si];

    if (item.type === "gap") {
      lines.push("");
      si++;
      ci = 0;
      setTimeout(step, 120);
      return;
    }
    if (item.type === "out") {
      lines.push(item.html ?? item.text ?? "");
      si++;
      ci = 0;
      setTimeout(step, 420);
      return;
    }
    // cmd: typewriter, character by character
    const full = item.text;
    if (ci <= full.length) {
      render(PROMPT + full.slice(0, ci));
      ci++;
      setTimeout(step, 34 + Math.random() * 36);
    } else {
      lines.push(PROMPT + full);
      si++;
      ci = 0;
      setTimeout(step, 360);
    }
  };

  setTimeout(step, 500);
}
