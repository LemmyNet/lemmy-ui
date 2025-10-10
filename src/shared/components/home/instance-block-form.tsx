import { Component, linkEvent } from "inferno";
import { AdminBlockInstanceParams } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { randomStr, validInstanceTLD } from "@utils/helpers";
import { Prompt } from "inferno-router";
import { futureDaysToUnixTime } from "@utils/date";

type BlockForm = {
  instance?: string;
  reason?: string;
  daysUntilExpire?: number;
};

interface Props {
  onCreate(form: AdminBlockInstanceParams): void;
}

interface State {
  form: BlockForm;
  bypassNavWarning: boolean;
}

export class InstanceBlockForm extends Component<Props, State> {
  state: State = {
    form: {},
    bypassNavWarning: true,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const form = this.state.form;
    const id = randomStr();

    return (
      <div className="instance-block-form">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={this.formValid() && !this.state.bypassNavWarning}
        />
        <form className="row row-cols-md-auto g-3 mb-3 align-items-center">
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`domain-${id}`}>
              {I18NextService.i18n.t("domain")}
            </label>
            <input
              id={`domain-${id}`}
              type="text"
              placeholder="instance.tld"
              className="form-control"
              value={form.instance}
              onInput={linkEvent(this, this.handleDomainTextChange)}
            />
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`reason-${id}`}>
              {I18NextService.i18n.t("reason")}
            </label>{" "}
            <input
              id={`reason-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("reason")}
              className="form-control"
              value={form.reason}
              onInput={linkEvent(this, this.handleReasonChange)}
            />
          </div>
          <div className="col-12">
            <label
              className="visually-hidden"
              htmlFor={`days-until-expiration-${id}`}
            >
              {I18NextService.i18n.t("days_until_expiration")}
            </label>
            <input
              type="number"
              id={`days-until-expiration-${id}`}
              className="form-control my-2 my-lg-0"
              placeholder={I18NextService.i18n.t("days_until_expiration")}
              min={1}
              value={form.daysUntilExpire}
              onInput={linkEvent(this, this.handleExpiryChange)}
              required
            />
          </div>
          <div className="col-12">
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={!this.formValid()}
              onClick={linkEvent(this, this.handleSubmit)}
            >
              {I18NextService.i18n.t("create")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  formValid(): boolean {
    const form = this.state.form;
    return !!(
      form.instance &&
      validInstanceTLD(form.instance ?? "") &&
      form.reason
    );
  }

  handleDomainTextChange(i: InstanceBlockForm, event: any) {
    i.setState({
      form: { ...i.state.form, instance: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleReasonChange(i: InstanceBlockForm, event: any) {
    i.setState({
      form: { ...i.state.form, reason: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleExpiryChange(i: InstanceBlockForm, event: any) {
    i.setState({
      form: {
        ...i.state.form,
        daysUntilExpire: parseInt(event.target.value, 10),
      },
      bypassNavWarning: false,
    });
  }

  handleSubmit(i: InstanceBlockForm, event: any) {
    event.preventDefault();

    const form = i.state.form;

    if (form.instance && validInstanceTLD(form.instance ?? "") && form.reason) {
      i.props.onCreate({
        instance: form.instance,
        block: true,
        reason: form.reason,
        expires_at: futureDaysToUnixTime(form.daysUntilExpire),
      });
    }
  }
}
