import { validInstanceTLD } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, MouseEventHandler, linkEvent } from "inferno";
import { CommunityView } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { VERSION } from "../../version";
import { Icon, Spinner } from "./icon";

interface SubscribeButtonProps {
  communityView: CommunityView;
  onFollow: MouseEventHandler;
  onUnFollow: MouseEventHandler;
  loading: boolean;
}

export function SubscribeButton({
  communityView: {
    subscribed,
    community: { actor_id },
  },
  onFollow,
  onUnFollow,
  loading,
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

  const buttonClass = "btn d-block mb-2 w-100";

  if (!UserService.Instance.myUserInfo) {
    return (
      <>
        <button
          type="button"
          className={classNames(buttonClass, "btn-secondary")}
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
      className={classNames(
        buttonClass,
        `btn-${subscribed === "Pending" ? "warning" : "secondary"}`
      )}
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
  event: Event
) {
  event.preventDefault();

  if (!validInstanceTLD(instanceText)) {
    // TODO: Figure out appropriate way of handling invalid domainss
    console.log("I should do something about this.");
  }

  if (!/^https?:\/\//.test(instanceText)) {
    instanceText = `http${VERSION !== "dev" ? "s" : ""}://${instanceText}`;
  }

  window.location.href = `${instanceText}/activitypub/externalInteraction?uri=${encodeURIComponent(
    communityActorId
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
                Subscribe from Remote Instance
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
                Enter the instance you would like to follow this community from:
              </label>
              <input
                type="text"
                id="remoteFetchInstance"
                className="form-control"
                name="instance"
                value={this.state.instanceText}
                onInput={linkEvent(this, handleInput)}
                required
              />
            </form>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                form="remote-fetch-form"
              >
                Save changes
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }
}
