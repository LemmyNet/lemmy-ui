import { Component } from "inferno";
import { I18NextService } from "../../services";
import { EmojiMart } from "./emoji-mart";
import { Icon } from "./icon";
import { tippyMixin } from "../mixins/tippy-mixin";

interface EmojiPickerProps {
  onEmojiClick?(val: any): any;
  disabled?: boolean;
}

interface EmojiPickerState {
  showPicker: boolean;
}

function closeEmojiMartOnEsc(i: EmojiPicker, event: KeyboardEvent) {
  if (event.key === "Escape") {
    i.setState({ showPicker: false });
  }
}

@tippyMixin
export class EmojiPicker extends Component<EmojiPickerProps, EmojiPickerState> {
  private emptyState: EmojiPickerState = {
    showPicker: false,
  };

  state: EmojiPickerState;
  constructor(props: EmojiPickerProps, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  render() {
    return (
      <span className="emoji-picker">
        <button
          className="btn btn-sm btn-link rounded-0 text-muted"
          data-tippy-content={I18NextService.i18n.t("emoji")}
          aria-label={I18NextService.i18n.t("emoji")}
          disabled={this.props.disabled}
          onClick={e => this.togglePicker(this, e)}
        >
          <Icon icon="smile" classes="icon-inline" />
        </button>

        {this.state.showPicker && (
          <>
            <div className="position-relative" role="dialog">
              <div className="emoji-picker-container">
                <EmojiMart
                  onEmojiClick={val => handleEmojiClick(this, val)}
                  pickerOptions={{}}
                ></EmojiMart>
              </div>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
              <div
                onClick={e => this.togglePicker(this, e)}
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

    if (i.state.showPicker) {
      document.addEventListener("keyup", e => closeEmojiMartOnEsc(i, e));
    } else {
      document.removeEventListener("keyup", e => closeEmojiMartOnEsc(i, e));
    }
  }
}

function handleEmojiClick(i: EmojiPicker, e: any) {
  i.props.onEmojiClick?.(e);
  i.setState({ showPicker: false });
}
