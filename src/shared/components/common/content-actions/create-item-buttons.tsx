import { Link } from "inferno-router";
import { I18NextService } from "../../../services";
import { Icon } from "../icon";
import { CrossPostParams } from "@utils/types";
import { InfernoNode } from "inferno";
import { getQueryString } from "@utils/helpers";
import { CommunityView, LocalSite, MyUserInfo } from "lemmy-js-client";
import { canCreateCommunity } from "@utils/roles";
import classNames from "classnames";
import { userNotLoggedInOrBanned } from "@utils/app";

export function CrossPostButton(props: CrossPostParams): InfernoNode {
  const label = I18NextService.i18n.t("cross_post");
  return (
    <Link
      className="btn btn-link d-flex align-items-center rounded-0 dropdown-item"
      to={{
        pathname: "/create_post",
        state: props,
      }}
      title={label}
      data-tippy-content={label}
      aria-label={label}
    >
      <Icon icon="copy" classes="me-2" inline />
      {label}
    </Link>
  );
}

type CreatePostButtonProps = {
  communityView?: CommunityView;
};
export function CreatePostButton({ communityView }: CreatePostButtonProps) {
  const classes = classNames("btn btn-secondary d-block mb-2 w-100", {
    "no-click":
      communityView?.community.deleted || communityView?.community.removed,
  });

  const link = communityView
    ? "/create_post" +
      getQueryString({ communityId: communityView.community.id.toString() })
    : "/create_post";

  return (
    <Link className={classes} to={link}>
      {I18NextService.i18n.t("create_post")}
    </Link>
  );
}

type CreateCommunityButtonProps = {
  localSite?: LocalSite;
  myUserInfo: MyUserInfo | undefined;
};
export function CreateCommunityButton({
  localSite,
  myUserInfo,
}: CreateCommunityButtonProps) {
  const classes = classNames("btn btn-secondary d-block mb-2 w-100", {
    "no-click": !(localSite && canCreateCommunity(localSite, myUserInfo)),
  });

  return (
    <Link className={classes} to="/create_community">
      {I18NextService.i18n.t("create_community")}
    </Link>
  );
}

type CreateMultiCommunityButtonProps = {
  myUserInfo: MyUserInfo | undefined;
};
export function CreateMultiCommunityButton({
  myUserInfo,
}: CreateMultiCommunityButtonProps) {
  const classes = classNames("btn btn-secondary d-block mb-2 w-100", {
    "no-click": userNotLoggedInOrBanned(myUserInfo),
  });

  return (
    <Link className={classes} to="/create_multi_community">
      {I18NextService.i18n.t("create_multi_community")}
    </Link>
  );
}
