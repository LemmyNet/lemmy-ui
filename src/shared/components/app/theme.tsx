import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { MyUserInfo, Site } from "lemmy-js-client";

interface Props {
  myUserInfo: MyUserInfo | undefined;
  site: Site;
}

export class Theme extends Component<Props> {
  render() {
    let user = this.props.myUserInfo;
    let hasTheme = user && user.local_user_view.local_user.theme !== "browser";

    return (
      <Helmet>
        {hasTheme ? (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/static/assets/css/themes/${user.local_user_view.local_user.theme}.min.css`}
          />
        ) : (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/static/assets/css/themes/${this.props.site.default_theme}.min.css`}
          />
        )}
      </Helmet>
    );
  }
}
