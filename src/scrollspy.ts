// Scroll-spy: highlights the nav link for the section currently in view. A thin
// horizontal band (via rootMargin) near the top-third of the viewport acts as
// the "reading line"; whichever section crosses it is marked active. No-ops
// without IntersectionObserver.

export function initScrollSpy(): void {
    const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(".nav__link"),
    );
    const sections = links
        .map((a) => {
            const id = a.getAttribute("href")?.slice(1) ?? "";
            return id ? document.getElementById(id) : null;
        })
        .filter((s): s is HTMLElement => s !== null);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    const setActive = (id: string): void => {
        for (const a of links) {
            a.classList.toggle("nav__link--active", a.getAttribute("href") === "#" + id);
        }
    };

    const visible = new Set<string>();
    const io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (e.isIntersecting) visible.add(e.target.id);
                else visible.delete(e.target.id);
            }
            // Pick the first section (in document order) crossing the band.
            for (const s of sections) {
                if (visible.has(s.id)) {
                    setActive(s.id);
                    return;
                }
            }
            setActive(""); // above the first section — clear all
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((s) => io.observe(s));
}
