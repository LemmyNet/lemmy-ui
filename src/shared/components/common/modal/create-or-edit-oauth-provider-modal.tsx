import {
  Component,
  FormEventHandler,
  MouseEventHandler,
  RefObject,
  createRef,
  linkEvent,
} from "inferno";
import type { Modal } from "bootstrap";
import { modalMixin } from "../../mixins/modal-mixin";
import { I18NextService } from "../../../services/I18NextService";
import {
  CreateOAuthProvider,
  EditOAuthProvider,
  OAuthProvider,
} from "lemmy-js-client";
import { ProviderToEdit } from "@utils/types/oauth";

export type CreateOrEditOAuthProviderModalData =
  | { type: "add"; provider?: ProviderToEdit }
  | { type: "edit" | "add"; provider: OAuthProvider };

interface CreateOrEditOAuthProviderModalProps {
  onClose: MouseEventHandler<HTMLButtonElement>;
  show: boolean;
  data: CreateOrEditOAuthProviderModalData;
  onSubmit: (
    provider: CreateOAuthProvider | EditOAuthProvider,
  ) => Promise<void>;
}

interface CreateOrEditOAuthProviderModalState {
  changed: boolean;
  provider: Partial<CreateOAuthProvider>;
  loading: boolean;
}

interface ProviderFieldProps {
  id: string;
  i18nKey: string;
  onInput: FormEventHandler<HTMLInputElement>;
}

interface ProviderTextFieldProps extends ProviderFieldProps {
  disabled?: boolean;
  placeholder?: string;
  type?: "text" | "url" | "password";
  value?: string;
  required?: boolean;
}

type ProviderBooleanProperties =
  | "enabled"
  | "account_linking_enabled"
  | "auto_verify_email";

interface ProviderCheckboxFieldProps extends ProviderFieldProps {
  checked?: boolean;
}

const FORM_ID = "create-or-edit-oauth-provider-form-id";

function handleTextPropertyChange(
  {
    modal,
    property,
  }: {
    modal: CreateOrEditOAuthProviderModal;
    property: Exclude<keyof CreateOAuthProvider, ProviderBooleanProperties>;
  },
  event: any,
) {
  modal.setState(prevState => ({
    changed: true,
    provider: {
      ...prevState.provider,
      [property]: event.target.value,
    },
  }));
}

function handleBooleanPropertyChange({
  modal,
  property,
}: {
  modal: CreateOrEditOAuthProviderModal;
  property: Extract<keyof ProviderToEdit, ProviderBooleanProperties>;
}) {
  modal.setState(prevState => ({
    changed: true,
    provider: {
      ...prevState.provider,
      [property]: !prevState.provider[property],
    },
  }));
}

