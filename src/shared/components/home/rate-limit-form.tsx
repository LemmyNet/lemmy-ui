import { Component, FormEventHandler, linkEvent } from "inferno";
import { LocalSiteRateLimit } from "lemmy-js-client";
import { i18n } from "../../i18next";
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
  rateLimitLabel: string;
  rateLimitValue?: number;
  rateLimitPerSecondValue?: number;
}

interface RateLimitFormProps {
  localSiteRateLimit: LocalSiteRateLimit;
}

interface RateLimitFormState {
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
}

function RateLimits({
  handleRateLimit,
  handleRateLimitPerSecond,
  rateLimitLabel,
  rateLimitPerSecondValue,
  rateLimitValue,
}: RateLimitsProps) {
  return (
    <div className="form-group row">
      <label className="col-12 col-form-label" htmlFor="rate-limit">
        {rateLimitLabel}
      </label>
      <input
        type="number"
        id="rate-limit"
        className="form-control col-12"
        min={0}
        value={rateLimitValue}
        onInput={handleRateLimit}
      />
      <label className="col-12 col-form-label" htmlFor="rate-limit-per-second">
        {i18n.t("per_second")}
      </label>
      <input
        type="number"
        id="rate-limit-per-second"
        className="form-control col-12"
        min={0}
        value={rateLimitPerSecondValue}
        onInput={handleRateLimitPerSecond}
      />
    </div>
  );
}

function handleRateLimitChange(
  { rateLimitType, ctx }: { rateLimitType: string; ctx: RateLimitsForm },
  event: any
) {
  ctx.setState({
    [rateLimitType]: Number(event.target.value),
  });
}

function handlePerSecondChange(
  { rateLimitType, ctx }: { rateLimitType: string; ctx: RateLimitsForm },
  event: any
) {
  ctx.setState({
    [`${rateLimitType}_per_second`]: Number(event.target.value),
  });
}

export default class RateLimitsForm extends Component<
  RateLimitFormProps,
  RateLimitFormState
> {
  state: RateLimitFormState = {};
  constructor(props: RateLimitFormProps, context) {
    super(props, context);

    const {
      comment,
      comment_per_second,
      image,
      image_per_second,
      message,
      message_per_second,
      post,
      post_per_second,
      register,
      register_per_second,
      search,
      search_per_second,
    } = props.localSiteRateLimit;

    this.state = {
      comment,
      comment_per_second,
      image,
      image_per_second,
      message,
      message_per_second,
      post,
      post_per_second,
      register,
      register_per_second,
      search,
      search_per_second,
    };
  }

  render() {
    return (
      <Tabs
        tabs={rateLimitTypes.map(rateLimitType => ({
          key: rateLimitType,
          label: rateLimitType,
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
              rateLimitLabel={i18n.t(`rate_limit_${rateLimitType}`)}
              rateLimitValue={this.state[rateLimitType]}
              rateLimitPerSecondValue={
                this.state[`${rateLimitType}_per_second`]
              }
            />
          ),
        }))}
      />
    );
  }
}
