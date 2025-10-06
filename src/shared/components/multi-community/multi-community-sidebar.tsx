import { Component, InfernoNode, linkEvent } from "inferno";
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
import { followStateKey } from "@components/common/subscribe-button";

interface Props {
  multi_community_view: MultiCommunityView;
  // TODO check on these
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
    this.handleEditCancel = this.handleEditCancel.bind(this);
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

  // TODO why is this necessary
  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>,
  ): void {
    if (this.props.multi_community_view !== nextProps.multi_community_view) {
      this.setState({
        showEdit: false,
        deleteLoading: false,
        followLoading: false,
      });
    }
  }

  render() {
    // TODO add the communities to multi-community.
    return (
      <div className="multi-community-sidebar">
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <MultiCommunityForm
            multi_community_view={this.props.multi_community_view}
            onEdit={this.props.onEdit}
            onCancel={this.handleEditCancel}
            myUserInfo={this.props.myUserInfo}
          />
        )}
      </div>
    );
  }

  sidebar() {
    return (
      <aside className="mb-3">
        <div id="sidebarContainer">
          {!this.props.hideButtons && (
            <section id="sidebarMain" className="card mb-3">
              <div className="card-body">
                {this.multiCommunityTitle()}
                {this.props.editable && this.creatorButtons()}
                {this.subscribeButton()}
              </div>
            </section>
          )}
          <section id="sidebarInfo" className="card mb-3">
            <div className="card-body">
              {this.sidebarMarkdown()}
              {this.creator()}
            </div>
          </section>
        </div>
      </aside>
    );
  }

  multiCommunityTitle() {
    const multiCommunity = this.props.multi_community_view.multi;

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

  subscribeButton() {
    const buttonClass = "btn btn-secondary d-block mb-2 w-100";
    const subscribed = this.props.multi_community_view.follow_state;

    return (
      <button
        type="button"
        className={buttonClass}
        onClick={linkEvent(this, this.handlefollowMultiCommunity)}
      >
        {this.state.followLoading ? (
          <Spinner />
        ) : (
          <>
            {subscribed === "Accepted" && (
              <Icon icon="check" classes="icon-inline me-1" />
            )}
            {I18NextService.i18n.t(followStateKey(subscribed))}
          </>
        )}
      </button>
    );
  }

  creator() {
    const creator = this.props.multi_community_view.owner;

    // TODO should this be an inline list, like the others?
    return (
      <ul className="list-inline small">
        <li className="list-inline-item">
          {I18NextService.i18n.t("creator")}:{" "}
        </li>
        <li key={creator.id} className="list-inline-item">
          <PersonListing person={creator} myUserInfo={this.props.myUserInfo} />
        </li>
      </ul>
    );
  }

  sidebarMarkdown() {
    const sidebar = this.props.multi_community_view.multi.description;
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
    const mv = this.props.multi_community_view;
    const amCreator =
      this.props.myUserInfo?.local_user_view.person.id === mv.owner.id;

    return (
      amCreator && (
        <ul className="list-inline mb-1 text-muted fw-bold">
          <li className="list-inline-item-action">
            <button
              className="btn btn-link text-muted d-inline-block"
              onClick={linkEvent(this, this.handleEditClick)}
              data-tippy-content={I18NextService.i18n.t("edit")}
              aria-label={I18NextService.i18n.t("edit")}
            >
              <Icon icon="edit" classes="icon-inline" />
            </button>
          </li>
          <li className="list-inline-item-action">
            <button
              className="btn btn-link text-muted d-inline-block"
              onClick={linkEvent(this, this.handleDelete)}
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

  handleEditClick(i: MultiCommunitySidebar) {
    i.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  handlefollowMultiCommunity(i: MultiCommunitySidebar) {
    const mv = i.props.multi_community_view;
    const follow = mv.follow_state ? !mv.follow_state : true;

    i.setState({ followLoading: true });
    i.props.onFollow({
      multi_community_id: mv.multi.id,
      follow,
    });
  }

  handleDelete(i: MultiCommunitySidebar) {
    const mv = i.props.multi_community_view.multi;
    i.setState({ deleteLoading: true });
    i.props.onEdit({ id: mv.id, deleted: !mv.deleted });
  }
}
