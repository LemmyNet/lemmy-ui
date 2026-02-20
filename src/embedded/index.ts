// @ts-expect-error has a weird import error
import { lazyLoad } from "unlazy";

// WARNING: This script is written as content into a script tag. A closing
// tag, even in an import, can break things.

// document.body doesn't exist yet
window.requestAnimationFrame(() => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const cleanup = lazyLoad('img[loading="lazy"]');
  // The timeout gives enough time to display the blurred image and to start
  // loading the images, the Pictrs component creates a new lazyLoad instance
  // that will handle the actual display of loaded image.
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    cleanup();
  });
});

if (!document.documentElement.hasAttribute("data-bs-theme")) {
  const light = window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.setAttribute(
    "data-bs-theme",
    light ? "light" : "dark",
  );
}
