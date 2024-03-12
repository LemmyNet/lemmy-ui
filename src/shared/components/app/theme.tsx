import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { UserService } from "../../services";
import { dataBsTheme, isBrowser } from "@utils/browser";

interface Props {
  defaultTheme: string;
}

export class Theme extends Component<Props> {
  private lightQuery?: MediaQueryList;
  constructor(props, context) {
    super(props, context);
    if (isBrowser()) {
      window.addEventListener("refresh-theme", this.eventListener);
      this.lightQuery = window.matchMedia("(prefers-color-scheme: light)");
      this.lightQuery.addEventListener("change", this.eventListener);
    }
  }

  private eventListener = e => {
    if (e.type === "refresh-theme" || e.type === "change") {
      this.forceUpdate();
    }
  };

  componentWillUnmount(): void {
    if (isBrowser()) {
      window.removeEventListener("refresh-theme", this.eventListener);
      this.lightQuery?.removeEventListener("change", this.eventListener);
    }
  }

  render() {
    const user = UserService.Instance.myUserInfo;
    const hasTheme = user?.local_user_view.local_user.theme !== "browser";

    const detectedBsTheme = {};
    if (this.lightQuery) {
      detectedBsTheme["data-bs-theme"] = this.lightQuery.matches
        ? "light"
        : "dark";
    }

    if (user && hasTheme) {
      const theme = user?.local_user_view.local_user.theme;
      return (
        <Helmet htmlAttributes={{ "data-bs-theme": dataBsTheme(theme) }}>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${theme}.css`}
          />
        </Helmet>
      );
    } else if (
      this.props.defaultTheme !== "browser" &&
      this.props.defaultTheme !== "browser-compact"
    ) {
      return (
        <Helmet
          htmlAttributes={{
            "data-bs-theme": dataBsTheme(this.props.defaultTheme),
          }}
        >
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${this.props.defaultTheme}.css`}
          />
        </Helmet>
      );
    } else if (this.props.defaultTheme === "browser-compact") {
      return (
        <Helmet htmlAttributes={detectedBsTheme}>
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/litely-compact.css"
            id="default-light"
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/darkly-compact.css"
            id="default-dark"
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
        </Helmet>
      );
    } else {
      return (
        <Helmet htmlAttributes={detectedBsTheme}>
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/litely.css"
            id="default-light"
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/darkly.css"
            id="default-dark"
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
        </Helmet>
      );
    }
  }
}
