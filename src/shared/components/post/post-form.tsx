import { communityToChoice, fetchCommunities } from "@utils/app";
import {
  capitalizeFirstLetter,
  debounce,
  getIdFromString,
  getQueryString,
  validTitle,
  validURL,
} from "@utils/helpers";
import { isImage } from "@utils/media";
import { Choice, StringBoolean } from "@utils/types";
import autosize from "autosize";
import { Component, InfernoNode, createRef, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CreatePost,
  EditPost,
  GetSiteMetadataResponse,
  Language,
  LocalUserVoteDisplayMode,
  PostView,
  SearchResponse,
} from "lemmy-js-client";
import {
  archiveTodayUrl,
  ghostArchiveUrl,
  postMarkdownFieldCharacterLimit,
  relTags,
  trendingFetchLimit,
  webArchiveUrl,
} from "../../config";
import { PostFormParams } from "../../interfaces";
import { I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "../../toast";
import { Icon, Spinner } from "../common/icon";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SearchableSelect } from "../common/searchable-select";
import { PostListings } from "./post-listings";

const MAX_POST_TITLE_LENGTH = 200;

interface PostFormProps {
  post_view?: PostView; // If a post is given, that means this is an edit
  crossPosts?: PostView[];
  allLanguages: Language[];
  siteLanguages: number[];
  params?: PostFormParams;
  onCancel?(): void;
  onCreate?(form: CreatePost, bypassNavWarning: () => void): void;
  onEdit?(form: EditPost, bypassNavWarning: () => void): void;
  enableNsfw?: boolean;
  enableDownvotes?: boolean;
  voteDisplayMode: LocalUserVoteDisplayMode;
  selectedCommunityChoice?: Choice;
  onSelectCommunity?: (choice: Choice) => void;
  initialCommunities?: CommunityView[];
  loading: boolean;
  onTitleBlur?: (title: string) => void;
  onUrlBlur?: (url: string) => void;
  onBodyBlur?: (body: string) => void;
  onLanguageChange?: (languageId?: number) => void;
  onNsfwChange?: (nsfw: StringBoolean) => void;
  onThumbnailUrlBlur?: (thumbnailUrl: string) => void;
  onAltTextBlur?: (altText: string) => void;
}

interface PostFormState {
  form: {
    name?: string;
    url?: string;
    body?: string;
    nsfw?: boolean;
    language_id?: number;
    community_id?: number;
    honeypot?: string;
    custom_thumbnail?: string;
    alt_text?: string;
  };
  suggestedPostsRes: RequestState<SearchResponse>;
  metadataRes: RequestState<GetSiteMetadataResponse>;
  imageLoading: boolean;
  imageDeleteUrl: string;
  communitySearchLoading: boolean;
  communitySearchOptions: Choice[];
  previewMode: boolean;
  submitted: boolean;
  bypassNavWarning: boolean;
}

function handlePostSubmit(i: PostForm, event: any) {
  event.preventDefault();
  // Coerce empty url string to undefined
  if ((i.state.form.url ?? "") === "") {
    i.setState(s => ((s.form.url = undefined), s));
  }
  // This forces `props.loading` to become true, then false, to enable the
  // submit button again.
  i.setState({ submitted: true });

  const pForm = i.state.form;
  const pv = i.props.post_view;

  if (pv) {
    i.props.onEdit?.(
      {
        post_id: pv.post.id,
        name: pForm.name,
        url: pForm.url,
        body: pForm.body,
        nsfw: pForm.nsfw,
        language_id: pForm.language_id,
        custom_thumbnail: pForm.custom_thumbnail,
        alt_text: pForm.alt_text,
      },
      () => {
        i.setState({ bypassNavWarning: true });
      },
    );
  } else if (pForm.name && pForm.community_id) {
    i.props.onCreate?.(
      {
        name: pForm.name,
        community_id: pForm.community_id,
        url: pForm.url,
        body: pForm.body,
        nsfw: pForm.nsfw,
        language_id: pForm.language_id,
        honeypot: pForm.honeypot,
        custom_thumbnail: pForm.custom_thumbnail,
        alt_text: pForm.alt_text,
      },
      () => {
        i.setState({ bypassNavWarning: true });
      },
    );
  }
}

