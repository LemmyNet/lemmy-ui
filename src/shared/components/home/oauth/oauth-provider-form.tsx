import { setIsoData } from "@utils/app";
import { getExternalHost } from "@utils/env";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import {
  OAuthProvider,
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
  GetSiteResponse,
} from "lemmy-js-client";
import { I18NextService } from "../../../services";
import { Icon } from "../../common/icon";
import ConfirmationModal from "../../common/modal/confirmation-modal";

const PRESET_OAUTH_PROVIDERS = [
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

type OAuthProviderExt = OAuthProvider & {
  client_secret: string;
  changed: boolean;
};

interface OAuthProviderFormProps {
  onEdit(form: EditOAuthProvider): void;
  onCreate(form: CreateOAuthProvider): Promise<OAuthProvider | null>;
  onDelete(form: DeleteOAuthProvider): Promise<boolean>;
}

interface OAuthProviderFormState {
  siteRes: GetSiteResponse;
  OAuthProviders: OAuthProviderExt[];
  onConfirm?: () => Promise<void>;
}

function formatProvider(provider: OAuthProvider | null): OAuthProviderExt {
  return {
    id: provider?.id || 0,
    display_name: provider?.display_name || "",
    issuer: provider?.issuer || "",
    authorization_endpoint: provider?.authorization_endpoint || "",
    token_endpoint: provider?.token_endpoint || "",
    userinfo_endpoint: provider?.userinfo_endpoint || "",
    id_claim: provider?.id_claim || "",
    client_id: provider?.client_id || "",
    client_secret: "",
    scopes: provider?.scopes || "",
    auto_verify_email: provider?.auto_verify_email || false,
    account_linking_enabled: provider?.account_linking_enabled || false,
    enabled: provider?.enabled || false,
    published: provider?.published || "",
    changed: false,
  };
}

export class OAuthProviderForm extends Component<
  OAuthProviderFormProps,
  OAuthProviderFormState
> {
  private isoData = setIsoData(this.context);
  private emptyState: OAuthProviderFormState = {
    siteRes: this.isoData.site_res,
    OAuthProviders:
      (this.isoData.site_res.admin_oauth_providers ?? []).map(formatProvider) ??
      [],
  };
  state: OAuthProviderFormState;
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;

    this.getEditTooltip = this.getEditTooltip.bind(this);
  }

  onConfirmCancellation() {
    this.setState(prevState => ({ ...prevState, onConfirm: undefined }));
  }

  async onConfirmWrapper() {
    try {
      this.state.onConfirm?.();
    } finally {
      this.setState(prevState => ({ ...prevState, onConfirm: undefined }));
    }
  }

  render() {
    return (
      <div className="home-auth-form col-12">
        <div className="position-absolute end-0 top-0">
          <ConfirmationModal
            show={!!this.state.onConfirm}
            message={I18NextService.i18n.t(
              "delete_oauth_provider_are_you_sure",
            )}
            loadingMessage={I18NextService.i18n.t("deleting_oauth_provider")}
            onNo={() => this.onConfirmCancellation()}
            onYes={() => this.onConfirmWrapper()}
          />
        </div>
        <h1 className="h4 mb-4">{I18NextService.i18n.t("oauth_config")}</h1>
        <div className="table-responsive col-12">
          <table id="auth_table" className="table table-sm table-hover">
            <thead className="pointer">
              <th>{I18NextService.i18n.t("oauth_providers")}</th>
              <th style="width:20px"></th>
            </thead>
            <tbody>
              {this.state.OAuthProviders.map((cv, index) => (
                <tr key={index}>
                  <td>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`display-name-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_display_name")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`display-name-${index}`}
                          className="form-control"
                          value={cv.display_name}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "display_name",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`issuer-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_issuer")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`issuer-${index}`}
                          className="form-control"
                          disabled={!!cv.id}
                          value={cv.issuer}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "issuer",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`authorization-endpoint-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_authorization_endpoint")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`authorization-endpoint-${index}`}
                          className="form-control"
                          value={cv.authorization_endpoint}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "authorization_endpoint",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`token-endpoint-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_token_endpoint")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`token-endpoint-${index}`}
                          className="form-control"
                          value={cv.token_endpoint}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "token_endpoint",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`userinfo-endpoint-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_userinfo_endpoint")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`userinfo-endpoint-${index}`}
                          className="form-control"
                          value={cv.userinfo_endpoint}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "userinfo_endpoint",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`id-claim-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_id_claim")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`id-claim-${index}`}
                          className="form-control"
                          value={cv.id_claim}
                          placeholder="sub"
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "id_claim",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`client-id-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_client_id")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`client-id-${index}`}
                          className="form-control"
                          disabled={!!cv.id}
                          value={cv.client_id}
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "client_id",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`client-secret-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_client_secret")}
                      </label>
                      <div className="col-12">
                        <input
                          type="password"
                          id={`client-secret-${index}`}
                          className="form-control"
                          value={cv.client_secret}
                          placeholder={
                            !cv.id ? "" : "Secret cannot be viewed after saving"
                          }
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "client_secret",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <label
                        className="col-12 col-form-label"
                        htmlFor={`scopes-${index}`}
                      >
                        {I18NextService.i18n.t("oauth_scopes")}
                      </label>
                      <div className="col-12">
                        <input
                          type="text"
                          id={`scopes-${index}`}
                          className="form-control"
                          value={cv.scopes}
                          placeholder="openid name email"
                          onInput={linkEvent(
                            {
                              form: this,
                              propertyName: "scopes",
                              index: index,
                            },
                            this.handlePropertyChange,
                          )}
                        />
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            id={`auto-verify-email-${index}`}
                            type="checkbox"
                            checked={cv.auto_verify_email}
                            onInput={linkEvent(
                              {
                                form: this,
                                propertyName: "auto_verify_email",
                                index: index,
                              },
                              this.handleCheckboxPropertyChange,
                            )}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`auto-verify-email-${index}`}
                          >
                            {I18NextService.i18n.t("oauth_auto_verify_email")}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            id={`account-linking-enabled-${index}`}
                            type="checkbox"
                            checked={cv.account_linking_enabled}
                            onInput={linkEvent(
                              {
                                form: this,
                                propertyName: "account_linking_enabled",
                                index: index,
                              },
                              this.handleCheckboxPropertyChange,
                            )}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`account-linking-enabled-${index}`}
                          >
                            {I18NextService.i18n.t(
                              "oauth_account_linking_enabled",
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            id={`enabled-${index}`}
                            type="checkbox"
                            checked={cv.enabled}
                            onInput={linkEvent(
                              {
                                form: this,
                                propertyName: "enabled",
                                index: index,
                              },
                              this.handleCheckboxPropertyChange,
                            )}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`enabled-${index}`}
                          >
                            {I18NextService.i18n.t("oauth_enabled")}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3 row">
                      <span title={this.getEditTooltip(cv)}>
                        <button
                          className={
                            (this.canEdit(cv)
                              ? "text-success "
                              : "text-muted ") + "btn btn-link btn-animate"
                          }
                          onClick={linkEvent(
                            { i: this, cv: cv },
                            this.handleEditAuthClick,
                          )}
                          data-tippy-content={I18NextService.i18n.t("save")}
                          aria-label={I18NextService.i18n.t("save")}
                          disabled={!this.canEdit(cv)}
                        >
                          {capitalizeFirstLetter(I18NextService.i18n.t("save"))}
                        </button>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <button
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(
                          { i: this, index: index, cv: cv },
                          this.handleDeleteAuthClick,
                        )}
                        data-tippy-content={I18NextService.i18n.t("delete")}
                        aria-label={I18NextService.i18n.t("delete")}
                        title={I18NextService.i18n.t("delete")}
                      >
                        <Icon icon="trash" classes="icon-inline text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={linkEvent(this, this.handleAddOauthClick)}
          >
            {I18NextService.i18n.t("add_oauth_provider")}
          </button>
          {PRESET_OAUTH_PROVIDERS.filter(
            provider =>
              this.state.OAuthProviders.findIndex(
                p => p.issuer === provider.issuer,
              ) === -1,
          ).map(provider => (
            <button
              className="btn btn-sm btn-secondary me-2"
              onClick={linkEvent(
                this,
                this.handleAddPresetOauthClick(provider),
              )}
            >
              {I18NextService.i18n.t("add_oauth_preset_provider")}{" "}
              {provider.display_name}
            </button>
          ))}
        </div>
        <br />
        <div className="row">
          {I18NextService.i18n.t("auth_callback")}
          <code style="display: inline; width: unset;">
            {getExternalHost()}/api/v3/oauth/callback
          </code>
        </div>
      </div>
    );
  }

  canEdit(cv: OAuthProviderExt) {
    let noEmptyFields =
      cv.display_name.length > 0 &&
      (cv.issuer?.length || 0) > 0 &&
      cv.client_id.length > 0 &&
      cv.scopes.length > 0;
    if (!cv.id) {
      noEmptyFields = noEmptyFields && (cv?.client_secret?.length || 0) > 0;
    }
    noEmptyFields =
      noEmptyFields &&
      cv.authorization_endpoint.length > 0 &&
      (cv.token_endpoint?.length || 0) > 0 &&
      (cv.userinfo_endpoint?.length || 0) > 0 &&
      (cv.id_claim?.length || 0) > 0;
    return noEmptyFields && cv.changed;
  }

  getEditTooltip(cv: OAuthProviderExt) {
    if (this.canEdit(cv)) return I18NextService.i18n.t("save");
    else return I18NextService.i18n.t("oauth_provider_save_validation");
  }

  handlePropertyChange(
    props: { form: OAuthProviderForm; propertyName: string; index: number },
    event: any,
  ) {
    const oauth_providers = [...props.form.state.OAuthProviders];
    const item = {
      ...props.form.state.OAuthProviders[props.index],
      [props.propertyName]: event.target.value,
      changed: true,
    };
    oauth_providers[Number(props.index)] = item;
    props.form.setState({ OAuthProviders: oauth_providers });
  }

  handleCheckboxPropertyChange(
    props: { form: OAuthProviderForm; propertyName: string; index: number },
    event: any,
  ) {
    const oauth_providers = [...props.form.state.OAuthProviders];
    const item = {
      ...props.form.state.OAuthProviders[props.index],
      [props.propertyName]: event.target.checked,
      changed: true,
    };
    oauth_providers[Number(props.index)] = item;
    props.form.setState({ OAuthProviders: oauth_providers });
  }

  handleDeleteAuthClick(d: {
    i: OAuthProviderForm;
    index: number;
    cv: OAuthProvider;
  }) {
    d.i.setState(prevState => ({
      ...prevState,
      onConfirm: async () => {
        if (d.cv.id) {
          const deleted = await d.i.props.onDelete({ id: d.cv.id });
          if (deleted) {
            d.i.setState(prevState => ({
              ...prevState,
              OAuthProviders: prevState.OAuthProviders.filter(
                p => p?.id !== d.cv.id,
              ),
            }));
          }
        } else {
          d.i.setState(prevState => ({
            ...prevState,
            OAuthProviders: d.i.state.OAuthProviders.filter(
              (_, i) => i !== d.index,
            ),
          }));
        }
      },
    }));
  }

  async handleEditAuthClick(d: { i: OAuthProviderForm; cv: OAuthProviderExt }) {
    if (d.cv.id) {
      d.i.props.onEdit({
        id: d.cv.id,
        display_name: d.cv.display_name,
        authorization_endpoint: d.cv.authorization_endpoint,
        token_endpoint: d.cv.token_endpoint || "",
        userinfo_endpoint: d.cv.userinfo_endpoint || "",
        id_claim: d.cv.id_claim || "",
        client_secret: d.cv.client_secret || "",
        scopes: d.cv.scopes,
        auto_verify_email: d.cv.auto_verify_email || false,
        account_linking_enabled: d.cv.account_linking_enabled || false,
        enabled: d.cv.enabled || false,
      });
      d.i.setState(prevState => ({
        ...prevState,
        OAuthProviders: prevState.OAuthProviders.map(p =>
          p?.id === d.cv.id
            ? ({ ...d.cv, changed: false } as OAuthProviderExt)
            : p,
        ),
      }));
    } else {
      const newOAuthProvider = await d.i.props.onCreate({
        display_name: d.cv.display_name,
        issuer: d.cv.issuer || "",
        authorization_endpoint: d.cv.authorization_endpoint,
        token_endpoint: d.cv.token_endpoint || "",
        userinfo_endpoint: d.cv.userinfo_endpoint || "",
        id_claim: d.cv.id_claim || "",
        client_id: d.cv.client_id,
        client_secret: d.cv.client_secret,
        scopes: d.cv.scopes,
        auto_verify_email: d.cv.auto_verify_email || false,
        account_linking_enabled: d.cv.account_linking_enabled || false,
        enabled: d.cv.enabled || false,
      });
      if (newOAuthProvider) {
        d.i.setState(prevState => ({
          ...prevState,
          OAuthProviders: prevState.OAuthProviders.map(p =>
            p?.client_id === d.cv.client_id
              ? formatProvider(newOAuthProvider)
              : p,
          ),
        }));
      }
    }
  }

  handleAddOauthClick(form: OAuthProviderForm, event: any) {
    event.preventDefault();
    form.setState(prevState => {
      const item: OAuthProviderExt = {
        id: 0,
        display_name: "",
        issuer: "",
        authorization_endpoint: "",
        token_endpoint: "",
        userinfo_endpoint: "",
        id_claim: "",
        client_id: "",
        client_secret: "",
        scopes: "openid email",
        auto_verify_email: false,
        account_linking_enabled: false,
        enabled: false,
        published: "",
        changed: false,
      };

      return {
        ...prevState,
        OAuthProviders: [...prevState.OAuthProviders, item],
      };
    });
  }

  handleAddPresetOauthClick(provider) {
    return (form: OAuthProviderForm, event: any) => {
      event.preventDefault();
      form.setState(prevState => {
        const item: OAuthProviderExt = {
          id: "",
          display_name: "",
          issuer: "",
          authorization_endpoint: "",
          token_endpoint: "",
          userinfo_endpoint: "",
          id_claim: "",
          client_id: "",
          client_secret: "",
          scopes: "openid email",
          auto_verify_email: false,
          account_linking_enabled: false,
          enabled: false,
          published: "",
          changed: false,
          ...provider,
        };

        return {
          ...prevState,
          OAuthProviders: [...prevState.OAuthProviders, item],
        };
      });
    };
  }
}
