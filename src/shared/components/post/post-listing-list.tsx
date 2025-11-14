import { ShowBodyType, ShowCrossPostsType } from "@utils/types";
import {
  CreatePostLike,
  Language,
  LocalSite,
  MyUserInfo,
  PostView,
} from "lemmy-js-client";
import { VoteButtons } from "@components/common/vote-buttons";
import { postIsInteractable, userNotLoggedInOrBanned } from "@utils/app";
import { PostThumbnail } from "./post-thumbnail";
import { PostCreatedLine, PostName } from "./common";
import { CrossPosts } from "./cross-posts";
import { CommentsButton } from "./post-action-bar";
import { mdToHtml } from "@utils/markdown";

type Props = {
  postView: PostView;
  crossPosts: PostView[];
  allLanguages: Language[];
  showCommunity: boolean;
  showBody: ShowBodyType;
  hideImage: boolean;
  viewOnly: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showCrossPosts: ShowCrossPostsType;
  onPostVote(form: CreatePostLike): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
  imageExpanded?: boolean;
};

export function PostListingList({
  postView,
  crossPosts,
  allLanguages,
  showCommunity,
  showBody,
  hideImage,
  viewOnly,
  showAdultConsentModal,
  myUserInfo,
  localSite,
  showCrossPosts,
  onPostVote,
  onScrollIntoCommentsClick,
  imageExpanded,
}: Props) {
  return (
    <div>
      <article className="row post-container">
        {postIsInteractable(postView, viewOnly) && (
          <div className="col-auto px-0">
            <VoteButtons
              voteContentType={"post"}
              id={postView.post.id}
              onVote={onPostVote}
              myUserInfo={myUserInfo}
              localSite={localSite}
              subject={postView.post}
              myVoteIsUpvote={postView.post_actions?.vote_is_upvote}
              disabled={userNotLoggedInOrBanned(myUserInfo)}
            />
          </div>
        )}
        <div className="col flex-grow-1">
          <PostName post={postView.post} showBody={showBody} />
          <PostCreatedLine
            postView={postView}
            showCommunity={showCommunity}
            showPublishedTime
            showUrlLine
            showPostBadges
            allLanguages={allLanguages}
            myUserInfo={myUserInfo}
          />
          <CommentsButton
            postView={postView}
            type_="text"
            onScrollIntoCommentsClick={onScrollIntoCommentsClick}
          />
          {postView.post.body && showBody === "full" && (
            <PostBody body={postView.post.body} />
          )}
        </div>
        <div className="col-auto">
          <PostThumbnail
            postView={postView}
            hideImage={hideImage}
            myUserInfo={myUserInfo}
            imageExpanded={imageExpanded}
            showAdultConsentModal={showAdultConsentModal}
          />
        </div>
      </article>
      <CrossPosts
        crossPosts={crossPosts}
        type_={showCrossPosts}
        myUserInfo={myUserInfo}
        localSite={localSite}
      />
    </div>
  );
}

type PostBodyProps = {
  body: string;
};

function PostBody({ body }: PostBodyProps) {
  return (
    <article id="postContent" className="my-2">
      <div className="col-12 card card-body">
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(body, () => {})}
        />
      </div>
    </article>
  );
}
