// The editor is a small tabbed code viewer. Filename tabs switch between the Go
// host, the AssemblyScript source, its WAT, and the emitted x86-64. Run reveals
// a console with the (mocked) program output; Expand grows the editor in place.
// No-ops if the editor isn't present.

const REDUCED =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

// Mocked run — swap this for real execution once an interpreter exists.
const PROMPT = '<span class="term-dim">$</span> wago run -e fib fib.wasm 30';
const RESULT = 'fib(30) = <span class="tok-n">832040</span>';
const line = (html: string, cls = ""): string =>
    '<span class="term-line ' + cls + '">' + html + "</span>";
const head = '<span class="editor__console-head">output</span>';

function runExample(
    btn: HTMLButtonElement,
    label: HTMLElement,
    con: HTMLElement,
): void {
    con.hidden = false;
    const finish = (): void => {
        con.innerHTML = head + line(PROMPT) + line(RESULT);
        btn.disabled = false;
        label.textContent = "Run";
    };
    if (REDUCED) {
        finish();
        return;
    }
    btn.disabled = true;
    label.textContent = "Running";
    con.innerHTML =
        head +
        line(PROMPT) +
        line('compiling &amp; running… <span class="term-cursor"></span>', "term-dim");
    window.setTimeout(finish, 620);
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
        const con = root.querySelector<HTMLElement>("[data-console]");
        const runLabel = root.querySelector<HTMLElement>("[data-run-label]");
        if (runBtn && con && runLabel) {
            runBtn.addEventListener("click", () => runExample(runBtn, runLabel, con));
        }

        const expandBtn = root.querySelector<HTMLButtonElement>("[data-expand]");
        if (expandBtn) {
            expandBtn.addEventListener("click", () => {
                const on = root.classList.toggle("is-expanded");
                expandBtn.setAttribute("aria-expanded", String(on));
                expandBtn.setAttribute(
                    "aria-label",
                    on ? "Collapse editor" : "Expand editor",
                );
            });
        }
    });
}
