import { getQueryString, validInstanceTLD } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, MouseEventHandler, createRef, linkEvent } from "inferno";
import { CommunityFollowerState, DbUrl } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { VERSION } from "../../version";
import { Icon, Spinner } from "./icon";
import { toast } from "@utils/app";
import { modalMixin } from "../mixins/modal-mixin";

interface SubscribeButtonProps {
  followState: CommunityFollowerState | undefined;
  apId: DbUrl;
  onFollow: MouseEventHandler;
  onUnFollow: MouseEventHandler;
  loading?: boolean;
  isLink?: boolean;
  showRemoteFetch: boolean;
}

export function SubscribeButton({
  followState,
  apId,
  onFollow,
  onUnFollow,
  loading = false,
  isLink = false,
  showRemoteFetch,
}: SubscribeButtonProps) {
  const buttonClass = classNames("btn", {
    "btn-link p-0": isLink,
    [`btn-light border-light-subtle d-block mb-2 w-100 btn-${followState === "pending" ? "warning" : "secondary"}`]:
      !isLink,
  });

  if (showRemoteFetch) {
    return (
      <>
        <button
          type="button"
          className={buttonClass}
          data-bs-toggle="modal"
          data-bs-target="#remoteFetchModal"
        >
          {I18NextService.i18n.t("subscribe")}
        </button>
        <RemoteFetchModal apId={apId} />
      </>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={!followState ? onFollow : onUnFollow}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {followState === "accepted" && (
            <Icon icon="check" classes="icon-inline me-1" />
          )}
          {I18NextService.i18n.t(followStateKey(followState))}
        </>
      )}
    </button>
  );
}

function followStateKey(
  followState?: CommunityFollowerState,
): NoOptionI18nKeys {
  switch (followState) {
    case undefined: {
      return "subscribe";
    }
    case "accepted": {
      return "joined";
    }
    case "pending":
    case "approval_required":
    default: {
      return "subscribe_pending";
    }
  }
}

interface RemoteFetchModalProps {
  apId: string;
  show?: boolean;
}

interface RemoteFetchModalState {
  instanceText: string;
}

function handleInput(i: RemoteFetchModal, event: any) {
  i.setState({ instanceText: event.target.value });
}

function submitRemoteFollow(
  { state: { instanceText }, props: { apId } }: RemoteFetchModal,
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

  window.location.href = `${instanceText}/activitypub/externalInteraction${getQueryString(
    { uri: apId },
  )}`;
}

@modalMixin
class RemoteFetchModal extends Component<
  RemoteFetchModalProps,
  RemoteFetchModalState
> {
  state: RemoteFetchModalState = {
    instanceText: "",
  };

  modalDivRef = createRef<HTMLDivElement>();
  inputRef = createRef<HTMLInputElement>();

  constructor(props: any, context: any) {
    super(props, context);
  }

  handleShow() {
    this.inputRef.current?.focus();
  }

  render() {
    return (
      <div
        className="modal fade"
        id="remoteFetchModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#remoteFetchModalTitle"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
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
                ref={this.inputRef}
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
