import { Component, InfernoNode, RefObject, createRef } from "inferno";
import { I18NextService } from "../../../services";
import type { Modal } from "bootstrap";
import { Icon, Spinner } from "../icon";
import {
  PagedResponse,
  MyUserInfo,
  VoteView,
  PaginationCursor,
} from "lemmy-js-client";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../../services/HttpService";
import { fetchLimit } from "@utils/config";
import { PersonListing } from "../../person/person-listing";
import { modalMixin } from "../../mixins/modal-mixin";
import { UserBadges } from "../user-badges";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "../paginator-cursor";

interface ViewVotesModalProps {
  children?: InfernoNode;
  type: "comment" | "post";
  id: number;
  show: boolean;
  myUserInfo: MyUserInfo | undefined;
  onCancel: () => void;
}

interface ViewVotesModalState {
  postLikesRes: RequestState<PagedResponse<VoteView>>;
  commentLikesRes: RequestState<PagedResponse<VoteView>>;
  cursor?: PaginationCursor;
}

function voteViewTable(votes: VoteView[], myUserInfo: MyUserInfo | undefined) {
  return (
    <div id="votes-table">
      {votes.map(v => (
        <>
          <div className="row" key={v.creator.id}>
            <div className="col-10">
              <PersonListing
                person={v.creator}
                banned={v.creator_banned || v.creator_banned_from_community}
                useApubName
                myUserInfo={myUserInfo}
              />
              <UserBadges
                classNames="ms-1"
                creator={v.creator}
                isBanned={v.creator_banned}
                isBannedFromCommunity={v.creator_banned_from_community}
                myUserInfo={myUserInfo}
                showCounts
              />
            </div>
            <div className="col-2">{scoreToIcon(v.is_upvote)}</div>
          </div>
          <hr />
        </>
      ))}
    </div>
  );
}

function scoreToIcon(isUpvote: boolean) {
  return isUpvote === true ? (
    <Icon icon="arrow-up1" classes="icon-inline small text-info" />
  ) : (
    <Icon icon="arrow-down1" classes="icon-inline small text-danger" />
  );
}

@modalMixin
export default class ViewVotesModal extends Component<
  ViewVotesModalProps,
  ViewVotesModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly yesButtonRef: RefObject<HTMLButtonElement>;
  modal?: Modal;
  state: ViewVotesModalState = {
    postLikesRes: EMPTY_REQUEST,
    commentLikesRes: EMPTY_REQUEST,
  };

  constructor(props: ViewVotesModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.yesButtonRef = createRef();

    this.handleDismiss = this.handleDismiss.bind(this);
    this.handleShow = this.handleShow.bind(this);
  }

  async componentWillMount() {
    if (this.props.show && isBrowser()) {
      await this.refetch();
    }
  }

  async componentWillReceiveProps({ show: nextShow }: ViewVotesModalProps) {
    if (nextShow !== this.props.show) {
      if (nextShow) {
        await this.refetch();
      }
    }
  }

  get currentRes() {
    if (this.props.type === "post") {
      return this.state.postLikesRes;
    } else {
      return this.state.commentLikesRes;
    }
  }

  render() {
    return (
      <div
        className="modal fade"
        id="viewVotesModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#viewVotesModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="viewVotesModalTitle">
                {I18NextService.i18n.t("votes")}
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => this.handleDismiss()}
                aria-label={I18NextService.i18n.t("cancel")}
              ></button>
            </header>
            <div className="modal-body text-center align-middle text-body">
              {this.postLikes()}
              {this.commentLikes()}
              <PaginatorCursor
                resource={this.currentRes}
                current={this.state.cursor}
                onPageChange={cursor => handlePageChange(this, cursor)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  postLikes() {
    switch (this.state.postLikesRes.state) {
      case "loading":
        return (
          <h1 className="h4">
            <Spinner large />
          </h1>
        );
      case "success": {
        const likes = this.state.postLikesRes.data.items;
        return voteViewTable(likes, this.props.myUserInfo);
      }
    }
  }

  commentLikes() {
    switch (this.state.commentLikesRes.state) {
      case "loading":
        return (
          <h1 className="h4">
            <Spinner large />
          </h1>
        );
      case "success": {
        const likes = this.state.commentLikesRes.data.items;
        return voteViewTable(likes, this.props.myUserInfo);
      }
    }
  }

  handleShow() {
    this.yesButtonRef.current?.focus();
  }

  handleDismiss() {
    this.props.onCancel();
    this.modal?.hide();
  }

  async refetch() {
    const cursor = this.state.cursor;
    const limit = fetchLimit;

    if (this.props.type === "post") {
      this.setState({ postLikesRes: LOADING_REQUEST });
      this.setState({
        postLikesRes: await HttpService.client.listPostLikes({
          post_id: this.props.id,
          page_cursor: cursor,
          limit,
        }),
      });
    } else {
      this.setState({ commentLikesRes: LOADING_REQUEST });
      this.setState({
        commentLikesRes: await HttpService.client.listCommentLikes({
          comment_id: this.props.id,
          page_cursor: cursor,
          limit,
        }),
      });
    }
  }
}

async function handlePageChange(i: ViewVotesModal, cursor?: PaginationCursor) {
  i.setState({ cursor });
  await i.refetch();
}