function copySuggestedTitle({
  i,
  suggestedTitle,
}: {
  i: PostForm;
  suggestedTitle?: string;
}) {
  if (suggestedTitle) {
    i.setState(
      s => (
        (s.form.name = suggestedTitle?.substring(0, MAX_POST_TITLE_LENGTH)), s
      ),
    );
    i.setState({ suggestedPostsRes: EMPTY_REQUEST });
    setTimeout(() => {
      if (i.postTitleRef.current) {
        autosize.update(i.postTitleRef.current);
      }
    }, 10);

    i.setState({ bypassNavWarning: true });
    i.props.onTitleBlur?.(suggestedTitle);
    i.setState({ bypassNavWarning: false });
  }
}

function handlePostUrlChange(i: PostForm, event: any) {
  const url = event.target.value;

  i.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      url,
    },
    imageDeleteUrl: "",
  }));

  i.fetchPageTitle();
}

function handlePostUrlBlur(i: PostForm, event: any) {
  i.setState({ bypassNavWarning: true });
  i.props.onUrlBlur?.(event.target.value);
  i.setState({ bypassNavWarning: false });
}

function handlePostNsfwChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.nsfw = event.target.checked), s));

  i.setState({ bypassNavWarning: true });
  i.props.onNsfwChange?.(event.target.checked ? "true" : "false");
  i.setState({ bypassNavWarning: false });
}

function handleHoneyPotChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.honeypot = event.target.value), s));
}

function handleAltTextChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.alt_text = event.target.value), s));
}

function handleAltTextBlur(i: PostForm, event: any) {
  i.setState({ bypassNavWarning: true });
  i.props.onAltTextBlur?.(event.target.value);
  i.setState({ bypassNavWarning: false });
}

function handleCustomThumbnailChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.custom_thumbnail = event.target.value), s));
}

function handleCustomThumbnailBlur(i: PostForm, event: any) {
  i.setState({ bypassNavWarning: true });
  i.props.onThumbnailUrlBlur?.(event.target.value);
  i.setState({ bypassNavWarning: false });
}

function handleCancel(i: PostForm) {
  i.props.onCancel?.();
}

function handleImageUploadPaste(i: PostForm, event: any) {
  const image = event.clipboardData.files[0];
  if (image) {
    handleImageUpload(i, image);
  }
}

function handleImageUpload(i: PostForm, event: any) {
  let file: any;
  if (event.target) {
    event.preventDefault();
    file = event.target.files[0];
  } else {
    file = event;
  }

  i.setState({ imageLoading: true });

  HttpService.client.uploadImage({ image: file }).then(res => {
    if (res.state === "success") {
      if (res.data.msg === "ok") {
        i.state.form.url = res.data.url;
        i.setState({
          imageLoading: false,
          imageDeleteUrl: res.data.delete_url as string,
        });
      } else if (res.data.msg === "too_large") {
        toast(I18NextService.i18n.t("upload_too_large"), "danger");
      } else {
        toast(JSON.stringify(res), "danger");
      }
    } else if (res.state === "failed") {
      console.error(res.err.message);
      toast(res.err.message, "danger");
      i.setState({ imageLoading: false });
    }
  });
}

function handlePostNameChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.name = event.target.value), s));
  i.fetchSimilarPosts();
}

function handlePostNameBlur(i: PostForm, event: any) {
  i.setState({ bypassNavWarning: true });
  i.props.onTitleBlur?.(event.target.value);
  i.setState({ bypassNavWarning: false });
}

function handleImageDelete(i: PostForm) {
  const { imageDeleteUrl } = i.state;

  fetch(imageDeleteUrl);

  i.setState(prev => ({
    ...prev,
    imageDeleteUrl: "",
    imageLoading: false,
    form: {
      ...prev.form,
      url: "",
    },
  }));
}

