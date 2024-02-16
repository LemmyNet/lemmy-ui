import { dataBsTheme } from "@utils/browser";
import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { UserService } from "../../services";

interface CodeThemeProps {
  defaultTheme: string;
}

export class CodeTheme extends Component<CodeThemeProps, any> {
  render() {
    const user = UserService.Instance.myUserInfo;
    const userTheme = user?.local_user_view.local_user.theme;
    const theme =
      user && userTheme !== "browser" ? userTheme : this.props.defaultTheme;

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
