import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";
import { Spinner } from "./icon";

interface ReportFormProps {
  onSubmit: (reason: string) => void;
  id: string;
}

interface ReportFormState {
  loading: boolean;
  reason: string;
}

function handleReportReasonChange(i: ReportForm, event: any) {
  i.setState({ reason: event.target.value });
}

function handleReportSubmit(i: ReportForm, event: any) {
  event.preventDefault();
  i.setState({ loading: true });
  i.props.onSubmit(i.state.reason);

  i.setState({
    loading: false,
    reason: "",
  });
}

export default class ReportForm extends Component<
  ReportFormProps,
  ReportFormState
> {
  state: ReportFormState = {
    loading: false,
    reason: "",
  };
  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { id } = this.props;
    const { loading, reason } = this.state;

    return (
      <form
        className="form-inline"
        onSubmit={linkEvent(this, handleReportSubmit)}
      >
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
          {loading ? <Spinner /> : I18NextService.i18n.t("create_report")}
        </button>
      </form>
    );
  }
}
