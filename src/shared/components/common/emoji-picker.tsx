import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { EmojiMart } from "./emoji-mart";
import { Icon } from "./icon";

interface EmojiPickerProps {
  onEmojiClick?(val: any): any;
  disabled?: boolean;
}

interface EmojiPickerState {
  showPicker: boolean;
}

function closeEmojiMartOnEsc(i, event): void {
  event.key === "Escape" && i.setState({ showPicker: false });
}

export class EmojiPicker extends Component<EmojiPickerProps, EmojiPickerState> {
  private emptyState: EmojiPickerState = {
    showPicker: false,
  };

  state: EmojiPickerState;
  constructor(props: EmojiPickerProps, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handleEmojiClick = this.handleEmojiClick.bind(this);
  }

  render() {
    return (
      <span className="emoji-picker">
        <button
          className="btn btn-sm text-muted"
          data-tippy-content={I18NextService.i18n.t("emoji")}
          aria-label={I18NextService.i18n.t("emoji")}
          disabled={this.props.disabled}
          onClick={linkEvent(this, this.togglePicker)}
        >
          <Icon icon="smile" classes="icon-inline" />
        </button>

        {this.state.showPicker && (
          <>
            <div className="position-relative" role="dialog">
              <div className="emoji-picker-container">
                <EmojiMart
                  onEmojiClick={this.handleEmojiClick}
                  pickerOptions={{}}
                ></EmojiMart>
              </div>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
              <div
                onClick={linkEvent(this, this.togglePicker)}
                className="click-away-container"
              />
            </div>
          </>
        )}
      </span>
    );
  }

  componentWillUnmount() {
    document.removeEventListener("keyup", e => closeEmojiMartOnEsc(this, e));
  }

  togglePicker(i: EmojiPicker, e: any) {
    e.preventDefault();
    i.setState({ showPicker: !i.state.showPicker });

    i.state.showPicker
      ? document.addEventListener("keyup", e => closeEmojiMartOnEsc(i, e))
      : document.removeEventListener("keyup", e => closeEmojiMartOnEsc(i, e));
  }

  handleEmojiClick(e: any) {
    this.props.onEmojiClick?.(e);
  }
}