export class PostForm extends Component<PostFormProps, PostFormState> {
  state: PostFormState = {
    suggestedPostsRes: EMPTY_REQUEST,
    metadataRes: EMPTY_REQUEST,
    form: {},
    imageLoading: false,
    imageDeleteUrl: "",
    communitySearchLoading: false,
    previewMode: false,
    communitySearchOptions: [],
    submitted: false,
    bypassNavWarning: false,
  };

  postTitleRef = createRef<HTMLTextAreaElement>();

  constructor(props: PostFormProps, context: any) {
    super(props, context);
    this.fetchSimilarPosts = debounce(this.fetchSimilarPosts.bind(this));
    this.fetchPageTitle = debounce(this.fetchPageTitle.bind(this));
    this.handlePostBodyChange = this.handlePostBodyChange.bind(this);
    this.handlePostBodyBlur = this.handlePostBodyBlur.bind(this);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
    this.handleCommunitySelect = this.handleCommunitySelect.bind(this);

    const { post_view, selectedCommunityChoice, params } = this.props;

    // Means its an edit
    if (post_view) {
      this.state = {
        ...this.state,
        form: {
          body: post_view.post.body,
          name: post_view.post.name,
          community_id: post_view.community.id,
          url: post_view.post.url,
          nsfw: post_view.post.nsfw,
          language_id: post_view.post.language_id,
          custom_thumbnail: post_view.post.thumbnail_url,
          alt_text: post_view.post.alt_text,
        },
      };
    } else if (selectedCommunityChoice) {
      this.state = {
        ...this.state,
        form: {
          ...this.state.form,
          community_id: getIdFromString(selectedCommunityChoice.value),
        },
        communitySearchOptions: [selectedCommunityChoice].concat(
          (this.props.initialCommunities?.map(communityToChoice) ?? []).filter(
            option => option.value !== selectedCommunityChoice.value,
          ),
        ),
      };
    } else {
      this.state = {
        ...this.state,
        communitySearchOptions:
          this.props.initialCommunities?.map(communityToChoice) ?? [],
      };
    }

    if (params) {
      this.state = {
        ...this.state,
        form: {
          ...this.state.form,
          ...params,
        },
      };
    }

    if (this.state.form.url) {
      this.fetchPageTitle();
    }
  }

  componentDidMount() {
    if (this.postTitleRef.current) {
      autosize(this.postTitleRef.current);
    }
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostFormProps>,
  ): void {
    if (
      this.props.selectedCommunityChoice?.value !==
        nextProps.selectedCommunityChoice?.value &&
      nextProps.selectedCommunityChoice
    ) {
      this.setState(
        s => (
          (s.form.community_id = getIdFromString(
            nextProps.selectedCommunityChoice?.value,
          )),
          s
        ),
      );
      this.setState({
        communitySearchOptions: [nextProps.selectedCommunityChoice].concat(
          (nextProps.initialCommunities?.map(communityToChoice) ?? []).filter(
            option => option.value !== nextProps.selectedCommunityChoice?.value,
          ),
        ),
      });
    }
    if (
      !this.props.initialCommunities?.length &&
      nextProps.initialCommunities?.length
    ) {
      this.setState({
        communitySearchOptions:
          nextProps.initialCommunities?.map(communityToChoice) ?? [],
      });
    }
    if (this.props.loading && !nextProps.loading) {
      this.setState({ submitted: false, bypassNavWarning: false });
    }
  }

