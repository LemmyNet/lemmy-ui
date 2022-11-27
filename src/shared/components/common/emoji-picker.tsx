import { Component, linkEvent } from "inferno";
import { i18n } from "../../i18next";
import { EmojiMart } from "./emoji-mart";
import { Icon } from "./icon";

interface EmojiPickerProps {
    onEmojiClick?(val: any): any;
}

interface EmojiPickerState {
    showPicker: boolean,
}

export class EmojiPicker extends Component<
    EmojiPickerProps,
    EmojiPickerState
> {
    private emptyState: EmojiPickerState = {
        showPicker: false,
    };
    state: EmojiPickerState;
    constructor(props: any, context: any) {
        super(props, context);
        this.state = this.emptyState;
        this.handleEmojiClick = this.handleEmojiClick.bind(this);
    }
    render() {
        return (
            <span>
                <button
                    className="btn btn-sm text-muted"
                    data-tippy-content={i18n.t("emoji")}
                    aria-label={i18n.t("emoji")}
                    onClick={linkEvent(this,this.togglePicker)}
                >
                    <Icon icon="smile" classes="icon-inline" />
                </button>

                {this.state.showPicker && (
                    <>
                        <div className="emoji-picker-container">
                            <EmojiMart onEmojiClick={this.handleEmojiClick} pickerOptions={({})}></EmojiMart>
                        </div>
                        <div
                            onClick={linkEvent(this,this.togglePicker)}
                            className="click-away-container"
                        />
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