import { getStaticDir } from "@utils/env";
import classNames from "classnames";
import { Component } from "@/inferno";
import { I18NextService } from "../../services";

interface IconProps {
  icon: string;
  classes?: string;
  inline?: boolean;
  small?: boolean;
}

export class Icon extends Component<IconProps> {
  render() {
    return (
      <svg
        className={classNames("icon", this.props.classes, {
          "icon-inline": this.props.inline,
          small: this.props.small,
        })}
      >
        <use
          xlinkHref={`${getStaticDir()}/assets/symbols.svg#icon-${
            this.props.icon
          }`}
        ></use>
        {/* TODO <div className="visually-hidden">
          <title>{this.props.icon}</title>
        </div>*/}
      </svg>
    );
  }
}

interface SpinnerProps {
  large?: boolean;
  className?: string;
}

export class Spinner extends Component<SpinnerProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <Icon
        icon="spinner"
        classes={classNames("spin", this.props.className, {
          "spinner-large": this.props.large,
        })}
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
      <div className="purge-warning mt-2 alert alert-danger" role="alert">
        <Icon icon="alert-triangle" classes="icon-inline me-2" />
        {I18NextService.i18n.t("purge_warning")}
      </div>
    );
  }
}
