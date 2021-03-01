import { I18nKeys } from "i18next";
import { Component } from "inferno";
import { i18n } from "../i18next";

export class NoMatch extends Component<any, any> {
  private errCode = new URLSearchParams(this.props.location.search).get(
    "err"
  ) as I18nKeys;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="container">
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
