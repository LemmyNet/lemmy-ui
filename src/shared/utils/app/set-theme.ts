import { fetchThemeList } from "@utils/app";
import { isBrowser, loadCss } from "@utils/browser";

export default async function setTheme(theme: string, forceReload = false) {
  if (!isBrowser()) {
    return;
  }
  if (theme === "browser" && !forceReload) {
    return;
  }
  // This is only run on a force reload
  if (theme === "browser") {
    theme = "darkly";
  }

  const themeList = await fetchThemeList();

  // Unload all the other themes
  for (var i = 0; i < themeList.length; i++) {
    const styleSheet = document.getElementById(themeList[i]);
    if (styleSheet) {
      styleSheet.setAttribute("disabled", "disabled");
    }
  }

  document
    .getElementById("default-light")
    ?.setAttribute("disabled", "disabled");
  document.getElementById("default-dark")?.setAttribute("disabled", "disabled");

  // Load the theme dynamically
  const cssLoc = `/css/themes/${theme}.css`;

  loadCss(theme, cssLoc);
  document.getElementById(theme)?.removeAttribute("disabled");
}
