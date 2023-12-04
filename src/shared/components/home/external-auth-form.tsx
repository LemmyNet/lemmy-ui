import { setIsoData } from "@utils/app";
import { getExternalHost } from "@utils/env";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import {
  CreateExternalAuth,
  DeleteExternalAuth,
  EditExternalAuth,
  GetSiteResponse,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";

interface ExternalAuthFormProps {
  onEdit(form: EditExternalAuth): void;
  onCreate(form: CreateExternalAuth): void;
  onDelete(form: DeleteExternalAuth): void;
}

interface ExternalAuthFormState {
  siteRes: GetSiteResponse;
  externalAuths: ExternalAuthViewForm[];
}

interface ExternalAuthViewForm {
  id: number;
  display_name: string;
  auth_type: string;
  auth_endpoint: string;
  token_endpoint: string;
  user_endpoint: string;
  id_attribute: string;
  issuer: string;
  client_id: string;
  client_secret: string;
  scopes: string;
  changed: boolean;
}

export class ExternalAuthForm extends Component<ExternalAuthFormProps, ExternalAuthFormState> {
  private isoData = setIsoData(this.context);
  private itemsPerPage = 15;
  private emptyState: ExternalAuthFormState = {
    siteRes: this.isoData.site_res,
    externalAuths: this.isoData.site_res.external_auths.map((x, index) => ({
      id: x.external_auth.id,
      display_name: x.external_auth.display_name,
      auth_type: x.external_auth.auth_type,
      auth_endpoint: x.external_auth.auth_endpoint,
      token_endpoint: x.external_auth.token_endpoint,
      user_endpoint: x.external_auth.user_endpoint,
      id_attribute: x.external_auth.id_attribute,
      issuer: x.external_auth.issuer,
      client_id: x.external_auth.client_id,
      client_secret: x.external_auth.client_secret,
      scopes: x.external_auth.scopes,
      changed: false,
    })) ?? [],
  };
  state: ExternalAuthFormState;
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;

    this.getEditTooltip = this.getEditTooltip.bind(this);
  }
  render() {
    return (
      <div className="home-auth-form col-12">
        <h1 className="h4 mb-4">{I18NextService.i18n.t("external_auth")}</h1>
        <div className="table-responsive col-12">
          <table
            id="auth_table"
            className="table table-sm table-hover"
          >
            <thead className="pointer">
              <th style="width:100px">{I18NextService.i18n.t("column_auth_type")}</th>
              <th>{I18NextService.i18n.t("column_auth_settings")}</th>
              <th style="width:121px"></th>
            </thead>
            <tbody>
              {this.state.externalAuths
                .map((cv, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        id={`auth-type-${index}`}
                        value={cv.auth_type}
                        onChange={linkEvent({ form: this, index: index }, this.handleAuthType)}
                        className="form-select d-inline-block w-auto"
                      >
                        <option value="oauth">
                          {I18NextService.i18n.t("oauth")}
                        </option>
                        <option value="oidc">
                          {I18NextService.i18n.t("oidc")}
                        </option>
                      </select>
                    </td>
                    <td>
                      <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`display-name-${index}`}>
                          {I18NextService.i18n.t("auth_display_name")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`display-name-${index}`}
                            className="form-control"
                            value={cv.display_name}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleDisplayNameChange,
                            )}
                          />
                        </div>
                      </div>
                      {cv.auth_type === "oauth" && <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`auth-endpoint-${index}`}>
                          {I18NextService.i18n.t("auth_endpoint")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`auth-endpoint-${index}`}
                            className="form-control"
                            value={cv.auth_endpoint}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleAuthEndpointChange,
                            )}
                          />
                        </div>
                      </div>}
                      {cv.auth_type === "oauth" && <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`token-endpoint-${index}`}>
                          {I18NextService.i18n.t("token_endpoint")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`token-endpoint-${index}`}
                            className="form-control"
                            value={cv.token_endpoint}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleTokenEndpointChange,
                            )}
                          />
                        </div>
                      </div>}
                      {cv.auth_type === "oauth" && <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`user-endpoint-${index}`}>
                          {I18NextService.i18n.t("user_endpoint")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`user-endpoint-${index}`}
                            className="form-control"
                            value={cv.user_endpoint}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleUserEndpointChange,
                            )}
                          />
                        </div>
                      </div>}
                      {cv.auth_type === "oauth" && <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`id-attribute-${index}`}>
                          {I18NextService.i18n.t("id_attribute")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`id-attribute-${index}`}
                            className="form-control"
                            value={cv.id_attribute}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleIdAttributeChange,
                            )}
                          />
                        </div>
                      </div>}
                      {cv.auth_type === "oidc" && <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`issuer-${index}`}>
                          {I18NextService.i18n.t("issuer")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`issuer-${index}`}
                            className="form-control"
                            value={cv.issuer}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleIssuerChange,
                            )}
                          />
                        </div>
                      </div>}
                      <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`client-id-${index}`}>
                          {I18NextService.i18n.t("client_id")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`client-id-${index}`}
                            className="form-control"
                            value={cv.client_id}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleClientIdChange,
                            )}
                          />
                        </div>
                      </div>
                      <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`client-secret-${index}`}>
                          {I18NextService.i18n.t("client_secret")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`client-secret-${index}`}
                            className="form-control"
                            value={cv.client_secret}
                            placeholder={cv.id === 0 ? "" : "Secret cannot be viewed after saving"}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleClientSecretChange,
                            )}
                          />
                        </div>
                      </div>
                      <div className="mb-3 row">
                        <label className="col-12 col-form-label" htmlFor={`scopes-${index}`}>
                          {I18NextService.i18n.t("auth_scopes")}
                        </label>
                        <div className="col-12">
                          <input
                            type="text"
                            id={`scopes-${index}`}
                            className="form-control"
                            value={cv.scopes}
                            onInput={linkEvent(
                              { form: this, index: index },
                              this.handleScopesChange,
                            )}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
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
                            {capitalizeFirstLetter(
                              I18NextService.i18n.t("save"),
                            )}
                          </button>
                        </span>
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
                          <Icon
                            icon="trash"
                            classes="icon-inline text-danger"
                          />
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
            {I18NextService.i18n.t("add_oauth")}
          </button>
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={linkEvent(this, this.handleAddOidcClick)}
          >
            {I18NextService.i18n.t("add_oidc")}
          </button>
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

  canEdit(cv: ExternalAuthViewForm) {
    let noEmptyFields =
      cv.display_name.length > 0 &&
      cv.client_id.length > 0 &&
      cv.scopes.length > 0;
    if (cv.id === 0) {
      noEmptyFields = noEmptyFields && cv.client_secret.length > 0;
    }
    if (cv.auth_type === "oauth") {
      noEmptyFields = noEmptyFields &&
        cv.auth_endpoint.length > 0 &&
        cv.token_endpoint.length > 0 &&
        cv.user_endpoint.length > 0 &&
        cv.id_attribute.length > 0;
    } else {
      noEmptyFields = noEmptyFields && cv.issuer.length > 0;
    }
    return noEmptyFields && cv.changed;
  }

  getEditTooltip(cv: ExternalAuthViewForm) {
    if (this.canEdit(cv)) return I18NextService.i18n.t("save");
    else return I18NextService.i18n.t("external_auth_save_validation");
  }

  handleAuthType(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      auth_type: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleDisplayNameChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      display_name: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleAuthEndpointChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      auth_endpoint: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleTokenEndpointChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      token_endpoint: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleUserEndpointChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      user_endpoint: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleIdAttributeChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      id_attribute: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleIssuerChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      issuer: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleClientIdChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      client_id: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleClientSecretChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      client_secret: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleScopesChange(
    props: { form: ExternalAuthForm; index: number },
    event: any,
  ) {
    const external_auths = [...props.form.state.externalAuths];
    const item = {
      ...props.form.state.externalAuths[props.index],
      scopes: event.target.value,
      changed: true,
    };
    external_auths[Number(props.index)] = item;
    props.form.setState({ externalAuths: external_auths });
  }

  handleDeleteAuthClick(d: {
    i: ExternalAuthForm;
    index: number;
    cv: ExternalAuthViewForm;
  }) {
    if (d.cv.id !== 0) {
      d.i.props.onDelete({
        id: d.cv.id,
      });
    } else {
      const external_auths = [...d.i.state.externalAuths];
      external_auths.splice(Number(d.index), 1);
      d.i.setState({ externalAuths: external_auths });
    }
  }

  handleEditAuthClick(d: { i: EmojiForm; cv: CustomEmojiViewForm }) {
    if (d.cv.id !== 0) {
      d.i.props.onEdit({
        id: d.cv.id,
        display_name: d.cv.display_name,
        auth_type: d.cv.auth_type,
        auth_endpoint: d.cv.auth_endpoint,
        token_endpoint: d.cv.token_endpoint,
        user_endpoint: d.cv.user_endpoint,
        id_attribute: d.cv.id_attribute,
        issuer: d.cv.issuer,
        client_id: d.cv.client_id,
        client_secret: d.cv.client_secret,
        scopes: d.cv.scopes,
      });
    } else {
      d.i.props.onCreate({
        display_name: d.cv.display_name,
        auth_type: d.cv.auth_type,
        auth_endpoint: d.cv.auth_endpoint,
        token_endpoint: d.cv.token_endpoint,
        user_endpoint: d.cv.user_endpoint,
        id_attribute: d.cv.id_attribute,
        issuer: d.cv.issuer,
        client_id: d.cv.client_id,
        client_secret: d.cv.client_secret,
        scopes: d.cv.scopes,
      });
    }
  }

  handleAddOauthClick(form: ExternalAuthForm, event: any) {
    event.preventDefault();
    form.setState(prevState => {
      const item: ExternalAuthViewForm = {
        id: 0,
        display_name: "",
        auth_type: "oauth",
        auth_endpoint: "",
        token_endpoint: "",
        user_endpoint: "",
        id_attribute: "preferred_username",
        issuer: "",
        client_id: "",
        client_secret: "",
        scopes: "openid profile email",
        changed: false,
      };

      return {
        ...prevState,
        externalAuths: [...prevState.externalAuths, item],
      };
    });
  }

  handleAddOidcClick(form: ExternalAuthForm, event: any) {
    event.preventDefault();
    form.setState(prevState => {
      const item: ExternalAuthViewForm = {
        id: 0,
        display_name: "",
        auth_type: "oidc",
        auth_endpoint: "",
        token_endpoint: "",
        user_endpoint: "",
        id_attribute: "preferred_username",
        issuer: "",
        client_id: "",
        client_secret: "",
        scopes: "openid profile email",
        changed: false,
      };

      return {
        ...prevState,
        externalAuths: [...prevState.externalAuths, item],
      };
    });
  }
}
