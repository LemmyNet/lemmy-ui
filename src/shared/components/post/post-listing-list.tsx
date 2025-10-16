import { ShowCrossPostsType, VoteContentType } from "@utils/types";
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

// TODO make all boolean imports required?
type Props = {
  postView: PostView;
  crossPosts: PostView[];
  allLanguages: Language[];
  showCommunity: boolean;
  hideImage: boolean;
  viewOnly: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showCrossPosts: ShowCrossPostsType;
  onPostVote(form: CreatePostLike): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
};

export function PostListingList({
  postView,
  crossPosts,
  allLanguages,
  showCommunity,
  hideImage,
  viewOnly,
  myUserInfo,
  localSite,
  showCrossPosts,
  onPostVote,
  onScrollIntoCommentsClick,
}: Props) {
  return (
    <div>
      <article className="row post-container">
        {postIsInteractable(postView, viewOnly) && (
          <div className="col-auto px-0">
            <VoteButtons
              voteContentType={VoteContentType.Post}
              id={postView.post.id}
              onVote={onPostVote}
              myUserInfo={myUserInfo}
              localSite={localSite}
              subject={postView.post}
              myVote={postView.post_actions?.like_score}
              disabled={userNotLoggedInOrBanned(myUserInfo)}
            />
          </div>
        )}
        <div className="col flex-grow-1">
          <PostName post={postView.post} />
          <PostCreatedLine
            postView={postView}
            showCommunity={showCommunity}
            showPublishedTime
            showUrlLine
            allLanguages={allLanguages}
            myUserInfo={myUserInfo}
          />
          <CommentsButton
            postView={postView}
            type_="Text"
            onScrollIntoCommentsClick={onScrollIntoCommentsClick}
          />
        </div>
        {!hideImage && (
          <div className="col-auto">
            <PostThumbnail
              postView={postView}
              hideImage={hideImage}
              myUserInfo={myUserInfo}
            />
          </div>
        )}
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
