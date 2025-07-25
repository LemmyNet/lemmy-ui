import {
  Component,
  InfernoNode,
  RefObject,
  createRef,
  linkEvent,
} from "inferno";
import { I18NextService } from "../../../services";
import type { Modal } from "bootstrap";
import { Icon, Spinner } from "../icon";
import { Paginator } from "../paginator";
import {
  ListCommentLikesResponse,
  ListPostLikesResponse,
  VoteView,
} from "lemmy-js-client";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../../services/HttpService";
import { fetchLimit } from "../../../config";
import { PersonListing } from "../../person/person-listing";
import { modalMixin } from "../../mixins/modal-mixin";
import { UserBadges } from "../user-badges";
import { isBrowser } from "@utils/browser";

interface ViewVotesModalProps {
  children?: InfernoNode;
  type: "comment" | "post";
  id: number;
  show: boolean;
  onCancel: () => void;
}

interface ViewVotesModalState {
  postLikesRes: RequestState<ListPostLikesResponse>;
  commentLikesRes: RequestState<ListCommentLikesResponse>;
  nextPageCursor?: string;
  prevPageCursor?: string;
  pageBack?: boolean;
}

function voteViewTable(votes: VoteView[]) {
  return (
    <div className="table-responsive">
      <table id="community_table" className="table table-sm table-hover">
        <tbody>
          {votes.map(v => (
            <tr key={v.creator.id}>
              <td className="text-start">
                <PersonListing person={v.creator} useApubName />
                <UserBadges
                  classNames="ms-1"
                  isBot={v.creator.bot_account}
                  isDeleted={v.creator.deleted}
                  isBanned={v.creator_banned}
                  isBannedFromCommunity={v.creator_banned_from_community}
                />
              </td>
              <td className="text-end">{scoreToIcon(v.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function scoreToIcon(score: number) {
  return score === 1 ? (
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
    this.handleNextPage = this.handleNextPage.bind(this);
    this.handlePrevPage = this.handlePrevPage.bind(this);
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
                onClick={linkEvent(this, this.handleDismiss)}
                aria-label={I18NextService.i18n.t("cancel")}
              ></button>
            </header>
            <div className="modal-body text-center align-middle text-body">
              {this.postLikes()}
              {this.commentLikes()}
              <Paginator
                onNext={this.handleNextPage}
                onPrev={this.handlePrevPage}
                nextDisabled={false}
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
        const likes = this.state.postLikesRes.data.post_likes;
        return voteViewTable(likes);
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
        const likes = this.state.commentLikesRes.data.comment_likes;
        return voteViewTable(likes);
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

  async handleNextPage() {
    this.setState({ pageBack: false });
    await this.refetch();
  }

  async handlePrevPage() {
    this.setState({ pageBack: true });
    await this.refetch();
  }

  async refetch() {
    const { nextPageCursor, prevPageCursor, pageBack } = this.state;
    const limit = fetchLimit;

    if (this.props.type === "post") {
      this.setState({ postLikesRes: LOADING_REQUEST });
      const postLikesRes = await HttpService.client.listPostLikes({
        post_id: this.props.id,
        limit,
        page_cursor: pageBack ? prevPageCursor : nextPageCursor,
        page_back: pageBack,
      });

      if (postLikesRes.state === "success") {
        this.setState({
          postLikesRes,
          nextPageCursor: postLikesRes.data.next_page,
          prevPageCursor: postLikesRes.data.prev_page,
        });
      } else {
        this.setState({ postLikesRes });
      }
    } else {
      this.setState({ commentLikesRes: LOADING_REQUEST });
      const commentLikesRes = await HttpService.client.listCommentLikes({
        comment_id: this.props.id,
        limit,
        page_cursor: pageBack ? prevPageCursor : nextPageCursor,
        page_back: pageBack,
      });

      if (commentLikesRes.state === "success") {
        this.setState({
          commentLikesRes,
          nextPageCursor: commentLikesRes.data.next_page,
          prevPageCursor: commentLikesRes.data.prev_page,
        });
      } else {
        this.setState({ commentLikesRes });
      }
    }

    this.setState({ pageBack: false });
  }
}
