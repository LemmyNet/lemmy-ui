import { numToSI } from "@utils/helpers";
import { Link } from "inferno-router";
import { Community, CommunityId, LocalSite } from "lemmy-js-client";
import { I18NextService } from "../../services";
import classNames from "classnames";

interface BadgesProps {
  subject: Community | LocalSite;
  communityId?: CommunityId;
  className?: string;
  lessBadges?: boolean;
}

const isCommunity = (subject: Community | LocalSite): subject is Community => {
  return "subscribers" in subject;
};

const isLocalSite = (subject: Community | LocalSite): subject is LocalSite => {
  return "communities" in subject;
};

export const Badges = ({
  subject,
  communityId,
  lessBadges,
  className,
}: BadgesProps) => {
  return (
    <ul className={classNames("badges my-1 list-inline", className)}>
      {!lessBadges && (
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
        </>
      )}
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
      {!lessBadges && (
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
      )}
      {isLocalSite(subject) && (
        <>
          <li className="list-inline-item badge text-bg-light">
            {I18NextService.i18n.t("number_of_users", {
              count: Number(subject.users),
              formattedCount: numToSI(subject.users),
            })}
          </li>
          <li className="list-inline-item badge text-bg-light">
            {I18NextService.i18n.t("number_of_communities", {
              count: Number(subject.communities),
              formattedCount: numToSI(subject.communities),
            })}
          </li>
        </>
      )}
      {isCommunity(subject) && (
        <>
          {!lessBadges && (
            <li className="list-inline-item badge text-bg-light">
              {I18NextService.i18n.t("number_of_local_subscribers", {
                count: Number(subject.subscribers_local),
                formattedCount: numToSI(subject.subscribers_local),
              })}
            </li>
          )}
          <li className="list-inline-item badge text-bg-light">
            {I18NextService.i18n.t("number_of_subscribers", {
              count: Number(subject.subscribers),
              formattedCount: numToSI(subject.subscribers),
            })}
          </li>
        </>
      )}
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
      {!lessBadges && (
        <li className="list-inline-item">
          <Link
            className="badge text-bg-secondary"
            to={`/modlog${communityId ? `/${communityId}` : ""}`}
          >
            {I18NextService.i18n.t("modlog")}
          </Link>
        </li>
      )}
    </ul>
  );
};
