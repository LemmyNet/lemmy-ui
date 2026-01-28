import { Component } from "inferno";
import {
  FollowMultiCommunity,
  MultiCommunityView,
  MyUserInfo,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import {
  MultiCommunityLink,
  MultiCommunitySettingsLink,
} from "./multi-community-link";
import { SubscribeButton } from "@components/common/subscribe-button";
import { MultiCommunityBadges } from "@components/common/badges";

interface Props {
  multiCommunityView: MultiCommunityView;
  hideButtons?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onFollow(form: FollowMultiCommunity): void;
  followLoading: boolean;
}

@tippyMixin
export class MultiCommunitySidebar extends Component<Props, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return <div className="multi-community-sidebar">{this.sidebar()}</div>;
  }

  sidebar() {
    const {
      multiCommunityView: mv,
      hideButtons,
      followLoading,
      myUserInfo,
    } = this.props;

    return (
      <aside className="mb-3">
        <div id="sidebarContainer">
          {!hideButtons && (
            <section id="sidebarMain" className="card mb-3">
              <div className="card-body">
                {this.multiCommunityTitle()}
                {mv.multi.summary && <h6>{mv.multi.summary}</h6>}
                <SubscribeButton
                  followState={mv.follow_state}
                  apId={mv.multi.ap_id}
                  onFollow={() => handleFollowMultiCommunity(this, true)}
                  onUnFollow={() => handleFollowMultiCommunity(this, false)}
                  loading={followLoading}
                  showRemoteFetch={!myUserInfo}
                />
                {this.amCreator && (
                  <MultiCommunitySettingsLink multi={mv.multi} />
                )}
              </div>
            </section>
          )}
          <section id="sidebarInfo" className="card mb-3">
            <div className="card-body">
              <MultiCommunityBadges multiCommunity={mv.multi} />
              {this.creator()}
            </div>
          </section>
        </div>
      </aside>
    );
  }

  multiCommunityTitle() {
    const multiCommunity = this.props.multiCommunityView.multi;

    return (
      <div className="mb-3">
        <h2 className="h5 mb-0">
          <span className="me-2">
            <MultiCommunityLink
              multiCommunity={multiCommunity}
              myUserInfo={this.props.myUserInfo}
            />
          </span>
          {multiCommunity.deleted && (
            <small className="me-2 text-muted fst-italic">
              {I18NextService.i18n.t("deleted")}
            </small>
          )}
        </h2>
        <MultiCommunityLink
          multiCommunity={multiCommunity}
          realLink
          useApubName
          muted
          myUserInfo={this.props.myUserInfo}
        />
      </div>
    );
  }

  creator() {
    const creator = this.props.multiCommunityView.owner;

    return (
      <ul className="list-inline small">
        <li className="list-inline-item">
          {I18NextService.i18n.t("creator")}:{" "}
        </li>
        <li key={creator.id} className="list-inline-item">
          <PersonListing
            person={creator}
            banned={false}
            myUserInfo={this.props.myUserInfo}
          />
        </li>
      </ul>
    );
  }

  get amCreator(): boolean {
    return (
      this.props.myUserInfo?.local_user_view.person.id ===
      this.props.multiCommunityView.owner.id
    );
  }
}

function handleFollowMultiCommunity(i: MultiCommunitySidebar, follow: boolean) {
  const mv = i.props.multiCommunityView;

  i.setState({ followLoading: true });
  i.props.onFollow({
    multi_community_id: mv.multi.id,
    follow,
  });
}
