import {
  Component,
  FormEventHandler,
  RefObject,
  createRef,
  linkEvent,
} from "inferno";
import type { Modal } from "bootstrap";
import { modalMixin } from "../../mixins/modal-mixin";
import { OAuthProvider } from "lemmy-js-client";
import { I18NextService } from "../../../services/I18NextService";

type PartialOAuthProvider = Partial<OAuthProvider> & { client_secret?: string };

interface CreateOrEditOAuthProviderModalProps {
  onClose: () => void;
  show: boolean;
  provider: PartialOAuthProvider;
}

interface CreateOrEditOAuthProviderModalState {
  changed: boolean;
  client_state?: string;
}

function handlePropertyChange(modal: CreateOrEditOAuthProviderModal) {
  modal.setState({ changed: true });
}

function handleSecretChange(modal: CreateOrEditOAuthProviderModal, event: any) {
  modal.setState({ client_state: event.target.value, changed: true });
}

type ProviderTextFieldProps = {
  id: string;
  i18nKey: string;
  type?: "text" | "url" | "password";
  initialValue?: string;
  onInput: FormEventHandler<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
};

function ProviderTextField({
  id,
  i18nKey,
  type = "text",
  initialValue,
  onInput,
}: ProviderTextFieldProps) {
  return (
    <div className="col">
      <label className="form-label" htmlFor={id}>
        {I18NextService.i18n.t(i18nKey)}
      </label>
      <input
        type={type}
        id="display-name"
        className="form-control"
        value={initialValue}
        onInput={onInput}
      />
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

  state: CreateOrEditOAuthProviderModalState = { changed: false };

  constructor(props: CreateOrEditOAuthProviderModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
  }

  render() {
    const { provider, onClose } = this.props;
    const onInput = linkEvent(this, handlePropertyChange);

    return (
      <div
        className="modal fade"
        id="create-or-edit-oauth-modal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#create-or-edit-oauth-modal-title"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h1 className="modal-title" id="create-or-edit-oauth-modal-title">
                {provider.id
                  ? "Create OAuth Provider"
                  : `Edit ${provider.display_name}`}
              </h1>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </header>
            <div className="modal-body">
              <form class="container">
                <div class="row row-cols-1 row-cols-sm-2">
                  <ProviderTextField
                    id="display-name"
                    i18nKey="oauth_display_name"
                    initialValue={provider.display_name}
                    onInput={onInput}
                  />
                  <ProviderTextField
                    id="issuer"
                    i18nKey="oauth_issuer"
                    initialValue={provider.issuer}
                    onInput={onInput}
                    type="url"
                    disabled={!!provider.id}
                  />
                  <ProviderTextField
                    id="authorization-endpoint"
                    i18nKey="oauth_authorization_endpoint"
                    initialValue={provider.authorization_endpoint}
                    onInput={onInput}
                    type="url"
                  />
                  <ProviderTextField
                    id="token-endpoint"
                    i18nKey="oauth_token_endpoint"
                    initialValue={provider.token_endpoint}
                    onInput={onInput}
                    type="url"
                  />
                  <ProviderTextField
                    id="userinfo-endpoint"
                    i18nKey="oauth_userinfo_endpoint"
                    initialValue={provider.userinfo_endpoint}
                    onInput={onInput}
                    type="url"
                  />
                  <ProviderTextField
                    id="id-claim"
                    i18nKey="oauth_id_claim"
                    initialValue={provider.id_claim}
                    onInput={onInput}
                  />
                  <ProviderTextField
                    id="client-id"
                    i18nKey="oauth_client_id"
                    initialValue={provider.client_id}
                    disabled={!!provider.id}
                    onInput={onInput}
                  />
                  <ProviderTextField
                    id="client-secret"
                    i18nKey="oauth_client_scret"
                    initialValue={provider.client_secret}
                    onInput={linkEvent(this, handleSecretChange)}
                    type="password"
                    placeholder={
                      provider.id
                        ? I18NextService.i18n.t(
                            "cannot_view_secret_after_saving",
                          )
                        : undefined
                    }
                  />
                  <ProviderTextField
                    id="scopes"
                    i18nKey="oauth_scopes"
                    initialValue={provider.scopes}
                    onInput={onInput}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
