import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { UserService } from "../../services";

interface Props {
  defaultTheme: string;
}

export class Theme extends Component<Props> {
  render() {
    let user = UserService.Instance.myUserInfo;
    let hasTheme = user
      .map(m => m.local_user_view.local_user.theme !== "browser")
      .unwrapOr(false);

    if (hasTheme) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${
              user.unwrap().local_user_view.local_user.theme
            }.css`}
          />
        </Helmet>
      );
    } else if (this.props.defaultTheme != "browser") {
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
