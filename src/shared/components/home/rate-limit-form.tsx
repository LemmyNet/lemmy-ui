import { Component, FormEventHandler, linkEvent } from "inferno";
import { EditSite, LocalSiteRateLimit } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, myAuthRequired } from "../../utils";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";

const rateLimitTypes = [
  "message",
  "post",
  "image",
  "comment",
  "search",
  "register",
] as const;

interface RateLimitsProps {
  handleRateLimit: FormEventHandler<HTMLInputElement>;
  handleRateLimitPerSecond: FormEventHandler<HTMLInputElement>;
  rateLimitValue?: number;
  rateLimitPerSecondValue?: number;
}

interface RateLimitFormProps {
  rateLimits: LocalSiteRateLimit;
  onSaveSite(form: EditSite): void;
  loading: boolean;
}

interface RateLimitFormState {
  form: {
    message?: number;
    message_per_second?: number;
    post?: number;
    post_per_second?: number;
    comment?: number;
    comment_per_second?: number;
    image?: number;
    image_per_second?: number;
    search?: number;
    search_per_second?: number;
    register?: number;
    register_per_second?: number;
  };
}

function RateLimits({
  handleRateLimit,
  handleRateLimitPerSecond,
  rateLimitPerSecondValue,
  rateLimitValue,
}: RateLimitsProps) {
  return (
    <div className="mb-3 row">
      <div className="col-md-6">
        <label htmlFor="rate-limit">{i18n.t("rate_limit")}</label>
        <input
          type="number"
          id="rate-limit"
          className="form-control"
          min={0}
          value={rateLimitValue}
          onInput={handleRateLimit}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="rate-limit-per-second">{i18n.t("per_second")}</label>
        <input
          type="number"
          id="rate-limit-per-second"
          className="form-control"
          min={0}
          value={rateLimitPerSecondValue}
          onInput={handleRateLimitPerSecond}
        />
      </div>
    </div>
  );
}

function handleRateLimitChange(
  { rateLimitType, ctx }: { rateLimitType: string; ctx: RateLimitsForm },
  event: any
) {
  ctx.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      [rateLimitType]: Number(event.target.value),
    },
  }));
}

function handlePerSecondChange(
  { rateLimitType, ctx }: { rateLimitType: string; ctx: RateLimitsForm },
  event: any
) {
  ctx.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      [`${rateLimitType}_per_second`]: Number(event.target.value),
    },
  }));
}

function submitRateLimitForm(i: RateLimitsForm, event: any) {
  event.preventDefault();
  const auth = myAuthRequired();
  const form: EditSite = Object.entries(i.state.form).reduce(
    (acc, [key, val]) => {
      acc[`rate_limit_${key}`] = val;
      return acc;
    },
    {
      auth,
    }
  );

  i.props.onSaveSite(form);
}

export default class RateLimitsForm extends Component<
  RateLimitFormProps,
  RateLimitFormState
> {
  state: RateLimitFormState = {
    form: this.props.rateLimits,
  };
  constructor(props: RateLimitFormProps, context: any) {
    super(props, context);
  }

  render() {
    return (
      <form onSubmit={linkEvent(this, submitRateLimitForm)}>
        <h5>{i18n.t("rate_limit_header")}</h5>
        <Tabs
          tabs={rateLimitTypes.map(rateLimitType => ({
            key: rateLimitType,
            label: i18n.t(`rate_limit_${rateLimitType}`),
            getNode: () => (
              <RateLimits
                handleRateLimit={linkEvent(
                  { rateLimitType, ctx: this },
                  handleRateLimitChange
                )}
                handleRateLimitPerSecond={linkEvent(
                  { rateLimitType, ctx: this },
                  handlePerSecondChange
                )}
                rateLimitValue={this.state.form[rateLimitType]}
                rateLimitPerSecondValue={
                  this.state.form[`${rateLimitType}_per_second`]
                }
              />
            ),
          }))}
        />
        <div className="col-12 mb-3">
          <button
            type="submit"
            className="btn btn-secondary me-2"
            disabled={this.props.loading}
          >
            {this.props.loading ? (
              <Spinner />
            ) : (
              capitalizeFirstLetter(i18n.t("save"))
            )}
          </button>
        </div>
      </form>
    );
  }
}
