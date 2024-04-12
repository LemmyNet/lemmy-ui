import { Component, RefObject, createRef, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import type { Modal } from "bootstrap";
import { Icon, Spinner } from "./icon";
import { Paginator } from "../common/paginator";
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
} from "../../services/HttpService";
import { fetchLimit } from "../../config";
import { PersonListing } from "../person/person-listing";

interface ViewVotesModalProps {
  type: "comment" | "post";
  id: number;
  show: boolean;
  onCancel: () => void;
}

interface ViewVotesModalState {
  postLikesRes: RequestState<ListPostLikesResponse>;
  commentLikesRes: RequestState<ListCommentLikesResponse>;
  page: number;
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
    page: 1,
  };

  constructor(props: ViewVotesModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.yesButtonRef = createRef();

    this.handleShow = this.handleShow.bind(this);
    this.handleDismiss = this.handleDismiss.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
  }

  async componentDidMount() {
    const Modal = (await import("bootstrap/js/dist/modal")).default;

    if (!this.modalDivRef.current) {
      return;
    }

    this.modal = new Modal(this.modalDivRef.current!);
    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    if (this.props.show) {
      this.modal.show();
      await this.refetch();
    }
  }

  componentWillUnmount() {
    this.modalDivRef.current?.removeEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    this.modal?.dispose();
  }

  async componentDidUpdate({ show: prevShow }: ViewVotesModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal?.show();
        await this.refetch();
      } else {
        this.modal?.hide();
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
                page={this.state.page}
                onChange={this.handlePageChange}
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

  async handlePageChange(page: number) {
    this.setState({ page });
    await this.refetch();
  }

  async refetch() {
    const page = this.state.page;
    const limit = fetchLimit;

    if (this.props.type === "post") {
      this.setState({ postLikesRes: LOADING_REQUEST });
      this.setState({
        postLikesRes: await HttpService.client.listPostLikes({
          post_id: this.props.id,
          page,
          limit,
        }),
      });
    } else {
      this.setState({ commentLikesRes: LOADING_REQUEST });
      this.setState({
        commentLikesRes: await HttpService.client.listCommentLikes({
          comment_id: this.props.id,
          page,
          limit,
        }),
      });
    }
  }
}
