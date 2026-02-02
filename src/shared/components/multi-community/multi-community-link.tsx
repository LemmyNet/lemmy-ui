import { hostname } from "@utils/helpers";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { MultiCommunity, MyUserInfo } from "lemmy-js-client";
import { relTags } from "@utils/config";
import classNames from "classnames";
import { I18NextService } from "@services/I18NextService";

interface Props {
  multiCommunity: MultiCommunity;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

export class MultiCommunityLink extends Component<Props, any> {
  render() {
    const { multiCommunity, useApubName } = this.props;

    const title = useApubName
      ? multiCommunity.name
      : (multiCommunity.title ?? multiCommunity.name);

    const { link, serverStr } = multiCommunityLink(
      multiCommunity,
      this.props.realLink,
    );

    const classes = `community-link ${this.props.muted ? "text-muted" : ""}`;

    return !this.props.realLink ? (
      <Link title={title} className={classes} to={link}>
        {this.name(title, serverStr)}
      </Link>
    ) : (
      <a title={title} className={classes} href={link} rel={relTags}>
        {this.name(title, serverStr)}
      </a>
    );
  }

  name(title: string, serverStr?: string) {
    return (
      <span className="overflow-wrap-anywhere">
        {title}
        {serverStr && <small className="text-muted">{serverStr}</small>}
      </span>
    );
  }
}

export type MultiCommunityLinkAndServerStr = {
  link: string;
  serverStr?: string;
};

export function multiCommunityLink(
  multiCommunity: MultiCommunity,
  realLink: boolean = false,
): MultiCommunityLinkAndServerStr {
  const local = multiCommunity.local === null ? true : multiCommunity.local;

  if (local) {
    return { link: `/m/${multiCommunity.name}` };
  } else {
    const serverStr = `@${hostname(multiCommunity.ap_id)}`;
    const link = realLink
      ? multiCommunity.ap_id
      : `/c/${multiCommunity.name}${serverStr}`;

    return { link, serverStr };
  }
}

type MultiCommunitySettingLinkProps = {
  multi: MultiCommunity;
};
export function MultiCommunitySettingsLink({
  multi,
}: MultiCommunitySettingLinkProps) {
  const classes = classNames(
    "btn btn-light border-light-subtle d-block mb-2 w-100",
  );

  const link = `${multiCommunityLink(multi).link}/settings`;

  return (
    <Link className={classes} to={link}>
      {I18NextService.i18n.t("settings")}
    </Link>
  );
}
