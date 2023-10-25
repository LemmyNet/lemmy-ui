import { numToSI } from "@utils/helpers";
import { Link } from "inferno-router";
import {
  CommunityAggregates,
  CommunityId,
  SiteAggregates,
} from "lemmy-js-client";
import { I18NextService } from "../../services";

interface BadgesProps {
  counts: CommunityAggregates | SiteAggregates;
  communityId?: CommunityId;
}

const isCommunityAggregates = (
  counts: CommunityAggregates | SiteAggregates,
): counts is CommunityAggregates => {
  return "subscribers" in counts;
};

const isSiteAggregates = (
  counts: CommunityAggregates | SiteAggregates,
): counts is SiteAggregates => {
  return "communities" in counts;
};

export const Badges = ({ counts, communityId }: BadgesProps) => {
  return (
    <ul className="badges my-1 list-inline">
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_day",
          {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(counts.users_active_day),
          formattedCount: numToSI(counts.users_active_day),
        })}{" "}
        / {I18NextService.i18n.t("day")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_week",
          {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(counts.users_active_week),
          formattedCount: numToSI(counts.users_active_week),
        })}{" "}
        / {I18NextService.i18n.t("week")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_month",
          {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(counts.users_active_month),
          formattedCount: numToSI(counts.users_active_month),
        })}{" "}
        / {I18NextService.i18n.t("month")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_six_months",
          {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(counts.users_active_half_year),
          formattedCount: numToSI(counts.users_active_half_year),
        })}{" "}
        /{" "}
        {I18NextService.i18n.t("number_of_months", {
          count: 6,
          formattedCount: 6,
        })}
      </li>
      {isSiteAggregates(counts) && (
        <>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_users", {
              count: Number(counts.users),
              formattedCount: numToSI(counts.users),
            })}
          </li>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_communities", {
              count: Number(counts.communities),
              formattedCount: numToSI(counts.communities),
            })}
          </li>
        </>
      )}
      {isCommunityAggregates(counts) && (
        <li className="list-inline-item badge text-bg-secondary">
          {I18NextService.i18n.t("number_of_subscribers", {
            count: Number(counts.subscribers),
            formattedCount: numToSI(counts.subscribers),
          })}
        </li>
      )}
      <li className="list-inline-item badge text-bg-secondary">
        {I18NextService.i18n.t("number_of_posts", {
          count: Number(counts.posts),
          formattedCount: numToSI(counts.posts),
        })}
      </li>
      <li className="list-inline-item badge text-bg-secondary">
        {I18NextService.i18n.t("number_of_comments", {
          count: Number(counts.comments),
          formattedCount: numToSI(counts.comments),
        })}
      </li>
      <li className="list-inline-item">
        <Link
          className="badge text-bg-primary"
          to={`/modlog${communityId ? `/${communityId}` : ""}`}
        >
          {I18NextService.i18n.t("modlog")}
        </Link>
      </li>
    </ul>
  );
};
