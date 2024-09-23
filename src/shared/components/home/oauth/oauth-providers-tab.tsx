import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import {
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
  OAuthProvider,
} from "lemmy-js-client";
import OAuthProviderListItem from "./oauth-provider-list-item";
import CreateOrEditOAuthProviderModal from "../../common/modal/create-or-edit-oauth-provider-modal";
import ConfirmationModal from "../../common/modal/confirmation-modal";

type OAuthProvidersTabProps = {
  oauthProviders: OAuthProvider[];
  onEdit(form: EditOAuthProvider): void;
  onCreate(form: CreateOAuthProvider): Promise<OAuthProvider | null>;
  onDelete(form: DeleteOAuthProvider): Promise<void>;
};

type OAuthProvidersTabState = {
  providerToCreateOrEdit?: OAuthProvider;
  providerToDelete?: OAuthProvider;
};

function handleShowEditProviderModal({
  provider,
  tab,
}: {
  tab: OAuthProvidersTab;
  provider: OAuthProvider;
}) {
  tab.setState({ providerToCreateOrEdit: provider });
}

function handleCloseCreateOrEditModal(tab: OAuthProvidersTab) {
  tab.setState({ providerToCreateOrEdit: undefined });
}

function handleTryDeleteOauthProvider({
  tab,
  provider,
}: {
  tab: OAuthProvidersTab;
  provider: OAuthProvider;
}) {
  tab.setState({ providerToDelete: provider });
}

function handleCloseDeleteConfirmationModal(tab: OAuthProvidersTab) {
  tab.setState({ providerToDelete: undefined });
}

export default class OAuthProvidersTab extends Component<
  OAuthProvidersTabProps,
  OAuthProvidersTabState
> {
  state: OAuthProvidersTabState = {};

  constructor(props: OAuthProvidersTabProps, context: any) {
    super(props, context);

    this.handleDeleteProvider = this.handleDeleteProvider.bind(this);
  }

  render(
    { oauthProviders }: Readonly<OAuthProvidersTabProps>,
    {
      providerToDelete,
      providerToCreateOrEdit,
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
                  onDelete={linkEvent(
                    { provider, tab: this },
                    handleTryDeleteOauthProvider,
                  )}
                />
              ))}
            </ul>
          </>
        ) : (
          <div>{I18NextService.i18n.t("no_oauth_providers_blurb")}</div>
        )}
        <CreateOrEditOAuthProviderModal
          show={!!providerToCreateOrEdit}
          onClose={linkEvent(this, handleCloseCreateOrEditModal)}
          provider={providerToCreateOrEdit}
        />
        <ConfirmationModal
          show={!!providerToDelete}
          message={I18NextService.i18n.t("delete_oauth_provider_are_you_sure")}
          loadingMessage={I18NextService.i18n.t("deleting_oauth_provider")}
          onNo={linkEvent(this, handleCloseDeleteConfirmationModal)}
          onYes={this.handleDeleteProvider}
        />
      </div>
    );
  }

  async handleDeleteProvider() {
    const id = this.state.providerToDelete?.id;

    if (id !== undefined) {
      await this.props.onDelete({ id });
    }

    this.setState({ providerToDelete: undefined });
  }
}
