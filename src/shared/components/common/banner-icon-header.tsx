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
    let banner = this.props.banner;
    let icon = this.props.icon;
    return (
      <div className="position-relative mb-2">
        {banner && <PictrsImage src={banner} banner alt="" />}
        {icon && (
          <PictrsImage
            src={icon}
            iconOverlay
            pushup={!!this.props.banner}
            alt=""
          />
        )}
      </div>
    );
  }
}
