import { Component } from "inferno";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface EmptyStateProps {
  icon: string;
  translationKey: string;
}

export class EmptyState extends Component<EmptyStateProps> {
  render() {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center gap-3 py-5 my-5 text-center">
        <div className="rounded-circle bg-body-secondary p-4">
          <Icon icon={this.props.icon} classes="icon-inline fs-2 text-muted" />
        </div>
        <div className="text-muted fs-5">
          {I18NextService.i18n.t(this.props.translationKey)}
        </div>
      </div>
    );
  }
}
