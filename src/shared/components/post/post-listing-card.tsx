import { tippyMixin } from "@components/mixins/tippy-mixin";
import { mdToHtml } from "@utils/markdown";
import { isAudio, isImage, isMagnetLink, isVideo } from "@utils/media";
import { ShowBodyType, ShowCrossPostsType } from "@utils/types";
import { Component } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  HidePost,
  Language,
  LocalSite,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import {
  PostName,
  PostCreatedLine,
  PostPublishedTime,
  UrlLine,
  TorrentHelp,
  PostImg,
} from "./common";
import { CrossPosts } from "./cross-posts";
import { PostActionBar } from "./post-action-bar";
import { PostThumbnail } from "./post-thumbnail";
import classNames from "classnames";
import { MetadataCard } from "./metadata-card";

type PostListingCardState = {
  viewSource: boolean;
};

type PostListingCardProps = {
  postView: PostView;
  smallCard: boolean;
  crossPosts: PostView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  showCommunity: boolean;
  showBody: ShowBodyType;
  hideImage: boolean;
  enableNsfw: boolean;
  viewOnly: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showCrossPosts: ShowCrossPostsType;
  markable: boolean;
  disableAutoMarkAsRead: boolean;
  editLoading: boolean;
  readLoading: boolean;
  onEditClick(): void;
  onPostEdit(form: EditPost): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePost(form: FeaturePost): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgePost(form: PurgePost): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onTransferCommunity(form: TransferCommunity): void;
  onHidePost(form: HidePost): void;
  onPersonNote(form: NotePerson): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
  onMarkPostAsRead(form: MarkPostAsRead): void;
};

@tippyMixin
export class PostListingCard extends Component<
  PostListingCardProps,
  PostListingCardState
> {
  state: PostListingCardState = {
    viewSource: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const p = this.props;

    // Only show thumbnail if its either a small card, or
    // its a non-image large card
    const isImagePost = p.postView.post.url && isImage(p.postView.post.url);
    const showThumbnail = p.smallCard || (!p.smallCard && !isImagePost);

    return (
      <div>
        <article className="post-container">
          <div className="row mb-1">
            <div className="col flex-grow-1">
              <PostCreatedLine
                postView={p.postView}
                showCommunity={p.showCommunity}
                showPublishedTime={false}
                showUrlLine={false}
                allLanguages={p.allLanguages}
                myUserInfo={p.myUserInfo}
              />
            </div>
            <div className="col-auto small">
              <PostPublishedTime post={p.postView.post} />
            </div>
          </div>
          <div className="row mb-1">
            <div className="col flex-grow-1">
              <PostName post={p.postView.post} showBody={p.showBody} />
              <div className="small">
                <UrlLine postView={p.postView} myUserInfo={p.myUserInfo} />
              </div>
            </div>
            {!p.hideImage && showThumbnail && (
              <div className="col-auto">
                <PostThumbnail
                  postView={p.postView}
                  hideImage={p.hideImage}
                  myUserInfo={p.myUserInfo}
                />
              </div>
            )}
          </div>
          {!p.hideImage && !p.smallCard && isImagePost && (
            <PostImg
              postView={p.postView}
              showAdultConsentModal={p.showAdultConsentModal}
            />
          )}
          <div className="row mb-1">
            {p.postView.post.body && (
              <Body
                body={p.postView.post.body}
                showBody={p.showBody}
                viewSource={this.state.viewSource}
              />
            )}
          </div>
          <PostActionBar
            postView={p.postView}
            admins={p.admins}
            showBody={p.showBody}
            markable={p.markable}
            viewOnly={p.viewOnly}
            viewSource={this.state.viewSource}
            myUserInfo={p.myUserInfo}
            localSite={p.localSite}
            readLoading={p.readLoading}
            onPostVote={p.onPostVote}
            onScrollIntoCommentsClick={p.onScrollIntoCommentsClick}
            onClickViewSource={() => handleViewSource(this)}
            onMarkPostAsRead={p.onMarkPostAsRead}
            onEditClick={p.onEditClick}
            onPostReport={p.onPostReport}
            onBlockPerson={p.onBlockPerson}
            onBlockCommunity={p.onBlockCommunity}
            onLockPost={p.onLockPost}
            onDeletePost={p.onDeletePost}
            onRemovePost={p.onRemovePost}
            onSavePost={p.onSavePost}
            onFeaturePost={p.onFeaturePost}
            onPurgePerson={p.onPurgePerson}
            onPurgePost={p.onPurgePost}
            onBanPersonFromCommunity={p.onBanPersonFromCommunity}
            onBanPerson={p.onBanPerson}
            onAddModToCommunity={p.onAddModToCommunity}
            onAddAdmin={p.onAddAdmin}
            onTransferCommunity={p.onTransferCommunity}
            onHidePost={p.onHidePost}
            onPersonNote={p.onPersonNote}
          />
        </article>
        {p.showBody === "Full" &&
          p.postView.post.url &&
          isMagnetLink(p.postView.post.url) && <TorrentHelp />}
        {p.showBody === "Full" &&
          p.postView.post.url &&
          p.postView.post.embed_title && (
            <MetadataCard post={p.postView.post} />
          )}
        {p.showBody === "Full" && <VideoBlock postView={p.postView} />}
        <CrossPosts
          crossPosts={p.crossPosts}
          type_={p.showCrossPosts}
          myUserInfo={p.myUserInfo}
          localSite={p.localSite}
        />
      </div>
    );
  }
}

