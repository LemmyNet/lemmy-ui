import { Component } from "inferno";
import { I18NextService } from "shared/services";
import { Icon, Spinner } from "../icon";

interface BlockButtonProps {
  onClick: () => void;
}

interface BlockButtonState {
  loading: boolean;
}

export default class BlockButton extends Component<
  BlockButtonProps,
  BlockButtonState
> {
  state: BlockButtonState = {
    loading: false,
  };

  constructor(props: BlockButtonProps, context: any) {
    super(props, context);
  }

  render() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={this.props.onClick}
        aria-label={I18NextService.i18n.t("block_user")}
      >
        {this.state.loading ? (
          <Spinner />
        ) : (
          <Icon classes="me-1" icon="slash" inline />
        )}
        {I18NextService.i18n.t("block_user")}
      </button>
    );
  }
}
