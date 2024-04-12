import { Component, RefObject, createRef, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { PurgeWarning, Spinner } from "./icon";
import { getApubName, randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { Community, Person } from "lemmy-js-client";
import { LoadingEllipses } from "./loading-ellipses";

export interface BanUpdateForm {
  reason?: string;
  shouldRemove?: boolean;
  daysUntilExpires?: number;
}

interface ModActionFormModalPropsSiteBan {
  modActionType: "site-ban";
  onSubmit: (form: BanUpdateForm) => Promise<void>;
  creator: Person;
  isBanned: boolean;
}

interface ModActionFormModalPropsCommunityBan {
  modActionType: "community-ban";
  onSubmit: (form: BanUpdateForm) => Promise<void>;
  creator: Person;
  community: Community;
  isBanned: boolean;
}

interface ModActionFormModalPropsPurgePerson {
  modActionType: "purge-person";
  onSubmit: (reason: string) => Promise<void>;
  creator: Person;
}

interface ModActionFormModalPropsRemove {
  modActionType: "remove-post" | "remove-comment";
  onSubmit: (reason: string) => Promise<void>;
  isRemoved: boolean;
}

interface ModActionFormModalPropsRest {
  modActionType:
    | "report-post"
    | "report-comment"
    | "report-message"
    | "purge-post"
    | "purge-comment";
  onSubmit: (reason: string) => Promise<void>;
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

async function handleSubmit(i: ModActionFormModal, event: any) {
  event.preventDefault();
  i.setState({ loading: true });

  if (i.isBanModal) {
    await i.props.onSubmit({
      reason: i.state.reason,
      daysUntilExpires: i.state.daysUntilExpire!,
      shouldRemove: i.state.shouldRemoveData!,
    } as BanUpdateForm & string); // Need to & string to handle type weirdness
  } else {
    await i.props.onSubmit(i.state.reason);
  }

  i.setState({
    loading: false,
    reason: "",
  });
}

export default class ModActionFormModal extends Component<
  ModActionFormModalProps,
  ModActionFormFormState
> {
  private modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;
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
    const Modal = (await import("bootstrap/js/dist/modal")).default;

    if (!this.modalDivRef.current) {
      return;
    }

    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );
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

    this.modal?.dispose();
  }

  componentDidUpdate({ show: prevShow }: ModActionFormModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal?.show();
      } else {
        this.modal?.hide();
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

    const isBanned =
      (modActionType === "site-ban" || modActionType === "community-ban") &&
      this.props.isBanned;

    const showExpiresField = this.isBanModal && !(isBanned || shouldPermaBan);

    return (
      <div
        className={classNames("modal fade", {
          "modal-lg": this.isBanModal,
        })}
        data-bs-backdrop="static"
        id="moderationModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#moderationModalTitle"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="moderationModalTitle">
                {this.headerText}
              </h3>
            </header>
            <div
              className={classNames("modal-body text-body", {
                "text-center": loading,
              })}
            >
              {loading ? (
                <>
                  <Spinner large />
                  <div>
                    {this.loadingText}
                    <LoadingEllipses />
                  </div>
                </>
              ) : (
                <form
                  onSubmit={linkEvent(this, handleSubmit)}
                  className="p-3 w-100 container"
                  id={formId}
                >
                  <div className="row mb-3">
                    <div
                      className={classNames("col-12", {
                        "col-lg-6 col-xl-7": showExpiresField,
                      })}
                    >
                      {modActionType.includes("purge") && <PurgeWarning />}
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
                        ref={this.reasonRef}
                      />
                    </div>
                    {showExpiresField && (
                      <div className="col-12 col-lg-6 col-xl-5">
                        <label className="visually-hidden" htmlFor={expiresId}>
                          {I18NextService.i18n.t("expires")}
                        </label>
                        <input
                          type="number"
                          id={expiresId}
                          className="form-control my-2 my-lg-0"
                          placeholder={I18NextService.i18n.t(
                            "days_until_expiration",
                          )}
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
                            {I18NextService.i18n.t("permanently_ban")}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
            <footer className="modal-footer">
              <button
                type="submit"
                className="btn btn-secondary me-3"
                form={formId}
                disabled={loading}
              >
                {this.buttonText}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={onCancel}
                disabled={loading}
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

  get headerText() {
    switch (this.props.modActionType) {
      case "site-ban": {
        return I18NextService.i18n.t(
          this.props.isBanned ? "unban_with_name" : "ban_with_name",
          {
            user: getApubName(this.props.creator),
          },
        );
      }

      case "community-ban": {
        return I18NextService.i18n.t(
          this.props.isBanned
            ? "unban_from_community_with_name"
            : "ban_from_community_with_name",
          {
            user: getApubName(this.props.creator),
            community: getApubName(this.props.community),
          },
        );
      }

      case "purge-post": {
        return I18NextService.i18n.t("purge_post");
      }

      case "purge-comment": {
        return I18NextService.i18n.t("purge_comment");
      }

      case "purge-person": {
        return I18NextService.i18n.t("purge_user_with_name", {
          user: getApubName(this.props.creator),
        });
      }

      case "remove-post": {
        return I18NextService.i18n.t(
          this.props.isRemoved ? "restore_post" : "remove_post",
        );
      }

      case "remove-comment": {
        return I18NextService.i18n.t(
          this.props.isRemoved ? "restore_comment" : "remove_comment",
        );
      }

      case "report-post": {
        return I18NextService.i18n.t("report_post");
      }

      case "report-comment": {
        return I18NextService.i18n.t("report_comment");
      }

      case "report-message": {
        return I18NextService.i18n.t("report_message");
      }
    }
  }

  get buttonText() {
    switch (this.props.modActionType) {
      case "site-ban":
      case "community-ban": {
        return I18NextService.i18n.t(this.props.isBanned ? "unban" : "ban");
      }

      case "purge-post":
      case "purge-comment":
      case "purge-person": {
        return I18NextService.i18n.t("purge");
      }

      case "remove-post":
      case "remove-comment": {
        return I18NextService.i18n.t(
          this.props.isRemoved ? "restore" : "remove",
        );
      }

      case "report-post":
      case "report-comment":
      case "report-message": {
        return I18NextService.i18n.t("create_report");
      }
    }
  }

  get loadingText() {
    let translation: string;

    switch (this.props.modActionType) {
      case "site-ban":
      case "community-ban": {
        translation = this.props.isBanned ? "unbanning" : "banning";
        break;
      }

      case "purge-post":
      case "purge-comment":
      case "purge-person": {
        translation = "purging";
        break;
      }

      case "remove-post":
      case "remove-comment": {
        translation = this.props.isRemoved ? "restoring" : "removing";
        break;
      }

      case "report-post":
      case "report-comment":
      case "report-message": {
        translation = "creating_report";
        break;
      }
    }

    return I18NextService.i18n.t(translation);
  }
}
