import {
  Component,
  FormEvent,
  InfernoNode,
  RefObject,
  createRef,
} from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import { PurgeWarning, Spinner } from "../icon";
import { getApubName, randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { Community, Person } from "lemmy-js-client";
import { LoadingEllipses } from "../loading-ellipses";
import { modalMixin } from "../../mixins/modal-mixin";
import { NoOptionI18nKeys } from "i18next";

export interface BanUpdateForm {
  reason: string;
  shouldRemoveOrRestoreData?: boolean;
  daysUntilExpires?: number;
}

interface ModActionFormModalPropsSiteBan {
  modActionType: "site-ban";
  onSubmit(form: BanUpdateForm): void;
  creator: Person;
  isBanned: boolean;
}

interface ModActionFormModalPropsCommunityBan {
  modActionType: "community-ban";
  onSubmit(form: BanUpdateForm): void;
  creator: Person;
  community?: Community;
  isBanned: boolean;
}

interface ModActionFormModalPropsPurgePerson {
  modActionType: "purge-person";
  onSubmit(reason: string): void;
  creator: Person;
}

interface ModActionFormModalPropsPurgeCommunity {
  modActionType: "purge-community";
  onSubmit(reason: string): void;
  community: Community;
}

interface ModActionFormModalPropsRemove {
  modActionType: "remove-post" | "remove-comment" | "remove-community";
  onSubmit(reason: string): void;
  isRemoved: boolean;
}

interface ModActionFormModalPropsLock {
  modActionType: "lock-post" | "lock-comment";
  onSubmit(reason: string): void;
  isLocked: boolean;
}

interface ModActionFormModalPropsRest {
  modActionType:
    | "report-post"
    | "report-comment"
    | "report-message"
    | "purge-post"
    | "purge-comment";
  onSubmit(reason: string): void;
}

type ModActionFormModalProps = (
  | ModActionFormModalPropsSiteBan
  | ModActionFormModalPropsCommunityBan
  | ModActionFormModalPropsRest
  | ModActionFormModalPropsPurgePerson
  | ModActionFormModalPropsPurgeCommunity
  | ModActionFormModalPropsRemove
  | ModActionFormModalPropsLock
) & {
  onCancel(): void;
  show: boolean;
  loading: boolean;
  children?: InfernoNode;
};

interface ModActionFormFormState {
  reason: string;
  daysUntilExpire?: number;
  shouldRemoveOrRestoreData?: boolean;
  shouldPermaBan?: boolean;
}

function handleReasonChange(
  i: ModActionFormModal,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ reason: event.target.value });
}

function handleExpiryChange(
  i: ModActionFormModal,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ daysUntilExpire: parseInt(event.target.value, 10) });
}

function handleToggleRemove(i: ModActionFormModal) {
  i.setState(prev => ({
    ...prev,
    shouldRemoveOrRestoreData: !prev.shouldRemoveOrRestoreData,
  }));
}

function handleTogglePermaBan(i: ModActionFormModal) {
  i.setState(prev => ({
    ...prev,
    shouldPermaBan: !prev.shouldPermaBan,
    daysUntilExpire: undefined,
  }));
}

function handleSubmit(
  i: ModActionFormModal,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (i.isBanModal) {
    i.props.onSubmit({
      reason: i.state.reason,
      daysUntilExpires: i.state.daysUntilExpire!,
      shouldRemoveOrRestoreData: i.state.shouldRemoveOrRestoreData!,
    } as BanUpdateForm & string); // Need to & string to handle type weirdness
  } else {
    i.props.onSubmit(i.state.reason as BanUpdateForm & string);
  }

  i.setState({
    reason: "",
  });
}

@modalMixin
export default class ModActionFormModal extends Component<
  ModActionFormModalProps,
  ModActionFormFormState
> {
  modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;
  state: ModActionFormFormState = {
    reason: "",
  };

  constructor(props: ModActionFormModalProps, context: any) {
    super(props, context);
    this.modalDivRef = createRef();
    this.reasonRef = createRef();

    if (this.isBanModal) {
      this.state.shouldRemoveOrRestoreData = false;
    }
  }

  render() {
    const {
      reason,
      daysUntilExpire,
      shouldRemoveOrRestoreData,
      shouldPermaBan,
    } = this.state;
    const reasonId = `mod-form-reason-${randomStr()}`;
    const expiresId = `mod-form-expires-${randomStr()}`;
    const { modActionType, onCancel, loading } = this.props;

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
                  onSubmit={event => handleSubmit(this, event)}
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
                        onInput={event => handleReasonChange(this, event)}
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
                          onInput={event => handleExpiryChange(this, event)}
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
                              checked={shouldRemoveOrRestoreData}
                              onChange={() => handleToggleRemove(this)}
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
                              onChange={() => handleTogglePermaBan(this)}
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
                className="btn btn-light border-light-subtle me-3"
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
            community: getApubName(
              this.props.community ?? {
                ap_id: "",
                name: "",
              },
            ),
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

      case "purge-community": {
        return I18NextService.i18n.t("purge_community_with_name", {
          community: getApubName(this.props.community),
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

      case "remove-community": {
        return I18NextService.i18n.t(
          this.props.isRemoved ? "restore_community" : "remove_community",
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
      case "lock-post": {
        return I18NextService.i18n.t(
          this.props.isLocked ? "unlock_post" : "lock_post",
        );
      }
      case "lock-comment": {
        return I18NextService.i18n.t(
          this.props.isLocked ? "unlock_comment" : "lock_comment",
        );
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
      case "purge-community":
      case "purge-person": {
        return I18NextService.i18n.t("purge");
      }

      case "remove-post":
      case "remove-community":
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
      case "lock-post": {
        return I18NextService.i18n.t(
          this.props.isLocked ? "unlock_post" : "lock_post",
        );
      }
      case "lock-comment": {
        return I18NextService.i18n.t(
          this.props.isLocked ? "unlock_comment" : "lock_comment",
        );
      }
    }
  }

  get loadingText() {
    let translation: NoOptionI18nKeys;

    switch (this.props.modActionType) {
      case "site-ban":
      case "community-ban": {
        return I18NextService.i18n.t(
          this.props.isBanned ? "unbanning" : "banning",
          {
            user: getApubName(this.props.creator),
          },
        );
      }

      case "purge-post":
      case "purge-comment":
      case "purge-community":
      case "purge-person": {
        translation = "purging";
        break;
      }

      case "remove-post":
      case "remove-community":
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

      case "lock-post":
      case "lock-comment": {
        translation = this.props.isLocked ? "unlocking" : "locking";
        break;
      }
    }

    return I18NextService.i18n.t(translation);
  }
}
