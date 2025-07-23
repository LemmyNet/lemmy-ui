import { numToSI } from "@utils/helpers";
import { Link } from "inferno-router";
import { CommunityId } from "lemmy-js-client";
import { I18NextService } from "../../services";

type BadgesSiteProps = {
  type: "site";
  users: number;
  communities: number;
};

type BadgesCommunityProps = {
  type: "community";
  communityId: CommunityId;
  subscribers: number;
  subscribers_local: number;
};

type BadgesProps = {
  users_active_day: number;
  users_active_week: number;
  users_active_month: number;
  users_active_half_year: number;
  posts: number;
  comments: number;
} & (BadgesSiteProps | BadgesCommunityProps);

export const Badges = ({
  users_active_day,
  users_active_week,
  users_active_month,
  users_active_half_year,
  posts,
  comments,
  ...props
}: BadgesProps) => {
  return (
    <ul className="badges my-1 list-inline">
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_day",
          {
            count: Number(users_active_day),
            formattedCount: numToSI(users_active_day),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(users_active_day),
          formattedCount: numToSI(users_active_day),
        })}{" "}
        / {I18NextService.i18n.t("day")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_week",
          {
            count: Number(users_active_week),
            formattedCount: numToSI(users_active_week),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(users_active_week),
          formattedCount: numToSI(users_active_week),
        })}{" "}
        / {I18NextService.i18n.t("week")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_month",
          {
            count: Number(users_active_month),
            formattedCount: numToSI(users_active_month),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(users_active_month),
          formattedCount: numToSI(users_active_month),
        })}{" "}
        / {I18NextService.i18n.t("month")}
      </li>
      <li
        className="list-inline-item badge text-bg-secondary pointer"
        data-tippy-content={I18NextService.i18n.t(
          "active_users_in_the_last_six_months",
          {
            count: Number(users_active_half_year),
            formattedCount: numToSI(users_active_half_year),
          },
        )}
      >
        {I18NextService.i18n.t("number_of_users", {
          count: Number(users_active_half_year),
          formattedCount: numToSI(users_active_half_year),
        })}{" "}
        /{" "}
        {I18NextService.i18n.t("number_of_months", {
          count: 6,
          formattedCount: 6,
        })}
      </li>
      {props.type === "site" ? (
        <>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_users", {
              count: Number(props.users),
              formattedCount: numToSI(props.users),
            })}
          </li>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_communities", {
              count: Number(props.communities),
              formattedCount: numToSI(props.communities),
            })}
          </li>
        </>
      ) : (
        <>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_local_subscribers", {
              count: Number(props.subscribers_local),
              formattedCount: numToSI(props.subscribers_local),
            })}
          </li>
          <li className="list-inline-item badge text-bg-secondary">
            {I18NextService.i18n.t("number_of_subscribers", {
              count: Number(props.subscribers),
              formattedCount: numToSI(props.subscribers),
            })}
          </li>
        </>
      )}
      <li className="list-inline-item badge text-bg-secondary">
        {I18NextService.i18n.t("number_of_posts", {
          count: Number(posts),
          formattedCount: numToSI(posts),
        })}
      </li>
      <li className="list-inline-item badge text-bg-secondary">
        {I18NextService.i18n.t("number_of_comments", {
          count: Number(comments),
          formattedCount: numToSI(comments),
        })}
      </li>
      <li className="list-inline-item">
        <Link
          className="badge text-bg-primary"
          to={`/modlog${props.type === "community" ? `/${props.communityId}` : ""}`}
        >
          {I18NextService.i18n.t("modlog")}
        </Link>
      </li>
    </ul>
  );
};
