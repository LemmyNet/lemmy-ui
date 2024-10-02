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
  onEdit(form: EditOAuthProvider): Promise<void>;
  onCreate(form: CreateOAuthProvider): Promise<OAuthProvider | null>;
  onDelete(form: DeleteOAuthProvider): Promise<void>;
};

type OAuthProvidersTabState = {
  providerToCreateOrEdit?: OAuthProvider;
  providerToDelete?: OAuthProvider;
  showCreateOrEditModal: boolean;
};

const PRESET_OAUTH_PROVIDERS: Omit<
  CreateOAuthProvider,
  "client_id" | "client_secret"
>[] = [
  {
    display_name: "Privacy Portal",
    issuer: "https://api.privacyportal.org/",
    authorization_endpoint: "https://app.privacyportal.org/oauth/authorize",
    token_endpoint: "https://api.privacyportal.org/oauth/token",
    userinfo_endpoint: "https://api.privacyportal.org/oauth/userinfo",
    id_claim: "sub",
    scopes: "openid email",
    auto_verify_email: true,
    account_linking_enabled: true,
    enabled: true,
  },
  // additional preset providers can be added here
];

function handleShowCreateOrEditProviderModal({
  provider,
  tab,
}: {
  tab: OAuthProvidersTab;
  provider: OAuthProvider | undefined;
}) {
  tab.setState({
    providerToCreateOrEdit: provider,
    showCreateOrEditModal: true,
  });
}

function handleCloseCreateOrEditModal(tab: OAuthProvidersTab) {
  tab.setState({
    providerToCreateOrEdit: undefined,
    showCreateOrEditModal: false,
  });
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
  state: OAuthProvidersTabState = { showCreateOrEditModal: false };

  constructor(props: OAuthProvidersTabProps, context: any) {
    super(props, context);

    this.handleDeleteProvider = this.handleDeleteProvider.bind(this);
    this.handleCreateOrEditProviderSubmit =
      this.handleCreateOrEditProviderSubmit.bind(this);
  }

  render(
    { oauthProviders }: Readonly<OAuthProvidersTabProps>,
    {
      providerToDelete,
      providerToCreateOrEdit,
      showCreateOrEditModal,
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
                    handleShowCreateOrEditProviderModal,
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
        <button
          type="button"
          className="btn btn-secondary btn-small mt-3"
          onClick={linkEvent(
            { provider: undefined, tab: this },
            handleShowCreateOrEditProviderModal,
          )}
        >
          {I18NextService.i18n.t("add_oauth_provider")}
        </button>
        {PRESET_OAUTH_PROVIDERS.length > 0 && (
          <section className="default-oauth-providers-section mt-4">
            <h2 className="h5 mb-3">
              {I18NextService.i18n.t("oauth_provider_presets")}
            </h2>
            <ul className="d-flex flex-wrap gap-3 ps-0">
              {PRESET_OAUTH_PROVIDERS.map(provider => {
                const isAlreadyUsed = oauthProviders.some(
                  p => p.issuer === provider.issuer,
                );

                return (
                  <li key={provider.issuer}>
                    <button
                      className="btn btn-secondary btn-small"
                      disabled={isAlreadyUsed}
                      data-tippy-content={
                        isAlreadyUsed
                          ? I18NextService.i18n.t(
                              "preset_oauth_provider_already_used",
                            )
                          : ""
                      }
                    >
                      {provider.display_name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <CreateOrEditOAuthProviderModal
          show={showCreateOrEditModal}
          onClose={linkEvent(this, handleCloseCreateOrEditModal)}
          provider={providerToCreateOrEdit}
          onSubmit={this.handleCreateOrEditProviderSubmit}
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

  async handleCreateOrEditProviderSubmit(
    provider: CreateOAuthProvider | EditOAuthProvider,
  ) {
    if (this.state.providerToCreateOrEdit) {
      await this.props.onEdit(provider as EditOAuthProvider);
    } else {
      await this.props.onCreate(provider as CreateOAuthProvider);
    }

    this.setState({
      showCreateOrEditModal: false,
      providerToCreateOrEdit: undefined,
    });
  }
}
