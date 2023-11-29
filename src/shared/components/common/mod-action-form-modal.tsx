import { Component, RefObject, createRef, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { PurgeWarning, Spinner } from "./icon";
import { hostname, randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { Community, Person } from "lemmy-js-client";

export interface BanUpdateForm {
  reason?: string;
  shouldRemove?: boolean;
  daysUntilExpires?: number;
}

interface ModActionFormModalPropsSiteBan {
  modActionType: "site-ban";
  onSubmit: (form: BanUpdateForm) => void;
  creator: Person;
  isBanned: boolean;
}

interface ModActionFormModalPropsCommunityBan {
  modActionType: "community-ban";
  onSubmit: (form: BanUpdateForm) => void;
  creator: Person;
  community: Community;
  isBanned: boolean;
}

interface ModActionFormModalPropsPurgePerson {
  modActionType: "purge-person";
  onSubmit: (reason: string) => void;
  creator: Person;
}

interface ModActionFormModalPropsRemove {
  modActionType: "remove-post" | "remove-comment";
  onSubmit: (reason: string) => void;
  isRemoved: boolean;
}

interface ModActionFormModalPropsRest {
  modActionType:
    | "report-post"
    | "report-comment"
    | "report-message"
    | "purge-post"
    | "purge-comment";
  onSubmit: (reason: string) => void;
}

type ModActionFormModalProps = (
  | ModActionFormModalPropsSiteBan
  | ModActionFormModalPropsCommunityBan
  | ModActionFormModalPropsRest
  | ModActionFormModalPropsPurgePerson
  | ModActionFormModalPropsRemove
) & { onCancel: () => void; show: boolean };

interface ModActionFormFormState {
  loading: boolean;
  reason: string;
  daysUntilExpire?: number;
  shouldRemoveData?: boolean;
  shouldPermaBan?: boolean;
}

function handleReasonChange(i: ModActionFormModal, event: any) {
  i.setState({ reason: event.target.value });
}

function handleExpiryChange(i: ModActionFormModal, event: any) {
  i.setState({ daysUntilExpire: parseInt(event.target.value, 10) });
}

function handleToggleRemove(i: ModActionFormModal) {
  i.setState(prev => ({
    ...prev,
    shouldRemoveData: !prev.shouldRemoveData,
  }));
}

function handleTogglePermaBan(i: ModActionFormModal) {
  i.setState(prev => ({
    ...prev,
    shouldPermaBan: !prev.shouldPermaBan,
    daysUntilExpire: undefined,
  }));
}

function handleSubmit(i: ModActionFormModal, event: any) {
  event.preventDefault();
  i.setState({ loading: true });

  if (i.isBanModal) {
    i.props.onSubmit({
      reason: i.state.reason,
      daysUntilExpires: i.state.daysUntilExpire!,
      shouldRemove: i.state.shouldRemoveData!,
    } as BanUpdateForm & string); // Need to & string to handle type weirdness
  } else {
    i.props.onSubmit(i.state.reason);
  }

  i.setState({
    loading: false,
    reason: "",
  });
}

function getApubName({ name, actor_id }: { name: string; actor_id: string }) {
  return `${name}@${hostname(actor_id)}`;
}

export default class ModActionFormModal extends Component<
  ModActionFormModalProps,
  ModActionFormFormState
> {
  private modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal: Modal;
  state: ModActionFormFormState = {
    loading: false,
    reason: "",
  };

  constructor(props: ModActionFormModalProps, context: any) {
    super(props, context);
    this.modalDivRef = createRef();
    this.reasonRef = createRef();

    if (this.isBanModal) {
      this.state.shouldRemoveData = false;
    }

    this.handleShow = this.handleShow.bind(this);
  }

  async componentDidMount() {
    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    const Modal = (await import("bootstrap/js/dist/modal")).default;
    this.modal = new Modal(this.modalDivRef.current!);

    if (this.props.show) {
      this.modal.show();
    }
  }

  componentWillUnmount() {
    this.modalDivRef.current?.removeEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    this.modal.dispose();
  }

  componentDidUpdate({ show: prevShow }: ModActionFormModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal.show();
      } else {
        this.modal.hide();
      }
    }
  }

  render() {
    const {
      loading,
      reason,
      daysUntilExpire,
      shouldRemoveData,
      shouldPermaBan,
    } = this.state;
    const reasonId = `mod-form-reason-${randomStr()}`;
    const expiresId = `mod-form-expires-${randomStr()}`;
    const { modActionType, onCancel } = this.props;

    const formId = `mod-action-form-${randomStr()}`;

    let buttonText: string;
    let headerText: string;
    let isBanned = false;
    switch (modActionType) {
      case "site-ban": {
        headerText = `${I18NextService.i18n.t(
          this.props.isBanned ? "unban" : "ban",
        )} ${getApubName(this.props.creator)}`;
        buttonText = I18NextService.i18n.t(
          this.props.isBanned ? "unban" : "ban",
        );
        isBanned = this.props.isBanned;
        break;
      }

      case "community-ban": {
        headerText = `${I18NextService.i18n.t(
          this.props.isBanned ? "unban" : "ban",
        )} ${getApubName(this.props.creator)} from ${getApubName(
          this.props.community,
        )}`;
        buttonText = I18NextService.i18n.t(
          this.props.isBanned ? "unban" : "ban",
        );
        isBanned = this.props.isBanned;
        break;
      }

      case "purge-post": {
        headerText = "Purge Post";
        buttonText = I18NextService.i18n.t("purge");
        break;
      }

      case "purge-comment": {
        headerText = "Purge Comment";
        buttonText = I18NextService.i18n.t("purge");
        break;
      }

      case "purge-person": {
        headerText = `${I18NextService.i18n.t("purge")} ${getApubName(
          this.props.creator,
        )}`;
        buttonText = I18NextService.i18n.t("purge");
        break;
      }

      case "remove-post": {
        headerText =
          I18NextService.i18n.t(this.props.isRemoved ? "restore" : "remove") +
          " post";
        buttonText = I18NextService.i18n.t(
          this.props.isRemoved ? "restore" : "remove",
        );
        break;
      }

      case "remove-comment": {
        headerText =
          I18NextService.i18n.t(this.props.isRemoved ? "restore" : "remove") +
          " comment";
        buttonText = I18NextService.i18n.t(
          this.props.isRemoved ? "restore" : "remove",
        );
        break;
      }

      case "report-post": {
        headerText = "Report post";
        buttonText = I18NextService.i18n.t("create_report");
        break;
      }

      case "report-comment": {
        headerText = "Report comment";
        buttonText = I18NextService.i18n.t("create_report");
        break;
      }

      case "report-message": {
        headerText = "Report message";
        buttonText = I18NextService.i18n.t("create_report");
        break;
      }
    }

    const showExpiresField = !(isBanned || shouldPermaBan);

    return (
      <div
        className="modal modal-lg fade"
        id="moderationModal"
        tabIndex={-1}
        aria-hidden
        data-bs-backdrop="static"
        aria-labelledby="#moderationModalTitle"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="moderationModalTitle">
                {headerText}
              </h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onCancel}
              />
            </header>
            <div className="modal-body d-flex flex-column  align-items-center justify-content-center">
              <form
                onSubmit={linkEvent(this, handleSubmit)}
                className="p-3 w-75"
                id={formId}
              >
                <div className="row mb-3">
                  <div
                    className={classNames("col-12", {
                      "col-lg-6 col-xl-7": showExpiresField,
                    })}
                  >
                    {this.props.modActionType.includes("purge") && (
                      <PurgeWarning />
                    )}
                    <label className="visually-hidden" htmlFor={reasonId}>
                      {I18NextService.i18n.t("reason")}
                    </label>
                    <input
                      type="text"
                      id={reasonId}
                      className="form-control my-2 my-lg-0"
                      placeholder={I18NextService.i18n.t("reason")}
                      required
                      value={reason}
                      onInput={linkEvent(this, handleReasonChange)}
                    />
                  </div>
                  {this.isBanModal && showExpiresField && (
                    <div className="col-12 col-lg-6 col-xl-5">
                      <label className="visually-hidden" htmlFor={expiresId}>
                        {I18NextService.i18n.t("expires")}
                      </label>
                      <input
                        type="number"
                        id={expiresId}
                        className="form-control my-2 my-lg-0"
                        placeholder="Days until expiration"
                        min={1}
                        value={daysUntilExpire}
                        onInput={linkEvent(this, handleExpiryChange)}
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="row">
                  {this.isBanModal && !isBanned && (
                    <div className="mb-2 col-12 col-lg-6 col-xxl-7">
                      <div className="form-check m2-3">
                        <label
                          className="form-check-label me-3 user-select-none"
                          title={I18NextService.i18n.t("remove_content_more")}
                        >
                          <input
                            className="form-check-input user-select-none"
                            type="checkbox"
                            checked={shouldRemoveData}
                            onChange={linkEvent(this, handleToggleRemove)}
                          />
                          {I18NextService.i18n.t("remove_content")}
                        </label>
                      </div>
                      <div className="form-check mt-2">
                        <label
                          className="form-check-label"
                          title={I18NextService.i18n.t("remove_content_more")}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            onChange={linkEvent(this, handleTogglePermaBan)}
                            checked={shouldPermaBan}
                          />
                          Permanently ban
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="submit"
                className="btn btn-secondary me-3"
                form={formId}
              >
                {loading ? <Spinner /> : buttonText}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={onCancel}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.reasonRef.current?.focus();
  }

  get isBanModal() {
    return (
      this.props.modActionType === "site-ban" ||
      this.props.modActionType === "community-ban"
    );
  }
}
