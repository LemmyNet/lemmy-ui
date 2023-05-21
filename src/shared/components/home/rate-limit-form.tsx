import { Component, FormEventHandler, linkEvent } from "inferno";
import { EditSite, LocalSiteRateLimit } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import { capitalizeFirstLetter, myAuth, wsClient } from "../../utils";
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
  rateLimitLabel: string;
  rateLimitValue?: number;
  rateLimitPerSecondValue?: number;
}

interface RateLimitFormProps {
  localSiteRateLimit: LocalSiteRateLimit;
  applicationQuestion?: string;
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
  loading: boolean;
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
  const auth = myAuth() ?? "TODO";
  const form: EditSite = Object.entries(i.state.form).reduce(
    (acc, [key, val]) => {
      acc[`rate_limit_${key}`] = val;
      return acc;
    },
    { auth, application_question: i.props.applicationQuestion }
  );

  i.setState({ loading: true });

  WebSocketService.Instance.send(wsClient.editSite(form));
}

export default class RateLimitsForm extends Component<
  RateLimitFormProps,
  RateLimitFormState
> {
  state: RateLimitFormState = {
    loading: false,
    form: {},
  };
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
      ...this.state,
      form: {
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
      },
    };
  }

  render() {
    return (
      <form onSubmit={linkEvent(this, submitRateLimitForm)}>
        <h5>Rate Limit Options</h5>
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
                rateLimitValue={this.state.form[rateLimitType]}
                rateLimitPerSecondValue={
                  this.state.form[`${rateLimitType}_per_second`]
                }
              />
            ),
          }))}
        />
        <div className="form-group row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-secondary mr-2"
              disabled={this.state.loading}
            >
              {this.state.loading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  componentDidUpdate({ localSiteRateLimit }: RateLimitFormProps) {
    if (
      this.state.loading &&
      Object.entries(localSiteRateLimit).some(
        ([key, val]) => this.state.form[key] !== val
      )
    ) {
      this.setState({ loading: false });
    }
  }
}
