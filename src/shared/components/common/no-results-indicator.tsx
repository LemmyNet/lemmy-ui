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
      <div className="d-flex flex-column fl-1 align-items-center justify-content-center gap-2 text-center">
        <Icon icon={this.props.icon} classes="fs-1 text-muted" />
        <div className="fw-medium text-body fs-5">
          {I18NextService.i18n.t(this.props.translationKey)}
        </div>
      </div>
    );
  }
}
