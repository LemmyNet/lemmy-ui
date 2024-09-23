import { Component } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import { OAuthProvider } from "lemmy-js-client";
import { setIsoData } from "@utils/app";
import OAuthProviderListItem from "./oauth-provider-list-item";

type OAuthProvidersTabState = {
  oauthProviders: OAuthProvider[];
};

export default class OAuthProvidersTab extends Component<
  any,
  OAuthProvidersTabState
> {
  state: OAuthProvidersTabState = {
    oauthProviders:
      setIsoData(this.context).site_res.admin_oauth_providers ?? [],
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render(_props: Readonly<any>, state: Readonly<OAuthProvidersTabState>) {
    return (
      <div className="oauth-providers-tab">
        <h1 className="h4 mb-4">{I18NextService.i18n.t("oauth_config")}</h1>
        {state.oauthProviders.length > 0 ? (
          <>
            <h2 className="h5 mb-2">
              {I18NextService.i18n.t("oauth_providers")}
            </h2>
            <ul className="list-group">
              {state.oauthProviders.map(provider => (
                <OAuthProviderListItem provider={provider} key={provider.id} />
              ))}
            </ul>
          </>
        ) : (
          <div>{I18NextService.i18n.t("no_oauth_providers_blurb")}</div>
        )}
      </div>
    );
  }
}
