import { Component } from "inferno";
import {
  FollowMultiCommunity,
  MultiCommunityView,
  MyUserInfo,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
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
    const mv = this.props.multiCommunityView;
    return (
      <aside className="mb-3">
        <div id="sidebarContainer">
          {!this.props.hideButtons && (
            <section id="sidebarMain" className="card mb-3">
              <div className="card-body">
                {this.multiCommunityTitle()}

                <SubscribeButton
                  followState={mv.follow_state}
                  apId={mv.multi.ap_id}
                  onFollow={() => handleFollowMultiCommunity(this, true)}
                  onUnFollow={() => handleFollowMultiCommunity(this, false)}
                  loading={this.props.followLoading}
                  showRemoteFetch={!this.props.myUserInfo}
                />
                {this.amCreator && (
                  <MultiCommunitySettingsLink multi={mv.multi} />
                )}
              </div>
            </section>
          )}
          <section id="sidebarInfo" className="card mb-3">
            <div className="card-body">
              {this.sidebarMarkdown()}
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

  sidebarMarkdown() {
    const sidebar = this.props.multiCommunityView.multi.description;
    return (
      sidebar && (
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(sidebar, () => this.forceUpdate())}
        />
      )
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
