import { Component, linkEvent } from "inferno";
import { Icon, Spinner } from "../icon";
import classNames from "classnames";

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: string;
  iconClass?: string;
  inline?: boolean;
  noLoading?: boolean;
}

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

export default class ActionButton extends Component<
  ActionButtonProps,
  ActionButtonState
> {
  state: ActionButtonState = {
    loading: false,
  };

  constructor(props: ActionButtonProps, context: any) {
    super(props, context);
  }

  render() {
    const { label, icon, iconClass, inline } = this.props;

    return (
      <button
        className={classNames(
          "btn btn-link btn-sm",
          inline
            ? "btn-animate text-muted py-0"
            : "d-flex align-items-center rounded-0 dropdown-item",
        )}
        onClick={linkEvent(this, handleClick)}
        aria-label={label}
        data-tippy-content={inline ? label : undefined}
      >
        {this.state.loading ? (
          <Spinner />
        ) : (
          <Icon classes={classNames("me-1", iconClass)} icon={icon} inline />
        )}
        {!inline && label}
      </button>
    );
  }
}

ActionButton.defaultProps = {
  inline: false,
  noLoading: false,
};
