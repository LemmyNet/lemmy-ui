import { Component } from "@/inferno";
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
    const banner = this.props.banner;
    const icon = this.props.icon;
    return (
      (banner || icon) && (
        <div className="banner-icon-header position-relative mb-2">
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
      )
    );
  }
}
