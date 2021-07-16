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

export class Spinner extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return <Icon icon="spinner" classes="icon-spinner spin" />;
  }
}
