import { Component } from "inferno";
import { PictrsImage } from "./pictrs-image";

interface BannerIconHeaderProps {
  banner?: string;
  icon?: string;
}

export class BannerIconHeader extends Component<
  BannerIconHeaderProps,
  unknown
> {
  render() {
    const banner = this.props.banner;
    const icon = this.props.icon;
    const iconType = banner ? "icon_and_banner" : "icon_without_banner";
    return (
      (banner || icon) && (
        <div className="banner-icon-header position-relative mb-2">
          {banner && <PictrsImage src={banner} type="banner" viewer />}
          {icon && <PictrsImage src={icon} type={iconType} viewer />}
        </div>
      )
    );
  }
}
