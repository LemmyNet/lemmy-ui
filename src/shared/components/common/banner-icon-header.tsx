import { Option } from "@sniptt/monads";
import { Component } from "inferno";
import { PictrsImage } from "./pictrs-image";

interface BannerIconHeaderProps {
  banner: Option<string>;
  icon: Option<string>;
}

export class BannerIconHeader extends Component<BannerIconHeaderProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="position-relative mb-2">
        {this.props.banner.match({
          some: banner => <PictrsImage src={banner} banner alt="" />,
          none: <></>,
        })}
        {this.props.icon.match({
          some: icon => (
            <PictrsImage
              src={icon}
              iconOverlay
              pushup={this.props.banner.isSome()}
              alt=""
            />
          ),
          none: <></>,
        })}
      </div>
    );
  }
}
