import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { PurgeWarning, Spinner } from "./icon";
import { capitalizeFirstLetter, randomStr } from "@utils/helpers";

export interface BanUpdateForm {
  reason?: string;
  shouldRemove?: boolean;
  daysUntilExpires?: number;
}

interface ModActionFormPropsBan {
  modActionType: "ban";
  onSubmit: (form: BanUpdateForm) => void;
  creatorName: string;
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
  modActionType: "report" | "purge-post";
  onSubmit: (reason: string) => void;
}

type ModActionFormProps =
  | ModActionFormPropsBan
  | ModActionFormPropsRest
  | ModActionFormPropsPurgePerson
  | ModActionFormPropsRemove;

interface ModActionFormFormState {
  loading: boolean;
  reason: string;
  daysUntilExpire?: number;
  shouldRemoveData?: boolean;
}

function handleReasonChange(i: ModerationActionForm, event: any) {
  i.setState({ reason: event.target.value });
}

function handleExpiryChange(i: ModerationActionForm, event: any) {
  i.setState({ daysUntilExpire: parseInt(event.target.value, 10) });
}

function handleShouldRemoveChange(i: ModerationActionForm) {
  i.setState(prev => ({
    ...prev,
    shouldRemoveData: !prev.shouldRemoveData,
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
      this.state.daysUntilExpire = 1;
      this.state.shouldRemoveData = false;
    }
  }

  render() {
    const { loading, reason, daysUntilExpire, shouldRemoveData } = this.state;
    const id = `mod-form-${randomStr()}`;

    let buttonText: string;
    switch (this.props.modActionType) {
      case "ban": {
        buttonText = `${I18NextService.i18n.t("ban")} ${
          this.props.creatorName
        }`;
        break;
      }

      case "purge-post": {
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

    return (
      <form className="form-inline" onSubmit={linkEvent(this, handleSubmit)}>
        {this.props.modActionType.includes("purge") && <PurgeWarning />}
        <label className="visually-hidden" htmlFor={id}>
          {I18NextService.i18n.t("reason")}
        </label>
        <input
          type="text"
          id={id}
          className="form-control me-2"
          placeholder={I18NextService.i18n.t("reason")}
          required
          value={reason}
          onInput={linkEvent(this, handleReasonChange)}
        />
        {this.props.modActionType === "ban" && (
          <>
            <label className="col-form-label" htmlFor="mod-ban-expires">
              {I18NextService.i18n.t("expires")}
            </label>
            <input
              type="number"
              id="mod-ban-expires"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("number_of_days")}
              min={1}
              value={daysUntilExpire}
              onInput={linkEvent(this, handleExpiryChange)}
            />
            <div className="input-group mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="mod-ban-remove-data"
                  type="checkbox"
                  checked={shouldRemoveData}
                  onChange={linkEvent(this, handleShouldRemoveChange)}
                />
                <label
                  className="form-check-label"
                  htmlFor="mod-ban-remove-data"
                  title={I18NextService.i18n.t("remove_content_more")}
                >
                  {I18NextService.i18n.t("remove_content")}
                </label>
              </div>
            </div>
          </>
        )}
        <button type="submit" className="btn btn-secondary">
          {loading ? <Spinner /> : capitalizeFirstLetter(buttonText)}
        </button>
      </form>
    );
  }
}