function ProviderTextField({
  id,
  i18nKey,
  type = "text",
  value,
  onInput,
  required = true,
  disabled,
  placeholder,
}: ProviderTextFieldProps) {
  return (
    <div className="col">
      <label className="form-label" htmlFor={id}>
        {I18NextService.i18n.t(i18nKey)}
      </label>
      <input
        type={type}
        id={id}
        className="form-control"
        value={value}
        onInput={onInput}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

function ProviderCheckboxField({
  i18nKey,
  id,
  onInput,
  checked,
}: ProviderCheckboxFieldProps) {
  return (
    <div className="form-check form-check-inline m-2">
      <input
        id={id}
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onInput={onInput}
      />
      <label htmlFor={id} className="form-check-label">
        {I18NextService.i18n.t(i18nKey)}
      </label>
    </div>
  );
}

@modalMixin
export default class CreateOrEditOAuthProviderModal extends Component<
  CreateOrEditOAuthProviderModalProps,
  CreateOrEditOAuthProviderModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  modal?: Modal;

  state: CreateOrEditOAuthProviderModalState = {
    changed: false,
    provider: {},
    loading: false,
  };

  constructor(props: CreateOrEditOAuthProviderModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidUpdate(prevProps: Readonly<CreateOrEditOAuthProviderModalProps>) {
    if (this.props.show && this.props.show !== prevProps.show) {
      this.setState({ provider: this.props.data.provider ?? {} });
    }
  }

  render(
    { onClose, data }: CreateOrEditOAuthProviderModalProps,
    { provider, changed, loading }: CreateOrEditOAuthProviderModalState,
  ) {
    return (
      <div
        className="modal fade"
        id="create-or-edit-oauth-modal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#create-or-edit-oauth-modal-title"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header">
              <h1
                className="modal-title h4"
                id="create-or-edit-oauth-modal-title"
              >
                {data.type === "edit"
                  ? `Edit ${data.provider.display_name}`
                  : "Add OAuth Provider"}
              </h1>
              <button
                type="button"
                className="btn-close"
                aria-label={I18NextService.i18n.t("cancel")}
                onClick={onClose}
              />
            </div>
            <div className="modal-body p-2-!important">
              <form
                id={FORM_ID}
                className="container"
                onSubmit={this.handleSubmit}
              >
                <div className="row row-cols-1 mb-3 gy-2">
                  <ProviderTextField
                    id="display-name"
                    i18nKey="oauth_display_name"
                    value={provider?.display_name}
                    onInput={linkEvent(
                      { modal: this, property: "display_name" },
                      handleTextPropertyChange,
                    )}
                  />
                  <ProviderTextField
                    id="issuer"
                    i18nKey="oauth_issuer"
                    value={provider?.issuer}
                    onInput={linkEvent(
                      { modal: this, property: "issuer" },
                      handleTextPropertyChange,
                    )}
                    type="url"
                    disabled={data.type === "edit"}
                  />
                  <ProviderTextField
                    id="authorization-endpoint"
                    i18nKey="oauth_authorization_endpoint"
                    value={provider?.authorization_endpoint}
                    onInput={linkEvent(
                      { modal: this, property: "authorization_endpoint" },
                      handleTextPropertyChange,
                    )}
                    type="url"
                  />
                  <ProviderTextField
                    id="token-endpoint"
                    i18nKey="oauth_token_endpoint"
                    value={provider?.token_endpoint}
                    onInput={linkEvent(
                      { modal: this, property: "token_endpoint" },
                      handleTextPropertyChange,
                    )}
                    type="url"
                  />
                  <ProviderTextField
                    id="userinfo-endpoint"
                    i18nKey="oauth_userinfo_endpoint"
                    value={provider?.userinfo_endpoint}
                    onInput={linkEvent(
                      { modal: this, property: "userinfo_endpoint" },
                      handleTextPropertyChange,
                    )}
                    type="url"
                  />
                  <ProviderTextField
                    id="id-claim"
                    i18nKey="oauth_id_claim"
                    value={provider?.id_claim}
                    onInput={linkEvent(
                      { modal: this, property: "id_claim" },
                      handleTextPropertyChange,
                    )}
                  />
                  <ProviderTextField
                    id="client-id"
                    i18nKey="oauth_client_id"
                    value={provider?.client_id}
                    disabled={data.type === "edit"}
                    onInput={linkEvent(
                      { modal: this, property: "client_id" },
                      handleTextPropertyChange,
                    )}
                  />
                  <ProviderTextField
                    id="client-secret"
                    i18nKey="oauth_client_secret"
                    onInput={linkEvent(
                      { modal: this, property: "client_secret" },
                      handleTextPropertyChange,
                    )}
                    type="password"
                    placeholder={
                      data.type === "edit"
                        ? I18NextService.i18n.t(
                            "cannot_view_secret_after_saving",
                          )
                        : undefined
                    }
                    required={data.type === "add"}
                    value={provider.client_secret}
                  />
                  <ProviderTextField
                    id="scopes"
                    i18nKey="oauth_scopes"
                    value={provider?.scopes}
                    onInput={linkEvent(
                      { modal: this, property: "scopes" },
                      handleTextPropertyChange,
                    )}
                  />
                </div>
                <div className="row">
                  <div className="col">
                    <ProviderCheckboxField
                      id="auto-verfiy-email"
                      i18nKey="oauth_auto_verify_email"
                      checked={provider?.auto_verify_email}
                      onInput={linkEvent(
                        {
                          modal: this,
                          property: "auto_verify_email",
                        },
                        handleBooleanPropertyChange,
                      )}
                    />
                    <ProviderCheckboxField
                      id="account-linking-enabled"
                      i18nKey="oauth_account_linking_enabled"
                      checked={provider?.account_linking_enabled}
                      onInput={linkEvent(
                        {
                          modal: this,
                          property: "account_linking_enabled",
                        },
                        handleBooleanPropertyChange,
                      )}
                    />
                    <ProviderCheckboxField
                      id="oauth-enabled"
                      i18nKey="oauth_enabled"
                      checked={provider?.enabled ?? true}
                      onInput={linkEvent(
                        {
                          modal: this,
                          property: "enabled",
                        },
                        handleBooleanPropertyChange,
                      )}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                onClick={onClose}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
              <button
                type="submit"
                form={FORM_ID}
                className="btn btn-success"
                disabled={!changed || loading}
              >
                {I18NextService.i18n.t(data.type === "edit" ? "edit" : "add")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async handleSubmit(event) {
    event.preventDefault();

    this.setState({ loading: true });
    await this.props.onSubmit(this.state.provider as CreateOAuthProvider);
    this.setState({ loading: false, changed: false, provider: {} });
  }
}
