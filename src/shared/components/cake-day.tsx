import { Component } from 'inferno';
import { i18n } from '../i18next';
import { Icon } from './icon';

interface CakeDayProps {
  creatorName: string;
}

export class CakeDay extends Component<CakeDayProps, any> {
  render() {
    return (
      <div
        className={`mx-2 d-inline-block unselectable pointer`}
        data-tippy-content={this.cakeDayTippy()}
      >
        <Icon icon="cake" classes="icon-inline" />
      </div>
    );
  }

  cakeDayTippy(): string {
    return i18n.t('cake_day_info', { creator_name: this.props.creatorName });
  }
}
