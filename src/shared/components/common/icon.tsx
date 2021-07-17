import { Component } from "inferno";

interface IconProps {
  icon: string;
  classes?: string;
}

export class Icon extends Component<IconProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <svg class={`icon ${this.props.classes}`}>
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
