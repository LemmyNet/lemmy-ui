import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import {
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
  OAuthProvider,
} from "lemmy-js-client";
import { setIsoData } from "@utils/app";
import OAuthProviderListItem from "./oauth-provider-list-item";
import CreateOrEditOAuthProviderModal from "../../common/modal/create-or-edit-oauth-provider-modal";

type OAuthProvidersTabProps = {
  onEdit(form: EditOAuthProvider): void;
  onCreate(form: CreateOAuthProvider): Promise<OAuthProvider | null>;
  onDelete(form: DeleteOAuthProvider): Promise<boolean>;
};

type OAuthProvidersTabState = {
  oauthProviders: OAuthProvider[];
  showCreateOrEditModal: boolean;
  upsertingProvider?: OAuthProvider;
};

function handleShowEditProviderModal({
  provider,
  tab,
}: {
  tab: OAuthProvidersTab;
  provider: OAuthProvider;
}) {
  tab.setState({ upsertingProvider: provider, showCreateOrEditModal: true });
}

function handleCloseCreateOrEditModal(tab: OAuthProvidersTab) {
  tab.setState({ showCreateOrEditModal: false, upsertingProvider: undefined });
}

export default class OAuthProvidersTab extends Component<
  OAuthProvidersTabProps,
  OAuthProvidersTabState
> {
  state: OAuthProvidersTabState = {
    oauthProviders:
      setIsoData(this.context).site_res.admin_oauth_providers ?? [],
    showCreateOrEditModal: false,
  };

  constructor(props: OAuthProvidersTabProps, context: any) {
    super(props, context);
  }

  render(
    _props: Readonly<OAuthProvidersTabProps>,
    {
      oauthProviders,
      showCreateOrEditModal,
      upsertingProvider,
    }: Readonly<OAuthProvidersTabState>,
  ) {
    return (
      <div className="oauth-providers-tab">
        <h1 className="h4 mb-4">{I18NextService.i18n.t("oauth_config")}</h1>
        {oauthProviders.length > 0 ? (
          <>
            <h2 className="h5 mb-2">
              {I18NextService.i18n.t("oauth_providers")}
            </h2>
            <ul className="list-group">
              {oauthProviders.map(provider => (
                <OAuthProviderListItem
                  provider={provider}
                  key={provider.id}
                  onEdit={linkEvent(
                    { provider, tab: this },
                    handleShowEditProviderModal,
                  )}
                />
              ))}
            </ul>
          </>
        ) : (
          <div>{I18NextService.i18n.t("no_oauth_providers_blurb")}</div>
        )}
        <CreateOrEditOAuthProviderModal
          show={showCreateOrEditModal}
          onClose={linkEvent(this, handleCloseCreateOrEditModal)}
          provider={upsertingProvider}
        />
      </div>
    );
  }
}
