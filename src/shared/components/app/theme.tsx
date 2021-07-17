import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { LocalUserSettingsView } from "lemmy-js-client";

interface Props {
  localUserView: LocalUserSettingsView | undefined;
}

export class Theme extends Component<Props> {
  render() {
    let user = this.props.localUserView;
    let hasTheme = user && user.local_user.theme !== "browser";

    return (
      <Helmet>
        {hasTheme ? (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/static/assets/css/themes/${user.local_user.theme}.min.css`}
          />
        ) : (
          [
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/litely.min.css"
              id="default-light"
              media="(prefers-color-scheme: light)"
            />,
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/darkly.min.css"
              id="default-dark"
              media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
            />,
          ]
        )}
      </Helmet>
    );
  }
}
