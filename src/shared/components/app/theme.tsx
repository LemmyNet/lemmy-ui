import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { UserService } from "../../services";
import { dataBsTheme, isBrowser } from "@utils/browser";

interface Props {
  defaultTheme: string;
}

interface State {
  themeOverride?: string;
  graceTheme?: string;
}

export class Theme extends Component<Props, State> {
  private lightQuery?: MediaQueryList;
  constructor(props, context) {
    super(props, context);
    if (isBrowser()) {
      window.addEventListener("refresh-theme", this.eventListener);
      window.addEventListener("set-theme-override", this.eventListener);
      this.lightQuery = window.matchMedia("(prefers-color-scheme: light)");
      this.lightQuery.addEventListener("change", this.eventListener);
    }
  }

  private graceTimer;
  private eventListener = e => {
    if (e.type === "refresh-theme" || e.type === "change") {
      this.forceUpdate();
    } else if (e.type === "set-theme-override") {
      if (e.detail?.theme) {
        this.setState({
          themeOverride: e.detail.theme,
          graceTheme: this.state?.themeOverride ?? this.currentTheme(),
        });
        // Keep both themes enabled for one second. Avoids unstyled flashes.
        clearTimeout(this.graceTimer);
        this.graceTimer = setTimeout(() => {
          this.setState({ graceTheme: undefined });
        }, 1000);
      } else {
        this.setState({ themeOverride: undefined, graceTheme: undefined });
      }
    }
  };

  componentWillUnmount(): void {
    if (isBrowser()) {
      window.removeEventListener("refresh-theme", this.eventListener);
      this.lightQuery?.removeEventListener("change", this.eventListener);
    }
  }

  currentTheme(): string {
    const user = UserService.Instance.myUserInfo;
    const userTheme = user?.local_user_view.local_user.theme;
    return userTheme ?? "browser";
  }

  render() {
    if (this.state?.themeOverride) {
      if (!this.state.graceTheme) {
        return this.renderTheme(this.state.themeOverride);
      }
      // Render both themes to prevent rendering without theme.
      return [
        this.renderTheme(this.state.graceTheme ?? this.currentTheme()),
        this.renderTheme(this.state.themeOverride),
      ];
    }

    return this.renderTheme(this.currentTheme());
  }

  renderTheme(theme: string) {
    const hasTheme = theme !== "browser";

    const detectedBsTheme = {};
    if (this.lightQuery) {
      detectedBsTheme["data-bs-theme"] = this.lightQuery.matches
        ? "light"
        : "dark";
    }

    if (theme && hasTheme) {
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
