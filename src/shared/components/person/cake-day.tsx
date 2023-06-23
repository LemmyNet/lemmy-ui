import { Component } from "inferno";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";

interface CakeDayProps {
  creatorName: string;
}

export class CakeDay extends Component<CakeDayProps, any> {
  render() {
    return (
      <div
        className={`cake-day mx-2 d-inline-block unselectable pointer`}
        data-tippy-content={this.cakeDayTippy()}
      >
        <Icon icon="cake" classes="icon-inline" />
      </div>
    );
  }

  cakeDayTippy(): string {
    return I18NextService.i18n.t("cake_day_info", {
      creator_name: this.props.creatorName,
    });
  }
}
