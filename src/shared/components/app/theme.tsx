import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { MyUserInfo } from "lemmy-js-client";

interface Props {
  myUserInfo: MyUserInfo | undefined;
  defaultTheme?: string;
  defaultCodeTheme?: string;
}

export class Theme extends Component<Props> {
  render() {
    let user = this.props.myUserInfo;
    let hasTheme = user && user.local_user_view.local_user.theme !== "browser";

    if (hasTheme) {
      return (
        <>
          <Helmet>
            <link
              rel="stylesheet"
              type="text/css"
              href={`/css/themes/${user.local_user_view.local_user.theme}.css`}
            />
          </Helmet>
          <CodeTheme
            myUserInfo={user}
            defaultCodeTheme={this.props.defaultCodeTheme}
          />
        </>
      );
    } else if (
      this.props.defaultTheme != null &&
      this.props.defaultTheme != "browser"
    ) {
      return (
        <>
          <Helmet>
            <link
              rel="stylesheet"
              type="text/css"
              href={`/css/themes/${this.props.defaultTheme}.css`}
            />
          </Helmet>
          <CodeTheme
            myUserInfo={user}
            defaultCodeTheme={this.props.defaultCodeTheme}
          />
        </>
      );
    } else {
      return (
        <>
          <Helmet>
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
          <CodeTheme
            myUserInfo={user}
            defaultCodeTheme={this.props.defaultCodeTheme}
          />
        </>
      );
    }
  }
}

export class CodeTheme extends Component<Props> {
  render() {
    let user = this.props.myUserInfo;
    let theme = user && user.local_user_view.local_user.code_theme;

    if (theme && theme != "browser") {
      return (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/${theme}.css`}
          />
      );
    } else if (
      this.props.defaultCodeTheme != null &&
      this.props.defaultCodeTheme != "browser"
    ) {
      return (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/code-themes/${this.props.defaultCodeTheme}.css`}
          />
      );
    } else {
      return (
        <>
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/code-themes/default.css"
            id="default-light"
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/code-themes/dark.css"
            id="default-dark"
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
        </>
      );
    }
  }
}
