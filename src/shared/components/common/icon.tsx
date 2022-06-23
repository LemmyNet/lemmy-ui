import classNames from "classnames";
import { Component } from "inferno";
import { i18n } from "../../i18next";

interface IconProps {
  icon: string;
  classes?: string;
  inline?: boolean;
  small?: boolean;
}

export class Icon extends Component<IconProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <svg
        class={classNames("icon", this.props.classes, {
          "icon-inline": this.props.inline,
          small: this.props.small,
        })}
      >
        <use xlinkHref={`#icon-${this.props.icon}`}></use>
        <div class="sr-only">
          <title>{this.props.icon}</title>
        </div>
      </svg>
    );
  }
}

interface SpinnerProps {
  large?: boolean;
}

export class Spinner extends Component<SpinnerProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <Icon
        icon="spinner"
        classes={`spin ${this.props.large && "spinner-large"}`}
      />
    );
  }
}

export class PurgeWarning extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="mt-2 alert alert-danger" role="alert">
        <Icon icon="alert-triangle" classes="icon-inline mr-2" />
        {i18n.t("purge_warning")}
      </div>
    );
  }
}
