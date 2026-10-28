import NProgress from "nprogress";
NProgress.configure({ showSpinner: false, minimum: 0.15, trickleSpeed: 180 });
let timeout: ReturnType<typeof setTimeout> | undefined;
export function finishNavigation() {
  clearTimeout(timeout);
  NProgress.done();
}
export function startNavigation(href: string) {
  const target = new URL(href, window.location.href);
  const current = window.location;
  if (
    target.origin !== current.origin ||
    (target.pathname === current.pathname && target.search === current.search)
  )
    return;
  clearTimeout(timeout);
  NProgress.start();
  // Aborted navigations and failed loads must never leave an endless bar.
  timeout = setTimeout(finishNavigation, 10_000);
}
