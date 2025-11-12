import { Component, InfernoNode } from "inferno";
import {
  FollowMultiCommunity,
  MultiCommunityView,
  MyUserInfo,
  UpdateMultiCommunity,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MultiCommunityForm } from "./multi-community-form";
import { MultiCommunityLink } from "./multi-community-link";
import { SubscribeButton } from "@components/common/subscribe-button";
import { MultiCommunityBadges } from "@components/common/badges";

interface Props {
  multiCommunityView: MultiCommunityView;
  editable?: boolean;
  hideButtons?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onFollow(form: FollowMultiCommunity): void;
  onEdit(form: UpdateMultiCommunity): void;
}

interface State {
  showEdit: boolean;
  deleteLoading: boolean;
  followLoading: boolean;
}

@tippyMixin
export class MultiCommunitySidebar extends Component<Props, State> {
  state: State = {
    showEdit: false,
    deleteLoading: false,
    followLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  unlisten = () => {};

  componentWillMount() {
    // Leave edit mode on navigation
    this.unlisten = this.context.router.history.listen(() => {
      if (this.state.showEdit) {
        this.setState({ showEdit: false });
      }
    });
  }

  componentWillUnmount(): void {
    this.unlisten();
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>,
  ): void {
    if (this.props.multiCommunityView !== nextProps.multiCommunityView) {
      this.setState({
        showEdit: false,
        deleteLoading: false,
        followLoading: false,
      });
    }
  }

  render() {
    return (
      <div className="multi-community-sidebar">
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <MultiCommunityForm
            multiCommunityView={this.props.multiCommunityView}
            onEdit={this.props.onEdit}
            onCancel={() => handleEditCancel(this)}
            myUserInfo={this.props.myUserInfo}
          />
        )}
      </div>
    );
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
                {this.props.editable && this.creatorButtons()}
                <SubscribeButton
                  followState={mv.follow_state}
                  apId={mv.multi.ap_id}
                  onFollow={() => handleFollowMultiCommunity(this, true)}
                  onUnFollow={() => handleFollowMultiCommunity(this, false)}
                  loading={this.state.followLoading}
                  showRemoteFetch={!this.props.myUserInfo}
                />
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
      <div>
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

  creatorButtons() {
    const mv = this.props.multiCommunityView;
    const amCreator =
      this.props.myUserInfo?.local_user_view.person.id === mv.owner.id;

    return (
      amCreator && (
        <ul className="list-inline mb-1 text-muted fw-bold">
          <li className="list-inline-item-action">
            <button
              className="btn btn-link text-muted d-inline-block"
              onClick={() => handleEditClick(this)}
              data-tippy-content={I18NextService.i18n.t("edit")}
              aria-label={I18NextService.i18n.t("edit")}
            >
              <Icon icon="edit" classes="icon-inline" />
            </button>
          </li>
          <li className="list-inline-item-action">
            <button
              className="btn btn-link text-muted d-inline-block"
              onClick={() => handleDelete(this)}
              data-tippy-content={
                !mv.multi.deleted
                  ? I18NextService.i18n.t("delete")
                  : I18NextService.i18n.t("restore")
              }
              aria-label={
                !mv.multi.deleted
                  ? I18NextService.i18n.t("delete")
                  : I18NextService.i18n.t("restore")
              }
            >
              {this.state.deleteLoading ? (
                <Spinner />
              ) : (
                <Icon
                  icon="trash"
                  classes={`icon-inline ${mv.multi.deleted && "text-danger"}`}
                />
              )}{" "}
            </button>
          </li>
        </ul>
      )
    );
  }
}
function handleEditClick(i: MultiCommunitySidebar) {
  i.setState({ showEdit: true });
}

function handleEditCancel(i: MultiCommunitySidebar) {
  i.setState({ showEdit: false });
}

function handleDelete(i: MultiCommunitySidebar) {
  const mv = i.props.multiCommunityView.multi;
  i.setState({ deleteLoading: true });
  i.props.onEdit({ id: mv.id, deleted: !mv.deleted });
}

function handleFollowMultiCommunity(i: MultiCommunitySidebar, follow: boolean) {
  const mv = i.props.multiCommunityView;

  i.setState({ followLoading: true });
  i.props.onFollow({
    multi_community_id: mv.multi.id,
    follow,
  });
}
