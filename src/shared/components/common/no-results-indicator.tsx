import { Component } from "inferno";
import { NoOptionI18nKeys } from "i18next";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface NoResultsIndicatorProps {
  icon: string;
  translationKey: NoOptionI18nKeys;
}

export class NoResultsIndicator extends Component<NoResultsIndicatorProps> {
  render() {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center p-5 my-4">
        <div className="rounded-circle bg-body-secondary p-3 mb-2 d-flex align-items-center justify-content-center">
          <Icon icon={this.props.icon} classes="icon-inline fs-3 text-muted" />
        </div>
        <div className="fw-medium text-body fs-5">
          {I18NextService.i18n.t(this.props.translationKey)}
        </div>
      </div>
    );
  }
}
