import { Component } from "inferno";
import { PictrsImage } from "./pictrs-image";

interface BannerIconHeaderProps {
  banner?: string;
  icon?: string;
}

export class BannerIconHeader extends Component<BannerIconHeaderProps, any> {
  render() {
    const banner = this.props.banner;
    const icon = this.props.icon;
    return (
      (banner || icon) && (
        <div className="banner-icon-header position-relative mb-2">
          {banner && <PictrsImage src={banner} type="banner" viewer />}
          {icon && <PictrsImage src={icon} type="icon_under_banner" viewer />}
        </div>
      )
    );
  }
}
