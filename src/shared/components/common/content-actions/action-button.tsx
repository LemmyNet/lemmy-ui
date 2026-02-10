import { Component } from "inferno";
import { Icon, Spinner } from "../icon";
import classNames from "classnames";
import { tippyMixin } from "../../mixins/tippy-mixin";

interface ActionButtonPropsBase {
  label: string;
  icon: string;
  iconClass?: string;
  inline?: boolean;
  inlineWithText?: boolean;
  noLoading?: boolean;
  disabled?: boolean;
}

interface ActionButtonPropsLoading extends ActionButtonPropsBase {
  onClick: () => void;
  noLoading?: false;
}

interface ActionButtonPropsNoLoading extends ActionButtonPropsBase {
  onClick: () => void;
  noLoading: true;
}

type ActionButtonProps = ActionButtonPropsLoading | ActionButtonPropsNoLoading;

interface ActionButtonState {
  loading: boolean;
}

function handleClick(i: ActionButton) {
  if (!i.props.noLoading) {
    i.setState({ loading: true });
  }
  i.props.onClick();
  i.setState({ loading: false });
}

@tippyMixin
export default class ActionButton extends Component<
  ActionButtonProps,
  ActionButtonState
> {
  state: ActionButtonState = {
    loading: false,
  };

  render() {
    const { label, icon, iconClass, inline, inlineWithText } = this.props;

    return (
      <button
        className={classNames(
          "btn btn-sm border-light-subtle",
          inline || inlineWithText
            ? "btn-animate text-body"
            : "d-flex align-items-center rounded-0 dropdown-item",
        )}
        onClick={() => handleClick(this)}
        aria-label={label}
        data-tippy-content={inline ? label : undefined}
        disabled={this.state.loading || this.props.disabled}
      >
        {this.state.loading ? (
          <Spinner />
        ) : (
          <Icon
            classes={classNames(iconClass, {
              "me-2": !(inline || inlineWithText),
            })}
            icon={icon}
            inline
          />
        )}
        {(!inline || inlineWithText) && label}
      </button>
    );
  }
}

ActionButton.defaultProps = {
  inline: false,
  noLoading: false,
};