  render() {
    const firstLang = this.state.form.language_id;
    const selectedLangs = firstLang ? Array.of(firstLang) : undefined;

    const url = this.state.form.url;

    return (
      <form className="post-form" onSubmit={linkEvent(this, handlePostSubmit)}>
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !!(
              this.state.form.name ||
              this.state.form.url ||
              this.state.form.body
            ) && !this.state.bypassNavWarning
          }
        />
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="post-title">
            {I18NextService.i18n.t("title")}
          </label>
          <div className="col-sm-10">
            <textarea
              value={this.state.form.name}
              id="post-title"
              onInput={linkEvent(this, handlePostNameChange)}
              onBlur={linkEvent(this, handlePostNameBlur)}
              className={`form-control ${
                !validTitle(this.state.form.name) && "is-invalid"
              }`}
              required
              rows={1}
              minLength={3}
              maxLength={MAX_POST_TITLE_LENGTH}
              ref={this.postTitleRef}
            />
            {!validTitle(this.state.form.name) && (
              <div className="invalid-feedback">
                {I18NextService.i18n.t("invalid_post_title")}
              </div>
            )}
            {this.renderSuggestedPosts()}
          </div>
        </div>

        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="post-url">
            {I18NextService.i18n.t("url")}
          </label>
          <div className="col-sm-10">
            <input
              type="url"
              placeholder={I18NextService.i18n.t("optional")}
              id="post-url"
              className="form-control mb-3"
              value={url}
              onInput={linkEvent(this, handlePostUrlChange)}
              onBlur={linkEvent(this, handlePostUrlBlur)}
              onPaste={linkEvent(this, handleImageUploadPaste)}
            />
            {this.renderSuggestedTitleCopy()}
            {url && validURL(url) && (
              <div>
                <a
                  href={`${webArchiveUrl}/save/${encodeURIComponent(url)}`}
                  className="me-2 d-inline-block float-right text-muted small fw-bold"
                  rel={relTags}
                >
                  archive.org {I18NextService.i18n.t("archive_link")}
                </a>
                <a
                  href={`${ghostArchiveUrl}/search${getQueryString({ term: url })}`}
                  className="me-2 d-inline-block float-right text-muted small fw-bold"
                  rel={relTags}
                >
                  ghostarchive.org {I18NextService.i18n.t("archive_link")}
                </a>
                <a
                  href={`${archiveTodayUrl}/${getQueryString({ run: "1", url })}`}
                  className="me-2 d-inline-block float-right text-muted small fw-bold"
                  rel={relTags}
                >
                  archive.today {I18NextService.i18n.t("archive_link")}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 row">
          <label htmlFor="file-upload" className={"col-sm-2 col-form-label"}>
            {capitalizeFirstLetter(I18NextService.i18n.t("image"))}
            <Icon icon="image" classes="icon-inline ms-1" />
          </label>
          <div className="col-sm-10">
            <input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              name="file"
              className="small col-sm-10 form-control"
              disabled={!UserService.Instance.myUserInfo}
              onChange={linkEvent(this, handleImageUpload)}
            />
            {this.state.imageLoading && <Spinner />}
            {url && isImage(url) && (
              <img src={url} className="img-fluid mt-2" alt="" />
            )}
            {this.state.imageDeleteUrl && (
              <button
                className="btn btn-danger btn-sm mt-2"
                onClick={linkEvent(this, handleImageDelete)}
              >
                <Icon icon="x" classes="icon-inline me-1" />
                {capitalizeFirstLetter(I18NextService.i18n.t("delete"))}
              </button>
            )}
          </div>

          {this.props.crossPosts && this.props.crossPosts.length > 0 && (
            <>
              <div className="my-1 text-muted small fw-bold">
                {I18NextService.i18n.t("cross_posts")}
              </div>
              <PostListings
                showCommunity
                posts={this.props.crossPosts}
                enableDownvotes={this.props.enableDownvotes}
                voteDisplayMode={this.props.voteDisplayMode}
                enableNsfw={this.props.enableNsfw}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                viewOnly
                // All of these are unused, since its view only
                onPostEdit={async () => EMPTY_REQUEST}
                onPostVote={async () => EMPTY_REQUEST}
                onPostReport={async () => {}}
                onBlockPerson={async () => {}}
                onLockPost={async () => {}}
                onDeletePost={async () => {}}
                onRemovePost={async () => {}}
                onSavePost={async () => {}}
                onFeaturePost={async () => {}}
                onPurgePerson={async () => {}}
                onPurgePost={async () => {}}
                onBanPersonFromCommunity={async () => {}}
                onBanPerson={async () => {}}
                onAddModToCommunity={async () => {}}
                onAddAdmin={async () => {}}
                onTransferCommunity={async () => {}}
                onMarkPostAsRead={async () => {}}
                onHidePost={async () => {}}
              />
            </>
          )}
        </div>

        {!isImage(url || "") && (
          <div className="mb-3 row">
            <label
              className="col-sm-2 col-form-label"
              htmlFor="post-custom-thumbnail"
            >
              {I18NextService.i18n.t("custom_thumbnail_url")}
            </label>
            <div className="col-sm-10">
              <input
                type="url"
                id="post-custom-thumbnail"
                placeholder={I18NextService.i18n.t("optional")}
                className="form-control mb-3"
                value={this.state.form.custom_thumbnail}
                onInput={linkEvent(this, handleCustomThumbnailChange)}
                onBlur={linkEvent(this, handleCustomThumbnailBlur)}
              />
            </div>
          </div>
        )}

        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("body")}
          </label>
          <div className="col-sm-10">
            <MarkdownTextArea
              initialContent={this.state.form.body}
              placeholder={I18NextService.i18n.t("optional")}
              onContentChange={this.handlePostBodyChange}
              onContentBlur={this.handlePostBodyBlur}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              hideNavigationWarnings
              maxLength={postMarkdownFieldCharacterLimit}
            />
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
          selectedLanguageIds={selectedLangs}
          multiple={false}
          onChange={this.handleLanguageChange}
        />
        {url && isImage(url) && (
          <div className="mb-3 row">
            <label className="col-sm-2 col-form-label" htmlFor="post-alt-text">
              {I18NextService.i18n.t("column_alttext")}
            </label>
            <div className="col-sm-10">
              <input
                autoComplete="false"
                name="alt_text"
                placeholder={I18NextService.i18n.t("optional")}
                type="text"
                className="form-control"
                id="post-alt-text"
                value={this.state.form.alt_text}
                onInput={linkEvent(this, handleAltTextChange)}
                onBlur={linkEvent(this, handleAltTextBlur)}
              />
            </div>
          </div>
        )}
        {!this.props.post_view && (
          <div className="mb-3 row">
            <label className="col-sm-2 col-form-label" htmlFor="post-community">
              {I18NextService.i18n.t("community")}
            </label>
            <div className="col-sm-10">
              <SearchableSelect
                id="post-community"
                value={this.state.form.community_id}
                options={[
                  {
                    label: I18NextService.i18n.t("select_a_community"),
                    value: "",
                    disabled: true,
                  } as Choice,
                ].concat(this.state.communitySearchOptions)}
                loading={this.state.communitySearchLoading}
                onChange={this.handleCommunitySelect}
                onSearch={this.handleCommunitySearch}
              />
            </div>
          </div>
        )}
        {this.props.enableNsfw && (
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              id="post-nsfw"
              type="checkbox"
              checked={this.state.form.nsfw}
              onChange={linkEvent(this, handlePostNsfwChange)}
            />
            <label className="form-check-label" htmlFor="post-nsfw">
              {I18NextService.i18n.t("nsfw")}
            </label>
          </div>
        )}
        <input
          tabIndex={-1}
          autoComplete="false"
          name="a_password"
          type="text"
          className="form-control honeypot"
          id="register-honey"
          value={this.state.form.honeypot}
          onInput={linkEvent(this, handleHoneyPotChange)}
        />
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button
              disabled={
                !this.state.form.community_id ||
                this.props.loading ||
                this.state.submitted
              }
              type="submit"
              className="btn btn-secondary me-2"
            >
              {this.props.loading ? (
                <Spinner />
              ) : this.props.post_view ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
            {this.props.post_view && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, handleCancel)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  renderSuggestedTitleCopy() {
    switch (this.state.metadataRes.state) {
      case "loading":
        return <Spinner />;
      case "success": {
        // Clean up the title of any extra whitespace and replace &nbsp; with a space
        const suggestedTitle = this.state.metadataRes.data.metadata.title
          ?.trim()
          .replace(/\s+/g, " ");
        return (
          suggestedTitle && (
            <button
              type="button"
              className="mt-1 small border-0 bg-transparent p-0 d-block text-muted fw-bold pointer"
              onClick={linkEvent(
                { i: this, suggestedTitle },
                copySuggestedTitle,
              )}
            >
              {I18NextService.i18n.t("copy_suggested_title", { title: "" })}{" "}
              {suggestedTitle}
            </button>
          )
        );
      }
    }
  }

  renderSuggestedPosts() {
    switch (this.state.suggestedPostsRes.state) {
      case "loading":
        return <Spinner />;
      case "success": {
        const suggestedPosts = this.state.suggestedPostsRes.data.posts;

        return (
          suggestedPosts &&
          suggestedPosts.length > 0 && (
            <>
              <div className="my-1 text-muted small fw-bold">
                {I18NextService.i18n.t("related_posts")}
              </div>
              <PostListings
                showCommunity
                posts={suggestedPosts}
                enableDownvotes={this.props.enableDownvotes}
                voteDisplayMode={this.props.voteDisplayMode}
                enableNsfw={this.props.enableNsfw}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                viewOnly
                // All of these are unused, since its view only
                onPostEdit={async () => EMPTY_REQUEST}
                onPostVote={async () => EMPTY_REQUEST}
                onPostReport={async () => {}}
                onBlockPerson={async () => {}}
                onLockPost={async () => {}}
                onDeletePost={async () => {}}
                onRemovePost={async () => {}}
                onSavePost={async () => {}}
                onFeaturePost={async () => {}}
                onPurgePerson={async () => {}}
                onPurgePost={async () => {}}
                onBanPersonFromCommunity={async () => {}}
                onBanPerson={async () => {}}
                onAddModToCommunity={async () => {}}
                onAddAdmin={async () => {}}
                onTransferCommunity={async () => {}}
                onMarkPostAsRead={async () => {}}
                onHidePost={async () => {}}
              />
            </>
          )
        );
      }
    }
  }

  async fetchPageTitle() {
    const url = this.state.form.url;
    if (url && validURL(url)) {
      this.setState({ metadataRes: LOADING_REQUEST });
      this.setState({
        metadataRes: await HttpService.client.getSiteMetadata({ url }),
      });
    }
  }

  async fetchSimilarPosts() {
    const q = this.state.form.name;
    if (q && q !== "") {
      this.setState({ suggestedPostsRes: LOADING_REQUEST });
      this.setState({
        suggestedPostsRes: await HttpService.client.search({
          q,
          type_: "Posts",
          sort: "TopAll",
          listing_type: "All",
          community_id: this.state.form.community_id,
          page: 1,
          limit: trendingFetchLimit,
        }),
      });
    }
  }

  handlePostBodyChange(val: string) {
    this.setState(s => ((s.form.body = val), s));
  }

  handlePostBodyBlur(val: string) {
    this.setState({ bypassNavWarning: true });
    this.props.onBodyBlur?.(val);
    this.setState({ bypassNavWarning: false });
  }

  handleLanguageChange(val: number[]) {
    this.setState(s => ((s.form.language_id = val.at(0)), s));

    this.setState({ bypassNavWarning: true });
    this.props.onLanguageChange?.(val.at(0));
    this.setState({ bypassNavWarning: false });
  }

  handleCommunitySearch = debounce(async (text: string) => {
    const { selectedCommunityChoice } = this.props;
    this.setState({ communitySearchLoading: true });

    const newOptions: Choice[] = [];

    if (selectedCommunityChoice) {
      newOptions.push(selectedCommunityChoice);
    }

    if (text.length > 0) {
      newOptions.push(...(await fetchCommunities(text)).map(communityToChoice));

      this.setState({
        communitySearchOptions: newOptions,
      });
    }

    this.setState({
      communitySearchLoading: false,
    });
  });

  handleCommunitySelect(choice: Choice) {
    this.setState({ bypassNavWarning: true });
    this.props.onSelectCommunity?.(choice);
    this.setState({ bypassNavWarning: false });
  }
}
