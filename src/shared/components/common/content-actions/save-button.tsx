import { Component, linkEvent } from "inferno";
import { I18NextService } from "shared/services";
import { Icon, Spinner } from "../icon";
import classNames from "classnames";

interface SaveButtonProps {
  saved: boolean;
  onSave: (saved: boolean) => void;
}

interface SaveButtonState {
  isLoading: boolean;
}

function handleSave(i: SaveButton) {
  i.props.onSave(!i.props.saved);
}

export default class SaveButton extends Component<
  SaveButtonProps,
  SaveButtonState
> {
  state: SaveButtonState = {
    isLoading: false,
  };

  constructor(props: SaveButtonProps, context: any) {
    super(props, context);
  }

  render() {
    const saved = this.props.saved;
    const label = saved
      ? I18NextService.i18n.t("unsave")
      : I18NextService.i18n.t("save");
    return (
      <button
        className="btn btn-sm btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, handleSave)}
        data-tippy-content={label}
        aria-label={label}
      >
        {this.state.isLoading ? (
          <Spinner />
        ) : (
          <Icon
            icon="star"
            classes={classNames({ "text-warning": saved })}
            inline
          />
        )}
      </button>
    );
  }
}
