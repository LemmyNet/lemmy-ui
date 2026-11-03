import { WithHead } from "@utils/app";
import { dataBsTheme } from "@utils/browser";
import { getStaticDir } from "@utils/env";
import { useHead } from "unhead";

type CodeThemeProps = {
  theme: string;
} & WithHead;

export function codeTheme(props: CodeThemeProps) {
  const { theme, head } = props;
  const hasTheme = theme !== "browser" && theme !== "browser-compact";

  if (!hasTheme) {
    useHead(head, {
      link: [
        {
          rel: "stylesheet",
          type: "text/css",
          href: `${getStaticDir()}/assets/css/code-themes/atom-one-light.css`,
          media: "(prefers-color-scheme: light)",
        },
        {
          rel: "stylesheet",
          type: "text/css",
          href: `${getStaticDir()}/assets/css/code-themes/atom-one-dark.css`,
          media:
            "(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)",
        },
      ],
    });
  } else {
    const dataBsCodeTheme =
      dataBsTheme(theme) === "dark"
        ? "atom-one-dark.css"
        : "atom-one-light.css";

    useHead(head, {
      link: [
        {
          rel: "stylesheet",
          type: "text/css",
          href: `${getStaticDir()}/assets/css/code-themes/${dataBsCodeTheme}`,
        },
      ],
    });
  }
}
