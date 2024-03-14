import { dataBsTheme } from "@utils/browser";
import { Component } from "inferno";
import { Helmet } from "inferno-helmet";

interface CodeThemeProps {
  theme: string;
}

export class CodeTheme extends Component<CodeThemeProps, any> {
  render() {
    const { theme } = this.props;
    const hasTheme = theme !== "browser" && theme !== "browser-compact";

    if (!hasTheme) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/atom-one-light.css`}
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/atom-one-dark.css`}
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
        </Helmet>
      );
    }

    return (
      <Helmet>
        {dataBsTheme(theme) === "dark" ? (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/atom-one-dark.css`}
          />
        ) : (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/atom-one-light.css`}
          />
        )}
      </Helmet>
    );
  }
}
