import { NoOptionI18nKeys } from "i18next";
import { Component } from "inferno";
import { i18n } from "../../i18next";

export class NoMatch extends Component<any, any> {
  private errCode = new URLSearchParams(this.props.location.search).get(
    "err"
  ) as NoOptionI18nKeys;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div className="container-lg">
        <h1>404</h1>
        {this.errCode && (
          <h3>
            {i18n.t("code")}: {i18n.t(this.errCode)}
          </h3>
        )}
      </div>
    );
  }
}
