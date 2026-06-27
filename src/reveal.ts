// Scroll-triggered reveals: animated count-up numbers ([data-count]) and
// progress bars ([data-bar]). Each element animates once when it scrolls
// into view. Falls back to final values without IntersectionObserver or
// under prefers-reduced-motion.

const filled = new WeakSet<Element>();

function countUp(node: HTMLElement): void {
  const target = parseFloat(node.getAttribute("data-target") ?? "0");
  const suffix = node.getAttribute("data-suffix") ?? "";
  const comma = target >= 1000;
  const dur = 1100;

  const fmt = (v: number): string => {
    const n = comma
      ? "~" + Math.round(v).toLocaleString("en-US")
      : String(Math.round(v));
    return n + suffix;
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    node.textContent = fmt(target);
    return;
  }

  const t0 = performance.now();
  const tick = (now: number): void => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else node.textContent = fmt(target);
  };
  requestAnimationFrame(tick);
}

function fill(node: HTMLElement): void {
  if (filled.has(node)) return;
  filled.add(node);
  if (node.hasAttribute("data-bar")) {
    node.style.width = (node.getAttribute("data-width") ?? "0") + "%";
  }
  if (node.hasAttribute("data-count")) {
    countUp(node);
  }
}

export function initReveal(): void {
  const nodes = document.querySelectorAll<HTMLElement>("[data-count],[data-bar]");
  if (!nodes.length) return;

  if (!("IntersectionObserver" in window)) {
    nodes.forEach(fill);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          fill(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  // Fill anything already on screen, observe the rest.
  const vh = window.innerHeight || 800;
  nodes.forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0) fill(n);
    else io.observe(n);
  });
}
