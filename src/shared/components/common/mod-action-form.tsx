import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { Spinner } from "./icon";
import { randomStr } from "@utils/helpers";

interface ModActionFormProps {
  onSubmit: (reason: string) => void;
  buttonText: string;
}

interface ModActionFormFormState {
  loading: boolean;
  reason: string;
}

function handleReportReasonChange(i: ModerationActionForm, event: any) {
  i.setState({ reason: event.target.value });
}

function handleSubmit(i: ModerationActionForm, event: any) {
  event.preventDefault();
  i.setState({ loading: true });
  i.props.onSubmit(i.state.reason);

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
  }

  render() {
    const { loading, reason } = this.state;
    const id = `mod-form-${randomStr()}`;

    return (
      <form className="form-inline" onSubmit={linkEvent(this, handleSubmit)}>
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
          onInput={linkEvent(this, handleReportReasonChange)}
        />
        <button type="submit" className="btn btn-secondary">
          {loading ? <Spinner /> : this.props.buttonText}
        </button>
      </form>
    );
  }
}
