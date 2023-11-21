import { Component, linkEvent } from "inferno";
import { Icon, Spinner } from "../icon";
import classNames from "classnames";
import { I18NextService } from "shared/services";

interface DeleteButtonProps {
  deleted: boolean;
  onClick: () => void;
}

interface DeleteButtonState {
  loading: boolean;
}

function handleClick(i: DeleteButton) {
  i.setState({ loading: true });
  i.props.onClick();
  i.setState({ loading: false });
}

export default class DeleteButton extends Component<DeleteButtonProps, any> {
  state: DeleteButtonState = {
    loading: false,
  };

  constructor(props: DeleteButtonProps, context: any) {
    super(props, context);
  }

  render() {
    const deleted = this.props.deleted;

    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, handleClick)}
      >
        {this.state.loading ? (
          <Spinner />
        ) : (
          <>
            <Icon
              icon="trash"
              classes={classNames("me-1", { "text-danger": deleted })}
              inline
            />
            {deleted
              ? I18NextService.i18n.t("restore")
              : I18NextService.i18n.t("delete")}
          </>
        )}
      </button>
    );
  }
}
