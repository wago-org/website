// Beta waitlist form: progressively enhances the Buttondown embed form so
// submitting keeps the visitor on the page and shows inline confirmation.
// Without JS the form still works as a plain POST (opens Buttondown in a tab).
//
// NOTE: "wago" is the Buttondown username — keep it in sync with the form's
// action URL in index.html.
const ENDPOINT = "https://buttondown.com/api/emails/embed-subscribe/wago";

declare global {
  interface Window {
    goatcounter?: { count?: (opts: Record<string, unknown>) => void };
  }
}

export function initBeta(): void {
  const form = document.querySelector<HTMLFormElement>("[data-beta-form]");
  if (!form) return;

  const status = document.querySelector<HTMLElement>("[data-beta-status]");
  const input = form.querySelector<HTMLInputElement>('input[name="email"]');
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const say = (msg: string, kind: "ok" | "err"): void => {
    if (!status) return;
    status.textContent = msg;
    status.classList.remove("beta__status--ok", "beta__status--err");
    status.classList.add(`beta__status--${kind}`);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = input?.value.trim();
    if (!email) return;

    if (btn) btn.disabled = true;
    say("Signing you up…", "ok");

    const body = new FormData();
    body.append("email", email);

    // Buttondown's embed endpoint doesn't return CORS headers, so we submit
    // opaque (mode: "no-cors"): the request lands, but we can't read the
    // response — so we optimistically confirm on network success and only
    // surface an error if the request itself fails.
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body })
      .then(() => {
        form.closest(".beta")?.classList.add("beta--done");
        say("You're on the list — we'll let you know when it's live. 🎉", "ok");
        // Count the conversion in GoatCounter (present only on the live domain).
        window.goatcounter?.count?.({
          path: "waitlist-signup",
          title: "Waitlist signup",
          event: true,
        });
      })
      .catch(() => {
        if (btn) btn.disabled = false;
        say("Something went wrong. Try again, or email me@jairus.dev.", "err");
      });
  });
}
