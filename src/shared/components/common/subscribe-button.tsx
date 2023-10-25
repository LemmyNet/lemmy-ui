import { validInstanceTLD } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, MouseEventHandler, linkEvent } from "inferno";
import { CommunityView } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { VERSION } from "../../version";
import { Icon, Spinner } from "./icon";
import { toast } from "../../toast";

interface SubscribeButtonProps {
  communityView: CommunityView;
  onFollow: MouseEventHandler;
  onUnFollow: MouseEventHandler;
  loading?: boolean;
  isLink?: boolean;
}

export function SubscribeButton({
  communityView: {
    subscribed,
    community: { actor_id },
  },
  onFollow,
  onUnFollow,
  loading = false,
  isLink = false,
}: SubscribeButtonProps) {
  let i18key: NoOptionI18nKeys;

  switch (subscribed) {
    case "NotSubscribed": {
      i18key = "subscribe";

      break;
    }
    case "Subscribed": {
      i18key = "joined";

      break;
    }
    default: {
      i18key = "subscribe_pending";

      break;
    }
  }

  const buttonClass = classNames(
    "btn",
    isLink ? "btn-link d-inline-block" : "d-block mb-2 w-100",
  );

  if (!UserService.Instance.myUserInfo) {
    return (
      <>
        <button
          type="button"
          className={classNames(buttonClass, {
            "btn-secondary": !isLink,
          })}
          data-bs-toggle="modal"
          data-bs-target="#remoteFetchModal"
        >
          {I18NextService.i18n.t("subscribe")}
        </button>
        <RemoteFetchModal communityActorId={actor_id} />
      </>
    );
  }

  return (
    <button
      type="button"
      className={classNames(buttonClass, {
        [`btn-${subscribed === "Pending" ? "warning" : "secondary"}`]: !isLink,
      })}
      onClick={subscribed === "NotSubscribed" ? onFollow : onUnFollow}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {subscribed === "Subscribed" && (
            <Icon icon="check" classes="icon-inline me-1" />
          )}
          {I18NextService.i18n.t(i18key)}
        </>
      )}
    </button>
  );
}

interface RemoteFetchModalProps {
  communityActorId: string;
}

interface RemoteFetchModalState {
  instanceText: string;
}

function handleInput(i: RemoteFetchModal, event: any) {
  i.setState({ instanceText: event.target.value });
}

function focusInput() {
  document.getElementById("remoteFetchInstance")?.focus();
}

function submitRemoteFollow(
  { state: { instanceText }, props: { communityActorId } }: RemoteFetchModal,
  event: Event,
) {
  event.preventDefault();
  instanceText = instanceText.trim();

  if (!validInstanceTLD(instanceText)) {
    toast(
      I18NextService.i18n.t("remote_follow_invalid_instance", {
        instance: instanceText,
      }),
      "danger",
    );
    return;
  }

  const protocolRegex = /^https?:\/\//;
  if (instanceText.replace(protocolRegex, "") === window.location.host) {
    toast(I18NextService.i18n.t("remote_follow_local_instance"), "danger");
    return;
  }

  if (!protocolRegex.test(instanceText)) {
    instanceText = `http${VERSION !== "dev" ? "s" : ""}://${instanceText}`;
  }

  window.location.href = `${instanceText}/activitypub/externalInteraction?uri=${encodeURIComponent(
    communityActorId,
  )}`;
}

class RemoteFetchModal extends Component<
  RemoteFetchModalProps,
  RemoteFetchModalState
> {
  state: RemoteFetchModalState = {
    instanceText: "",
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    document
      .getElementById("remoteFetchModal")
      ?.addEventListener("shown.bs.modal", focusInput);
  }

  componentWillUnmount(): void {
    document
      .getElementById("remoteFetchModal")
      ?.removeEventListener("shown.bs.modal", focusInput);
  }

  render() {
    return (
      <div
        className="modal fade"
        id="remoteFetchModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#remoteFetchModalTitle"
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="remoteFetchModalTitle">
                {I18NextService.i18n.t("remote_follow_modal_title")}
              </h3>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </header>
            <form
              id="remote-fetch-form"
              className="modal-body d-flex flex-column justify-content-center"
              onSubmit={linkEvent(this, submitRemoteFollow)}
            >
              <label className="form-label" htmlFor="remoteFetchInstance">
                {I18NextService.i18n.t("remote_follow_prompt")}
              </label>
              <input
                type="text"
                id="remoteFetchInstance"
                className="form-control"
                name="instance"
                value={this.state.instanceText}
                onInput={linkEvent(this, handleInput)}
                required
                enterKeyHint="go"
                inputMode="url"
              />
            </form>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                data-bs-dismiss="modal"
              >
                {I18NextService.i18n.t("cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-success"
                form="remote-fetch-form"
              >
                {I18NextService.i18n.t("fetch_community")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }
}
