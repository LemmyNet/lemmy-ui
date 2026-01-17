import { numToSI } from "@utils/helpers";
import { Link } from "inferno-router";
import { Community, LocalSite, MultiCommunity } from "lemmy-js-client";
import { I18NextService } from "../../services";
import classNames from "classnames";

type CommunityBadgesProps = {
  community: Community;
  className?: string;
  lessBadges?: boolean;
};

export function CommunityBadges({
  community,
  lessBadges,
  className,
}: CommunityBadgesProps) {
  return (
    <ul className={classNames("badges my-1 list-inline", className)}>
      <LocalSiteCommunityCommonBadges
        subject={community}
        lessBadges={lessBadges}
      />
      <MultiCommunityCommunityCommonBadges
        subject={community}
        lessBadges={lessBadges}
      />
    </ul>
  );
}

type MultiCommunityBadgesProps = {
  multiCommunity: MultiCommunity;
  className?: string;
  lessBadges?: boolean;
};

export function MultiCommunityBadges({
  multiCommunity,
  lessBadges,
  className,
}: MultiCommunityBadgesProps) {
  return (
    <ul className={classNames("badges my-1 list-inline", className)}>
      <MultiCommunityCommunityCommonBadges
        subject={multiCommunity}
        lessBadges={lessBadges}
      />
      {!lessBadges && (
        <li className="list-inline-item badge text-bg-light">
          {I18NextService.i18n.t("number_of_communities", {
            count: Number(multiCommunity.communities),
            formattedCount: numToSI(multiCommunity.communities),
          })}
        </li>
      )}
    </ul>
  );
}

type LocalSiteBadgesProps = {
  localSite: LocalSite;
  className?: string;
  lessBadges?: boolean;
};

export function LocalSiteBadges({
  localSite,
  lessBadges,
  className,
}: LocalSiteBadgesProps) {
  return (
    <ul className={classNames("badges my-1 list-inline", className)}>
      <LocalSiteCommunityCommonBadges
        subject={localSite}
        lessBadges={lessBadges}
      />
      {!lessBadges && (
        <>
          <li className="list-inline-item badge text-bg-light">
            {I18NextService.i18n.t("number_of_users", {
              count: Number(localSite.users),
              formattedCount: numToSI(localSite.users),
            })}
          </li>
          <li className="list-inline-item badge text-bg-light">
            {I18NextService.i18n.t("number_of_communities", {
              count: Number(localSite.communities),
              formattedCount: numToSI(localSite.communities),
            })}
          </li>
          <li className="list-inline-item">
            <Link className="badge text-bg-secondary" to="/modlog">
              {I18NextService.i18n.t("modlog")}
            </Link>
          </li>
        </>
      )}
    </ul>
  );
}

type LocalSiteCommunityCommonBadgesProps = {
  subject: LocalSite | Community;
  lessBadges?: boolean;
};
function LocalSiteCommunityCommonBadges({
  subject,
  lessBadges,
}: LocalSiteCommunityCommonBadgesProps) {
  return (
    !lessBadges && (
      <>
        <li
          className="list-inline-item badge text-bg-light pointer"
          data-tippy-content={I18NextService.i18n.t(
            "active_users_in_the_last_day",
            {
              count: Number(subject.users_active_day),
              formattedCount: numToSI(subject.users_active_day),
            },
          )}
        >
          {I18NextService.i18n.t("number_of_users", {
            count: Number(subject.users_active_day),
            formattedCount: numToSI(subject.users_active_day),
          })}{" "}
          / {I18NextService.i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge text-bg-light pointer"
          data-tippy-content={I18NextService.i18n.t(
            "active_users_in_the_last_week",
            {
              count: Number(subject.users_active_week),
              formattedCount: numToSI(subject.users_active_week),
            },
          )}
        >
          {I18NextService.i18n.t("number_of_users", {
            count: Number(subject.users_active_week),
            formattedCount: numToSI(subject.users_active_week),
          })}{" "}
          / {I18NextService.i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge text-bg-light pointer"
          data-tippy-content={I18NextService.i18n.t(
            "active_users_in_the_last_month",
            {
              count: Number(subject.users_active_month),
              formattedCount: numToSI(subject.users_active_month),
            },
          )}
        >
          {I18NextService.i18n.t("number_of_users", {
            count: Number(subject.users_active_month),
            formattedCount: numToSI(subject.users_active_month),
          })}{" "}
          / {I18NextService.i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge text-bg-light pointer"
          data-tippy-content={I18NextService.i18n.t(
            "active_users_in_the_last_six_months",
            {
              count: Number(subject.users_active_half_year),
              formattedCount: numToSI(subject.users_active_half_year),
            },
          )}
        >
          {I18NextService.i18n.t("number_of_users", {
            count: Number(subject.users_active_half_year),
            formattedCount: numToSI(subject.users_active_half_year),
          })}{" "}
          /{" "}
          {I18NextService.i18n.t("number_of_months", {
            count: 6,
            formattedCount: 6,
          })}
        </li>
        <li className="list-inline-item badge text-bg-light">
          {I18NextService.i18n.t("number_of_posts", {
            count: Number(subject.posts),
            formattedCount: numToSI(subject.posts),
          })}
        </li>
        <li className="list-inline-item badge text-bg-light">
          {I18NextService.i18n.t("number_of_comments", {
            count: Number(subject.comments),
            formattedCount: numToSI(subject.comments),
          })}
        </li>
      </>
    )
  );
}

type MultiCommunityCommunityCommonBadgesProps = {
  subject: MultiCommunity | Community;
  lessBadges?: boolean;
};
function MultiCommunityCommunityCommonBadges({
  subject,
  lessBadges,
}: MultiCommunityCommunityCommonBadgesProps) {
  return (
    !lessBadges && (
      <>
        <li className="list-inline-item badge text-bg-light">
          {I18NextService.i18n.t("number_of_local_subscribers", {
            count: Number(subject.subscribers_local),
            formattedCount: numToSI(subject.subscribers_local),
          })}
        </li>
        <li className="list-inline-item badge text-bg-light">
          {I18NextService.i18n.t("number_of_subscribers", {
            count: Number(subject.subscribers),
            formattedCount: numToSI(subject.subscribers),
          })}
        </li>
      </>
    )
  );
}
