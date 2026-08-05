// The quickstart is a tabbed terminal walkthrough. Replay advances through the
// install, Fibonacci, plugin, and WASI steps; Expand grows it in place.
// No-ops if the demo isn't present.

const REDUCED =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

const STEP_DELAY = 760;

function replayQuickstart(
    btn: HTMLButtonElement,
    label: HTMLElement,
    tabs: HTMLButtonElement[],
    select: (index: number, focus: boolean) => void,
): void {
    if (REDUCED) {
        select(tabs.length - 1, false);
        return;
    }
    btn.disabled = true;
    label.textContent = "Playing";
    let step = 0;
    const advance = (): void => {
        select(step, false);
        step += 1;
        if (step < tabs.length) {
            window.setTimeout(advance, STEP_DELAY);
            return;
        }
        btn.disabled = false;
        label.textContent = "Replay";
    };
    advance();
}

export function initEditor(): void {
    document.querySelectorAll<HTMLElement>("[data-editor]").forEach((root) => {
        const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".etab"));
        const panels = Array.from(
            root.querySelectorAll<HTMLElement>("[data-panel]"),
        );
        if (!tabs.length || !panels.length) return;

        const select = (i: number, focus: boolean): void => {
            const key = tabs[i].dataset.tab;
            tabs.forEach((t, j) => {
                const on = j === i;
                t.classList.toggle("is-active", on);
                t.setAttribute("aria-selected", String(on));
            });
            panels.forEach((p) => {
                p.hidden = p.dataset.panel !== key;
            });
            if (focus) tabs[i].focus();
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener("click", () => select(i, false));
            tab.addEventListener("keydown", (e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const d = e.key === "ArrowRight" ? 1 : -1;
                    select((i + d + tabs.length) % tabs.length, true);
                }
            });
        });

        // Sync panels to whichever tab starts active in the markup.
        select(Math.max(0, tabs.findIndex((t) => t.classList.contains("is-active"))), false);

        const runBtn = root.querySelector<HTMLButtonElement>("[data-run]");
        const runLabel = root.querySelector<HTMLElement>("[data-run-label]");
        if (runBtn && runLabel) {
            runBtn.addEventListener("click", () =>
                replayQuickstart(runBtn, runLabel, tabs, select),
            );
        }

        const expandBtn = root.querySelector<HTMLButtonElement>("[data-expand]");
        if (expandBtn) {
            expandBtn.addEventListener("click", () => {
                const on = root.classList.toggle("is-expanded");
                expandBtn.setAttribute("aria-expanded", String(on));
                expandBtn.setAttribute(
                    "aria-label",
                    on ? "Collapse quickstart" : "Expand quickstart",
                );
            });
        }
    });
}
