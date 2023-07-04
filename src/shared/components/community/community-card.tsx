import { myAuthRequired } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";
import { Component } from "inferno";
import {
  CommunityView,
  FollowCommunity,
  SubscribedType,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { CommunityLink } from "./community-link";

interface CommunityCardProps {
  webfinger: string;
  communityView: CommunityView;
  onSubscribe: (form: FollowCommunity) => Promise<void>;
  loading?: boolean;
}

const buttonMap = new Map<SubscribedType, NoOptionI18nKeys>([
  ["NotSubscribed", "subscribe"],
  ["Subscribed", "unsubscribe"],
  ["Pending", "subscribe_pending"],
]);

export default class CommunityCard extends Component<CommunityCardProps, any> {
  constructor(props: CommunityCardProps, context: any) {
    super(props, context);
  }

  render() {
    const {
      webfinger,
      communityView: { community, subscribed },
      onSubscribe,
      loading,
    } = this.props;

    return (
      <div className="card">
        <strong className="card-header d-block">{webfinger}</strong>
        <div className="card-body">
          <h5 className="card-title">
            <CommunityLink community={community} bigAvatar />
          </h5>
          {community.description && (
            <div className="card-text">
              {community.description.length > 200
                ? `${community.description.slice(0, 200)}...`
                : community.description}
            </div>
          )}
          <button
            type="button"
            className={`btn btn-${
              subscribed === "Pending" ? "warning" : "secondary"
            } mt-2`}
            disabled={loading}
            onClick={() =>
              onSubscribe({
                auth: myAuthRequired(),
                community_id: community.id,
                follow: subscribed === "NotSubscribed",
              })
            }
          >
            {loading ? (
              <Spinner />
            ) : (
              <>
                {subscribed === "Subscribed" && (
                  <Icon icon="check" classes="icon-inline me-1" />
                )}
                {I18NextService.i18n.t(
                  buttonMap.get(subscribed) as NoOptionI18nKeys
                )}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
