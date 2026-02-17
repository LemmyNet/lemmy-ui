import { capitalizeFirstLetter } from "@utils/helpers";
import classNames from "classnames";
import { Component, FormEvent, FormEventHandler } from "inferno";
import { EditSite, LocalSiteRateLimit } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import Tabs from "../common/tabs";

const rateLimitTypes = [
  "message",
  "post",
  "register",
  "image",
  "comment",
  "search",
  "import_user_settings",
] as const;

export type RateLimitType = (typeof rateLimitTypes)[number];

interface RateLimitsProps {
  handleRateLimit: FormEventHandler<HTMLInputElement>;
  handleRateLimitIntervalSeconds: FormEventHandler<HTMLInputElement>;
  rateLimitValue?: number;
  rateLimitIntervalSeconds?: number;
  className?: string;
}

interface RateLimitFormProps {
  rateLimits: LocalSiteRateLimit;
  loading: boolean;
  onSaveSite: (form: EditSite) => void;
}

interface RateLimitFormState {
  form: Partial<Omit<LocalSiteRateLimit, "updated_at" | "published_at">>;
}

function RateLimits({
  handleRateLimit,
  handleRateLimitIntervalSeconds: handleRateLimitIntervalSeconds,
  rateLimitIntervalSeconds: rateLimitIntervalSeconds,
  rateLimitValue: rateLimitMaxRequests,
  className,
}: RateLimitsProps) {
  return (
    <div role="tabpanel" className={classNames("mb-3 row", className)}>
      <div className="col-md-6">
        <label htmlFor="rate-limit">
          {I18NextService.i18n.t("rate_limit")}
        </label>
        <input
          type="number"
          id="rate-limit"
          className="form-control"
          min={0}
          value={rateLimitMaxRequests}
          onInput={handleRateLimit}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="rate-limit-per-second">
          {I18NextService.i18n.t("per_second")}
        </label>
        <input
          type="number"
          id="rate-limit-per-second"
          className="form-control"
          min={0}
          value={rateLimitIntervalSeconds}
          onInput={handleRateLimitIntervalSeconds}
        />
      </div>
    </div>
  );
}

function handleMaxRequestsChange(
  i: RateLimitsForm,
  rateLimitType: RateLimitType,
  event: FormEvent<HTMLInputElement>,
) {
  const limit: keyof RateLimitFormState["form"] = `${rateLimitType}_max_requests`;
  i.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      [limit]: Number(event.target.value),
    },
  }));
}

function handleIntervalSecondsChange(
  i: RateLimitsForm,
  rateLimitType: RateLimitType,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      [`${rateLimitType}_interval_seconds`]: Number(event.target.value),
    },
  }));
}

function submitRateLimitForm(
  i: RateLimitsForm,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  const form: EditSite = Object.entries(i.state.form).reduce(
    (acc, [key, val]) => {
      acc[`rate_limit_${key}`] = val;
      return acc;
    },
    {},
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
  render() {
    return (
      <form
        className="rate-limit-form"
        onSubmit={event => submitRateLimitForm(this, event)}
      >
        <h1 className="h4 mb-4">
          {I18NextService.i18n.t("rate_limit_header")}
        </h1>
        <div className="alert small alert-info" role="alert">
          <Icon icon="info" classes="icon-inline me-2" />
          {I18NextService.i18n.t("rate_limit_info")}
        </div>
        <Tabs
          tabs={rateLimitTypes.map(rateLimitType => ({
            key: rateLimitType,
            label: I18NextService.i18n.t(`rate_limit_${rateLimitType}`),
            getNode: isSelected => (
              <RateLimits
                className={classNames("tab-pane show", {
                  active: isSelected,
                })}
                handleRateLimit={event =>
                  handleMaxRequestsChange(this, rateLimitType, event)
                }
                handleRateLimitIntervalSeconds={event =>
                  handleIntervalSecondsChange(this, rateLimitType, event)
                }
                rateLimitValue={
                  this.state.form[`${rateLimitType}_max_requests`]
                }
                rateLimitIntervalSeconds={
                  this.state.form[`${rateLimitType}_interval_seconds`]
                }
              />
            ),
          }))}
        />
        <div className="col-12 mb-3">
          <button
            type="submit"
            className="btn btn-light border-light-subtle me-2"
            disabled={this.props.loading}
          >
            {this.props.loading ? (
              <Spinner />
            ) : (
              capitalizeFirstLetter(I18NextService.i18n.t("save"))
            )}
          </button>
        </div>
      </form>
    );
  }
}
