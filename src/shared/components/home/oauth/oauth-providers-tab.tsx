import { Component } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import {
  AdminOAuthProvider,
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
} from "lemmy-js-client";
import OAuthProviderListItem from "./oauth-provider-list-item";
import CreateOrEditOAuthProviderModal, {
  CreateOrEditOAuthProviderModalData,
} from "../../common/modal/create-or-edit-oauth-provider-modal";
import ConfirmationModal from "../../common/modal/confirmation-modal";
import { ProviderToEdit } from "@utils/types";

type OAuthProvidersTabProps = {
  oauthProviders: AdminOAuthProvider[];
  onEdit(form: EditOAuthProvider): void;
  onCreate(form: CreateOAuthProvider): void;
  onDelete(form: DeleteOAuthProvider): void;
};

type OAuthProvidersTabState = {
  providerToDelete?: AdminOAuthProvider;
  createOrEditModalData?: CreateOrEditOAuthProviderModalData;
};

const PRESET_OAUTH_PROVIDERS: ProviderToEdit[] = [
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
  {
    display_name: "Github",
    issuer: "https://github.com/",
    authorization_endpoint: "https://github.com/login/oauth/authorize",
    token_endpoint: "https://github.com/login/oauth/access_token",
    userinfo_endpoint: "https://api.github.com/user",
    id_claim: "email",
    scopes: "user:email",
    auto_verify_email: true,
    account_linking_enabled: true,
    enabled: true,
  },
  // additional preset providers can be added here
];

export default class OAuthProvidersTab extends Component<
  OAuthProvidersTabProps,
  OAuthProvidersTabState
> {
  state: OAuthProvidersTabState = {};

  render(
    { oauthProviders }: Readonly<OAuthProvidersTabProps>,
    {
      providerToDelete,
      createOrEditModalData,
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
                  onEdit={() =>
                    handleShowCreateOrEditProviderModal(this, {
                      type: "edit",
                      provider,
                    })
                  }
                  onDelete={() => handleTryDeleteOauthProvider(this, provider)}
                />
              ))}
            </ul>
          </>
        ) : (
          <div>{I18NextService.i18n.t("no_oauth_providers_blurb")}</div>
        )}
        <button
          type="button"
          className="btn btn-light border-light-subtle btn-small mt-3"
          onClick={() =>
            handleShowCreateOrEditProviderModal(this, {
              type: "add",
            })
          }
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
                      className="btn btn-light border-light-subtle btn-small"
                      disabled={isAlreadyUsed}
                      onClick={() =>
                        handleShowCreateOrEditProviderModal(this, {
                          type: "add",
                        })
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
          show={!!createOrEditModalData}
          onClose={() => handleCloseCreateOrEditModal(this)}
          onSubmit={form => handleCreateOrEditProviderSubmit(this, form)}
          data={createOrEditModalData ?? { type: "add" }}
        />
        <ConfirmationModal
          show={!!providerToDelete}
          message={I18NextService.i18n.t("delete_oauth_provider_are_you_sure")}
          loadingMessage={I18NextService.i18n.t("deleting_oauth_provider")}
          onNo={() => handleCloseDeleteConfirmationModal(this)}
          onYes={() => handleDeleteProvider(this)}
        />
      </div>
    );
  }
}

function handleDeleteProvider(i: OAuthProvidersTab) {
  const id = i.state.providerToDelete?.id;

  if (id !== undefined) {
    i.props.onDelete({ id });
  }

  i.setState({ providerToDelete: undefined });
}

function handleCreateOrEditProviderSubmit(
  i: OAuthProvidersTab,
  provider: CreateOAuthProvider | EditOAuthProvider,
) {
  if (i.state.createOrEditModalData?.type === "edit") {
    i.props.onEdit(provider as EditOAuthProvider);
  } else {
    i.props.onCreate(provider as CreateOAuthProvider);
  }

  i.setState({
    createOrEditModalData: undefined,
  });
}

function handleCloseCreateOrEditModal(i: OAuthProvidersTab) {
  i.setState({
    createOrEditModalData: undefined,
  });
}

function handleTryDeleteOauthProvider(
  i: OAuthProvidersTab,
  provider: AdminOAuthProvider,
) {
  i.setState({ providerToDelete: provider });
}

function handleCloseDeleteConfirmationModal(i: OAuthProvidersTab) {
  i.setState({ providerToDelete: undefined });
}

function handleShowCreateOrEditProviderModal(
  i: OAuthProvidersTab,
  data: CreateOrEditOAuthProviderModalData,
) {
  i.setState({
    createOrEditModalData: data,
  });
}
