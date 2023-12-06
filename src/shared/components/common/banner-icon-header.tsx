import { Component } from "inferno";
import { PictrsImage } from "./pictrs-image";
import { MyUserInfo } from "lemmy-js-client";

interface BannerIconHeaderProps {
  banner?: string;
  icon?: string;
  myUserInfo?: MyUserInfo;
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
          {banner && (
            <PictrsImage
              src={banner}
              banner
              alt=""
              myUserInfo={this.props.myUserInfo}
            />
          )}
          {icon && (
            <PictrsImage
              src={icon}
              iconOverlay
              pushup={!!this.props.banner}
              alt=""
              myUserInfo={this.props.myUserInfo}
            />
          )}
        </div>
      )
    );
  }
}
