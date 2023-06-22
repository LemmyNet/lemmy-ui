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
            <div className="position-relative">
              <div className="emoji-picker-container position-absolute w-100">
                <EmojiMart
                  onEmojiClick={this.handleEmojiClick}
                  pickerOptions={{}}
                ></EmojiMart>
              </div>
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

  togglePicker(i: EmojiPicker, e: any) {
    e.preventDefault();
    i.setState({ showPicker: !i.state.showPicker });
  }

  handleEmojiClick(e: any) {
    this.props.onEmojiClick?.(e);
  }
}