type BodyProps = {
  body: string;
  showBody: ShowBodyType;
  viewSource: boolean;
};
function Body({ viewSource, body, showBody }: BodyProps) {
  const classes = classNames("my-2", {
    "fade-preview": showBody === "Preview",
  });

  const innerClasses = classNames("col-12-", {
    "card card-body": showBody === "Full",
  });

  return (
    <article id="postContent" className={classes}>
      {viewSource ? (
        <pre>{body}</pre>
      ) : (
        <div className={innerClasses}>
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(body, () => {})}
          />
        </div>
      )}
    </article>
  );
}

type VideoBlockProps = {
  postView: PostView;
};
function VideoBlock({ postView }: VideoBlockProps) {
  const post = postView.post;
  const url = post.url;

  // if direct video link or embedded video link
  if ((url && isVideo(url)) || isVideo(post.embed_video_url ?? "")) {
    /* eslint-disable jsx-a11y/media-has-caption */
    return (
      <div className="ratio ratio-16x9 mt-3">
        <video
          onLoadStart={handleMediaLoadStart}
          onPlay={this.handleMediaLoadStart}
          onVolumeChange={handleMediaVolumeChange}
          controls
          aria-label={post.alt_text}
        >
          <source src={post.embed_video_url ?? url} />
        </video>
      </div>
    );
  } else if ((url && isAudio(url)) || isAudio(post.embed_video_url ?? "")) {
    return (
      <audio
        onLoadStart={handleMediaLoadStart}
        onPlay={handleMediaLoadStart}
        onVolumeChange={handleMediaVolumeChange}
        className="w-100"
        controls
        aria-label={post.alt_text}
      >
        <source src={url} />
      </audio>
    );
    /* eslint-enable jsx-a11y/media-has-caption */
  } else if (post.embed_video_url) {
    return (
      <div className="ratio ratio-16x9 mt-3">
        <iframe
          title="video embed"
          src={post.embed_video_url}
          sandbox="allow-same-origin allow-scripts"
          allowFullScreen
        ></iframe>
      </div>
    );
  }
}

function handleMediaLoadStart(e: Event) {
  const video = e.target as HTMLMediaElement;
  const volume = localStorage.getItem("video_volume_level");
  const muted = localStorage.getItem("video_muted");
  video.volume = Number(volume || 0);
  video.muted = muted !== "false";
  if (!(volume || muted)) {
    localStorage.setItem("video_muted", "true");
    localStorage.setItem("volume_level", "0");
  }
}

function handleMediaVolumeChange(e: Event) {
  const video = e.target as HTMLMediaElement;
  localStorage.setItem("video_muted", video.muted.toString());
  localStorage.setItem("video_volume_level", video.volume.toString());
}

function handleViewSource(i: PostListingCard) {
  i.setState({ viewSource: !i.state.viewSource });
}
