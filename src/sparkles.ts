// Decorative background sparkles with depth. Sparkles are split across a few
// parallax layers: on scroll each layer translates by a fraction of the scroll
// offset, and on fine-pointer devices the layers also lean toward the cursor —
// far layers move least, near ones most, giving the field a sense of depth.
// Every so often a shooting star streaks down a side gutter. Purely cosmetic,
// painted behind all content (see .sparkles / .sparkle-layer / .sparkle in the
// CSS). The static sparkles in the HTML are the no-JS fallback.

const COLORS = ["var(--lilac)", "var(--green)", "var(--pink)"];
const GLYPH = "✦"; // ✦

// Parallax depth per layer: back layers move slowest (feel farthest away).
const DEPTHS = [0.12, 0.24, 0.42];
// How far (px) the near-most layer leans toward the cursor.
const POINTER_AMP = 26;

// Place a sparkle in the side gutter beside the ~1080px content column so it
// doesn't sit over the centered text. On narrow screens with no real gutter,
// fall back to a thin band at each edge. `t` runs 0 (screen edge) → 1 (inner
// edge of the band); inner ones fade out via --peak so any that creep toward
// the middle stay faint. `top` is a CSS length/percentage string.
function makeSparkle(w: number, top: string): HTMLSpanElement {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = GLYPH;

    const contentW = Math.min(1080, w - 48);
    const bandPx = Math.max((w - contentW) / 2, w * 0.12);
    const onLeft = Math.random() < 0.5;
    const t = Math.random();
    const xPx = onLeft ? t * bandPx : w - t * bandPx;
    const leftPct = Math.min(99, Math.max(0.5, (xPx / w) * 100));
    const peak = 1 - t * 0.6; // 1.0 at the edge, ~0.4 toward the middle

    s.style.top = top;
    s.style.left = leftPct.toFixed(2) + "%";
    s.style.fontSize = (11 + Math.random() * 14).toFixed(1) + "px";
    s.style.color = COLORS[(Math.random() * COLORS.length) | 0];
    s.style.setProperty("--peak", peak.toFixed(2));
    s.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
    s.style.animationDuration = (3 + Math.random() * 2).toFixed(2) + "s";
    return s;
}

// Roughly one sparkle per 900px² of vertical band, nudged up a little on wide
// screens so the fuller gutters don't feel sparse.
function densityPerPx(w: number): number {
    return (Math.min(Math.max(w / 900, 1), 2) * 5) / 1000;
}

// A shooting star: a bright glyph in a gutter that streaks down and fades. It
// lives outside the parallax layers and removes itself when the run finishes.
function shootStar(host: HTMLElement): void {
    const w = window.innerWidth || 1080;
    const contentW = Math.min(1080, w - 48);
    const bandPx = Math.max((w - contentW) / 2, w * 0.12);
    const onLeft = Math.random() < 0.5;
    const xPx = onLeft ? Math.random() * bandPx * 0.7 : w - Math.random() * bandPx * 0.7;

    const s = document.createElement("span");
    s.className = "shooting-star";
    s.textContent = GLYPH;
    s.style.left = ((xPx / w) * 100).toFixed(2) + "%";
    s.style.top = (Math.random() * 45).toFixed(1) + "%";
    s.style.color = COLORS[(Math.random() * COLORS.length) | 0];
    // Mostly downward, drifting a touch further into the gutter (outward).
    const sx = (onLeft ? -1 : 1) * (18 + Math.random() * 34);
    const sy = 90 + Math.random() * 90;
    s.style.setProperty("--sx", sx.toFixed(0) + "px");
    s.style.setProperty("--sy", sy.toFixed(0) + "px");
    s.addEventListener("animationend", () => s.remove());
    host.appendChild(s);
}

export function initSparkles(): void {
    const host = document.querySelector<HTMLElement>(".sparkles");
    if (!host) return;

    const reduce =
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: skip parallax and shooting stars, just fill the viewport
    // with a light static set.
    if (reduce) {
        const w = window.innerWidth || 1080;
        const n = Math.round(Math.min(Math.max(w / 80, 6), 26));
        host.replaceChildren(
            ...Array.from({ length: n }, () =>
                makeSparkle(w, (2 + Math.random() * 96).toFixed(2) + "%"),
            ),
        );
        return;
    }

    let layers: HTMLElement[] = [];
    let signature = "";
    let scrollY = 0;
    let pnx = 0; // pointer offset from center, -0.5..0.5
    let pny = 0;
    let raf = 0;

    const apply = (): void => {
        raf = 0;
        for (let i = 0; i < layers.length; i++) {
            const d = DEPTHS[i];
            const x = pnx * d * POINTER_AMP;
            const y = -scrollY * d + pny * d * POINTER_AMP;
            layers[i].style.transform =
                "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
        }
    };
    const schedule = (): void => {
        if (!raf) raf = requestAnimationFrame(apply);
    };

    const build = (): void => {
        const w = window.innerWidth || 1080;
        const vh = window.innerHeight || 800;
        const docH = Math.max(document.documentElement.scrollHeight, vh);
        // Rebuild only when the width bucket or page height shifts noticeably.
        const sig = Math.round(w / 40) + ":" + Math.round(docH / 200);
        if (sig === signature) return;
        signature = sig;

        const density = densityPerPx(w);
        layers = DEPTHS.map((d) => {
            const layer = document.createElement("div");
            layer.className = "sparkle-layer";
            // The vertical span this layer can ever expose in the viewport as
            // you scroll: spreading sparkles across it keeps density even and
            // the field populated top to bottom.
            const band = (docH - vh) * d + vh;
            const n = Math.max(4, Math.round(band * density));
            for (let i = 0; i < n; i++) {
                layer.appendChild(
                    makeSparkle(w, (Math.random() * band).toFixed(0) + "px"),
                );
            }
            return layer;
        });
        host.replaceChildren(...layers);
        apply();
    };

    build();

    window.addEventListener(
        "scroll",
        () => {
            scrollY = window.scrollY || window.pageYOffset || 0;
            schedule();
        },
        { passive: true },
    );

    // Cursor lean, only where a precise pointer exists (skips touch screens).
    if (typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches) {
        window.addEventListener(
            "pointermove",
            (e) => {
                const w = window.innerWidth || 1080;
                const vh = window.innerHeight || 800;
                pnx = e.clientX / w - 0.5;
                pny = e.clientY / vh - 0.5;
                schedule();
            },
            { passive: true },
        );
    }

    // Occasional shooting star, paused while the tab is hidden.
    const scheduleStar = (): void => {
        const delay = 6000 + Math.random() * 9000;
        window.setTimeout(() => {
            if (!document.hidden) shootStar(host);
            scheduleStar();
        }, delay);
    };
    scheduleStar();

    let timer = 0;
    window.addEventListener(
        "resize",
        () => {
            clearTimeout(timer);
            timer = window.setTimeout(build, 200);
        },
        { passive: true },
    );
}
