import { Component } from "inferno";
import { PictrsImage } from "./pictrs-image";

interface BannerIconHeaderProps {
  banner?: string;
  icon?: string;
}

export class BannerIconHeader extends Component<BannerIconHeaderProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="position-relative mb-2">
        {this.props.banner && <PictrsImage src={this.props.banner} alt="" />}
        {this.props.icon && (
          <PictrsImage
            src={this.props.icon}
            iconOverlay
            pushup={!!this.props.banner}
            alt=""
          />
        )}
      </div>
    );
  }
}
