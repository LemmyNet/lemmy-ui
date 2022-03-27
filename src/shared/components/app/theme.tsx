import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { MyUserInfo } from "lemmy-js-client";

interface Props {
  myUserInfo: MyUserInfo | undefined;
  defaultTheme?: string;
}

export class Theme extends Component<Props> {
  render() {
    let user = this.props.myUserInfo;
    let hasTheme = user && user.local_user_view.local_user.theme !== "browser";

    if (hasTheme) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${user.local_user_view.local_user.theme}.css`}
          />
        </Helmet>
      );
    } else if (
      this.props.defaultTheme != null &&
      this.props.defaultTheme != "browser"
    ) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${this.props.defaultTheme}.css`}
          />
        </Helmet>
      );
    } else {
      return (
        <Helmet>
          [
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/litely.css"
            id="default-light"
            media="(prefers-color-scheme: light)"
          />
          ,
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/darkly.css"
            id="default-dark"
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
          ];
        </Helmet>
      );
    }
  }
}
