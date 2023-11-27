import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { PurgeWarning, Spinner } from "./icon";
import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import classNames from "classnames";

export interface BanUpdateForm {
  reason?: string;
  shouldRemove?: boolean;
  daysUntilExpires?: number;
}

interface ModActionFormPropsBan {
  modActionType: "ban";
  onSubmit: (form: BanUpdateForm) => void;
  creatorName: string;
  isBanned: boolean;
}

interface ModActionFormPropsPurgePerson {
  modActionType: "purge-person";
  onSubmit: (reason: string) => void;
  creatorName: string;
}

interface ModActionFormPropsRemove {
  modActionType: "remove";
  onSubmit: (reason: string) => void;
  isRemoved: boolean;
}

interface ModActionFormPropsRest {
  modActionType: "report" | "purge-post" | "purge-comment";
  onSubmit: (reason: string) => void;
}

type ModActionFormProps = (
  | ModActionFormPropsBan
  | ModActionFormPropsRest
  | ModActionFormPropsPurgePerson
  | ModActionFormPropsRemove
) & { onCancel: () => void };

interface ModActionFormFormState {
  loading: boolean;
  reason: string;
  daysUntilExpire?: number;
  shouldRemoveData?: boolean;
  shouldPermaBan?: boolean;
}

function handleReasonChange(i: ModerationActionForm, event: any) {
  i.setState({ reason: event.target.value });
}

function handleExpiryChange(i: ModerationActionForm, event: any) {
  i.setState({ daysUntilExpire: parseInt(event.target.value, 10) });
}

function handleToggleRemove(i: ModerationActionForm) {
  i.setState(prev => ({
    ...prev,
    shouldRemoveData: !prev.shouldRemoveData,
  }));
}

function handleTogglePermaBan(i: ModerationActionForm) {
  i.setState(prev => ({
    ...prev,
    shouldPermaBan: !prev.shouldPermaBan,
    daysUntilExpire: undefined,
  }));
}

function handleSubmit(i: ModerationActionForm, event: any) {
  event.preventDefault();
  i.setState({ loading: true });

  if (i.props.modActionType === "ban") {
    i.props.onSubmit({
      reason: i.state.reason,
      daysUntilExpires: i.state.daysUntilExpire!,
      shouldRemove: i.state.shouldRemoveData!,
    });
  } else {
    i.props.onSubmit(i.state.reason);
  }

  i.setState({
    loading: false,
    reason: "",
  });
}

export default class ModerationActionForm extends Component<
  ModActionFormProps,
  ModActionFormFormState
> {
  state: ModActionFormFormState = {
    loading: false,
    reason: "",
  };

  constructor(props: ModActionFormProps, context: any) {
    super(props, context);

    if (this.props.modActionType === "ban") {
      this.state.shouldRemoveData = false;
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

    let buttonText: string;
    switch (modActionType) {
      case "ban": {
        buttonText = `${I18NextService.i18n.t(
          this.props.isBanned ? "unban" : "ban",
        )} ${this.props.creatorName}`;
        break;
      }

      case "purge-post":
      case "purge-comment": {
        buttonText = I18NextService.i18n.t("purge");
        break;
      }

      case "purge-person": {
        buttonText = `${I18NextService.i18n.t("purge")} ${
          this.props.creatorName
        }`;
        break;
      }

      case "remove": {
        buttonText = I18NextService.i18n.t(
          this.props.isRemoved ? "restore" : "remove",
        );
        break;
      }

      case "report": {
        buttonText = I18NextService.i18n.t("create_report");
        break;
      }
    }

    const isBanned = modActionType === "ban" && this.props.isBanned;

    const showExpiresField = !(isBanned || shouldPermaBan);

    return (
      <form onSubmit={linkEvent(this, handleSubmit)} className="p-3">
        <div className="row mb-3">
          <div
            className={classNames("col-12", {
              "col-lg-6 col-xl-7": showExpiresField,
            })}
          >
            {this.props.modActionType.includes("purge") && <PurgeWarning />}
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
          {modActionType === "ban" && showExpiresField && (
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
          <div
            className="order-1 order-lg-0 my-2 col-12 col-lg-6 col-xxl-5 d-flex justify-content-start align-items-end"
            style={{
              "white-space": "nowrap",
            }}
          >
            <button type="submit" className="btn btn-secondary me-3">
              {loading ? <Spinner /> : capitalizeFirstLetter(buttonText)}
            </button>
            <button type="button" className="btn btn-light" onClick={onCancel}>
              {I18NextService.i18n.t("cancel")}
            </button>
          </div>
          {modActionType === "ban" && !isBanned && (
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
    );
  }
}
