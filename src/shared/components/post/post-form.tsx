import {
  communityToChoice,
  userNotLoggedInOrBanned,
  fetchCommunities,
  filterCommunitySelection,
} from "@utils/app";
import {
  capitalizeFirstLetter,
  debounce,
  getIdFromString,
  getQueryString,
  validTitle,
  validURL,
} from "@utils/helpers";
import { isImage, isMedia } from "@utils/media";
import { Choice, StringBoolean } from "@utils/types";
import autosize from "autosize";
import {
  ClipboardEvent,
  Component,
  FormEvent,
  InfernoNode,
  createRef,
} from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CreatePost,
  EditPost,
  GetSiteMetadataResponse,
  Language,
  LanguageId,
  LocalSite,
  MyUserInfo,
  PersonView,
  PostView,
  SearchResponse,
  CommunityTag,
  CommunityTagId,
  UploadImageResponse,
} from "lemmy-js-client";
import {
  archiveTodayUrl,
  ghostArchiveUrl,
  postMarkdownFieldCharacterLimit,
  relTags,
  webArchiveUrl,
} from "@utils/config";
import { PostFormParams } from "@utils/types";
import { I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { Icon, Spinner } from "../common/icon";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SearchableSelect } from "../common/searchable-select";
import { PostListings } from "./post-listings";
import { isBrowser } from "@utils/browser";
import { isMagnetLink, extractMagnetLinkDownloadName } from "@utils/media";
import {
  getUnixTimeLemmy,
  getUnixTime,
  unixTimeToLocalDateStr,
} from "@utils/date";
import { communityTagName } from "@components/community/community-tag";

const MAX_POST_TITLE_LENGTH = 200;

interface PostFormProps {
  post_view?: PostView; // If a post is given, that means this is an edit
  crossPosts?: PostView[];
  allLanguages: Language[];
  siteLanguages: number[];
  params?: PostFormParams;
  enableNsfw: boolean;
  showAdultConsentModal: boolean;
  selectedCommunityChoice?: Choice;
  selectedCommunityTags?: CommunityTag[];
  isNsfwCommunity: boolean;
  initialCommunities?: CommunityView[];
  loading: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  onCancel?: () => void;
  onCreate?: (form: CreatePost, bypassNavWarning: () => void) => void;
  onEdit?: (form: EditPost, bypassNavWarning: () => void) => void;
  onSelectCommunity?: (choice: Choice) => void;
  onTitleBlur?: (title: string) => void;
  onUrlBlur?: (url: string) => void;
  onBodyBlur?: (body: string) => void;
  onLanguageChange?: (languageId?: number) => void;
  onNsfwChange?: (nsfw: StringBoolean) => void;
  onThumbnailUrlBlur?: (thumbnailUrl: string) => void;
  onAltTextBlur?: (altText: string) => void;
  onCopySuggestedTitle?: (url: string, title: string) => void;
}

interface PostFormState {
  form: {
    name?: string;
    url?: string;
    body?: string;
    nsfw?: boolean;
    language_id?: LanguageId;
    community_id?: number;
    honeypot?: string;
    custom_thumbnail?: string;
    alt_text?: string;
    tags?: CommunityTagId[];
    // Javascript treats this field as a string, that can't have timezone info.
    scheduled_publish_time_at?: string;
  };
  suggestedPostsRes: RequestState<SearchResponse>;
  metadataRes: RequestState<GetSiteMetadataResponse>;
  imageLoading: boolean;
  uploadedImage?: UploadImageResponse;
  communitySearchLoading: boolean;
  communitySearchOptions: Choice[];
  previewMode: boolean;
  bypassNavWarning: boolean;
}

export class PostForm extends Component<PostFormProps, PostFormState> {
  state: PostFormState = {
    suggestedPostsRes: EMPTY_REQUEST,
    metadataRes: EMPTY_REQUEST,
    form: {},
    imageLoading: false,
    uploadedImage: undefined,
    communitySearchLoading: false,
    previewMode: false,
    communitySearchOptions: [],
    bypassNavWarning: false,
  };

  postTitleRef = createRef<HTMLTextAreaElement>();

  constructor(props: PostFormProps, context: any) {
    super(props, context);

    const { post_view, selectedCommunityChoice, params } = this.props;
    // Means its an edit
    if (post_view) {
      const unix = getUnixTime(post_view.post.scheduled_publish_time_at);
      const scheduled_publish_time_at = unixTimeToLocalDateStr(unix);
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
          tags: post_view.tags.map(t => t.id),
          scheduled_publish_time_at,
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
  }

  async componentWillMount() {
    if (this.state.form.url && isBrowser()) {
      await fetchPageTitle(this);
    }
  }

  componentDidMount() {
    if (this.postTitleRef.current) {
      autosize(this.postTitleRef.current);
    }
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostFormProps>,
  ) {
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
      this.setState({ bypassNavWarning: false });
    }
    if (this.props.params !== nextProps.params && nextProps.params) {
      const params = nextProps.params;
      for (const k in params) {
        if (this.props.params?.[k] !== params[k]) {
          this.setState(s => ({ form: { ...s.form, [k]: params[k] } }));
        }
      }
    }
  }

  render() {
    const firstLang = this.state.form.language_id;
    const selectedLangs = firstLang ? Array.of(firstLang) : undefined;

    const url = this.state.form.url;

    return (
      <form className="post-form" onSubmit={e => handlePostSubmit(this, e)}>
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
              onInput={e => handlePostNameChange(this, e)}
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
              onInput={e => handlePostUrlChange(this, e)}
              onPaste={e => handleImageUploadPaste(this, e)}
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
              disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
              onChange={e => handleImageUpload(this, e)}
            />
            {this.state.imageLoading && <Spinner />}
            {url && isImage(url) && (
              <img src={url} className="img-fluid mt-2" alt="" />
            )}
            {this.state.uploadedImage && (
              <button
                className="btn btn-danger btn-sm mt-2"
                onClick={() => handleImageDelete(this)}
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
                viewOnly
                showMarkRead="hide"
                posts={this.props.crossPosts}
                showCrossPosts="show_separately"
                enableNsfw={this.props.enableNsfw}
                showAdultConsentModal={this.props.showAdultConsentModal}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                myUserInfo={this.props.myUserInfo}
                localSite={this.props.localSite}
                admins={this.props.admins}
                postListingMode="list"
                voteLoading={undefined}
                // All of these are unused, since its view only
                onPostEdit={() => EMPTY_REQUEST}
                onPostVote={() => EMPTY_REQUEST}
                onPostReport={() => {}}
                onBlockPerson={() => {}}
                onBlockCommunity={() => {}}
                onLockPost={() => {}}
                onDeletePost={() => {}}
                onRemovePost={() => {}}
                onSavePost={() => {}}
                onFeaturePost={() => {}}
                onPurgePerson={() => {}}
                onPurgePost={() => {}}
                onBanPersonFromCommunity={() => {}}
                onBanPerson={() => {}}
                onAddModToCommunity={() => {}}
                onAddAdmin={() => {}}
                onTransferCommunity={() => {}}
                onMarkPostAsRead={() => {}}
                onHidePost={() => {}}
                onPersonNote={() => {}}
                onScrollIntoCommentsClick={() => {}}
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
                onInput={e => handleCustomThumbnailChange(this, e)}
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
              onContentChange={val => handlePostBodyChange(this, val)}
              onContentBlur={val => handlePostBodyBlur(this, val)}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              hideNavigationWarnings
              maxLength={postMarkdownFieldCharacterLimit}
              myUserInfo={this.props.myUserInfo}
            />
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
          selectedLanguageIds={selectedLangs}
          multiple={false}
          onChange={val => handleLanguageChange(this, val)}
          myUserInfo={this.props.myUserInfo}
        />
        {url && isMedia(url) && (
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
                onInput={e => handleAltTextChange(this, e)}
              />
            </div>
          </div>
        )}
        {!this.props.post_view && (
          <div className="mb-3 row align-items-center">
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
                onChange={choice => handleCommunitySelect(this, choice)}
                onSearch={text => handleCommunitySearch(this, text)}
              />
            </div>
          </div>
        )}
        {this.props.enableNsfw && !this.props.isNsfwCommunity && (
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              id="post-nsfw"
              type="checkbox"
              checked={this.state.form.nsfw}
              onChange={e => handlePostNsfwChange(this, e)}
            />
            <label className="form-check-label" htmlFor="post-nsfw">
              {I18NextService.i18n.t("nsfw")}
            </label>
          </div>
        )}
        {!this.props.post_view && (
          <div className="mb-3 row">
            <label className="col-sm-2 col-form-label" htmlFor="post-schedule">
              {I18NextService.i18n.t("scheduled_publish_time")}
            </label>
            <div className="col-sm-10">
              <input
                type="datetime-local"
                value={this.state.form.scheduled_publish_time_at}
                min={unixTimeToLocalDateStr(Date.now())}
                id="post-schedule"
                className="form-control mb-3"
                onInput={e => handlePostScheduleChange(this, e)}
              />
            </div>
          </div>
        )}
        {this.props.selectedCommunityTags &&
          this.props.selectedCommunityTags.length > 0 && (
            <div className="mb-3 row">
              <label className="col-sm-2 col-form-label" htmlFor="post-tags">
                {I18NextService.i18n.t("tags")}
              </label>
              <div className="col-sm-10">
                {/** TODO This should use an abstracted FilterChipMultiDropdown **/}
                <select
                  id="post-tags"
                  className="form-select"
                  multiple
                  aria-label={I18NextService.i18n.t("tags")}
                  onChange={e => handleTagsChange(this, e)}
                >
                  {this.props.selectedCommunityTags.map(tag => (
                    <option
                      key={tag.id}
                      value={tag.id}
                      selected={(this.state.form.tags ?? []).includes(tag.id)}
                    >
                      {communityTagName(tag)}
                    </option>
                  ))}
                </select>
              </div>
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
          onInput={e => handleHoneyPotChange(this, e)}
        />
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button
              disabled={!this.state.form.community_id || this.props.loading}
              type="submit"
              className="btn btn-light border-light-subtle me-2"
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
                className="btn btn-light border-light-subtle"
                onClick={() => handleCancel(this)}
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
              onClick={() => handleCopySuggestedTitle(this, suggestedTitle)}
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
        const suggestedPosts = this.state.suggestedPostsRes.data.search.filter(
          r => r.type_ === "post",
        );

        return (
          suggestedPosts &&
          suggestedPosts.length > 0 && (
            <>
              <div className="my-1 text-muted small fw-bold">
                {I18NextService.i18n.t("related_posts")}
              </div>
              <PostListings
                showCommunity
                viewOnly
                showMarkRead="hide"
                posts={suggestedPosts}
                showCrossPosts="show_separately"
                enableNsfw={this.props.enableNsfw}
                showAdultConsentModal={this.props.showAdultConsentModal}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                myUserInfo={this.props.myUserInfo}
                localSite={this.props.localSite}
                admins={this.props.admins}
                postListingMode="list"
                voteLoading={undefined}
                // All of these are unused, since its view only
                onPostEdit={() => EMPTY_REQUEST}
                onPostVote={() => EMPTY_REQUEST}
                onPostReport={() => {}}
                onBlockPerson={() => {}}
                onBlockCommunity={() => {}}
                onLockPost={() => {}}
                onDeletePost={() => {}}
                onRemovePost={() => {}}
                onSavePost={() => {}}
                onFeaturePost={() => {}}
                onPurgePerson={() => {}}
                onPurgePost={() => {}}
                onBanPersonFromCommunity={() => {}}
                onBanPerson={() => {}}
                onAddModToCommunity={() => {}}
                onAddAdmin={() => {}}
                onTransferCommunity={() => {}}
                onMarkPostAsRead={() => {}}
                onHidePost={() => {}}
                onPersonNote={() => {}}
                onScrollIntoCommentsClick={() => {}}
              />
            </>
          )
        );
      }
    }
  }
}

const fetchPageTitle = debounce(async (i: PostForm) => {
  const url = i.state.form.url;
  if (url && validURL(url)) {
    // If its a magnet link, fill in the download name
    if (isMagnetLink(url)) {
      const title = extractMagnetLinkDownloadName(url);
      if (title) {
        i.setState({
          metadataRes: {
            state: "success",
            data: {
              metadata: { title },
            },
          },
        });
      }
    } else {
      i.setState({ metadataRes: LOADING_REQUEST });
      i.setState({
        metadataRes: await HttpService.client.getSiteMetadata({ url }),
      });
    }
  }
});

const fetchSimilarPosts = debounce(async (i: PostForm) => {
  const q = i.state.form.name;
  if (q && q !== "") {
    i.setState({ suggestedPostsRes: LOADING_REQUEST });
    i.setState({
      suggestedPostsRes: await HttpService.client.search({
        q,
        type_: "posts",
        sort: "top",
        listing_type: "all",
        community_id: i.state.form.community_id,
      }),
    });
  }
});

function updateUrl(i: PostForm, update: () => void) {
  i.setState({ bypassNavWarning: true });
  update();
  i.setState({ bypassNavWarning: false });
}

function handlePostSubmit(i: PostForm, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  // Coerce empty url string to undefined
  if ((i.state.form.url ?? "") === "") {
    i.setState(s => ((s.form.url = undefined), s));
  }

  const pForm = i.state.form;
  const pv = i.props.post_view;
  const scheduled_publish_time_at = getUnixTimeLemmy(
    pForm.scheduled_publish_time_at,
  );

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
        tags: pForm.tags,
        scheduled_publish_time_at,
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
        tags: pForm.tags,
        scheduled_publish_time_at,
      },
      () => {
        i.setState({ bypassNavWarning: true });
      },
    );
  }
}
function handlePostBodyChange(i: PostForm, val: string) {
  i.setState(s => ((s.form.body = val), s));
}

function handlePostBodyBlur(i: PostForm, val: string) {
  updateUrl(i, () => i.props.onBodyBlur?.(val));
}

function handleLanguageChange(i: PostForm, val: number[]) {
  i.setState(s => ((s.form.language_id = val.at(0)), s));
  updateUrl(i, () => i.props.onLanguageChange?.(val.at(0)));
}

const handleCommunitySearch = debounce(async (i: PostForm, text: string) => {
  const { selectedCommunityChoice } = i.props;
  i.setState({ communitySearchLoading: true });

  const newOptions: Choice[] = [];

  if (selectedCommunityChoice) {
    newOptions.push(selectedCommunityChoice);
  }

  if (text.length > 0) {
    newOptions.push(
      ...filterCommunitySelection(
        await fetchCommunities(text),
        i.props.myUserInfo,
      ).map(communityToChoice),
    );

    i.setState({
      communitySearchOptions: newOptions,
    });
  }

  i.setState({
    communitySearchLoading: false,
  });
});

function handleCommunitySelect(i: PostForm, choice: Choice) {
  updateUrl(i, () => i.props.onSelectCommunity?.(choice));
}

async function handleCopySuggestedTitle(i: PostForm, suggestedTitle?: string) {
  if (suggestedTitle) {
    i.setState(
      s => (
        (s.form.name = suggestedTitle?.substring(0, MAX_POST_TITLE_LENGTH)),
        s
      ),
    );
    await fetchSimilarPosts(i);
    i.setState({ suggestedPostsRes: EMPTY_REQUEST });
    setTimeout(() => {
      if (i.postTitleRef.current) {
        autosize.update(i.postTitleRef.current);
      }
    }, 10);

    updateUrl(i, () =>
      i.props.onCopySuggestedTitle?.(i.state.form.url!, suggestedTitle),
    );
  }
}

async function handlePostUrlChange(
  i: PostForm,
  event: FormEvent<HTMLInputElement>,
) {
  const url = event.target.value;

  i.setState(prev => ({
    ...prev,
    form: {
      ...prev.form,
      url,
    },
    uploadedImage: undefined,
  }));

  await fetchPageTitle(i);
}

function handlePostNsfwChange(i: PostForm, event: FormEvent<HTMLInputElement>) {
  i.setState(s => ((s.form.nsfw = event.target.checked), s));

  updateUrl(i, () =>
    i.props.onNsfwChange?.(event.target.checked ? "true" : "false"),
  );
}

function handlePostScheduleChange(
  i: PostForm,
  event: FormEvent<HTMLInputElement>,
) {
  const scheduled_publish_time = event.target.value;

  i.setState(
    s => ((s.form.scheduled_publish_time_at = scheduled_publish_time), s),
  );
}

function handleHoneyPotChange(i: PostForm, event: FormEvent<HTMLInputElement>) {
  i.setState(s => ((s.form.honeypot = event.target.value), s));
}

function handleAltTextChange(i: PostForm, event: FormEvent<HTMLInputElement>) {
  i.setState(s => ((s.form.alt_text = event.target.value), s));
}

function handleCustomThumbnailChange(
  i: PostForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.custom_thumbnail = event.target.value), s));
}

function handleCancel(i: PostForm) {
  i.props.onCancel?.();
}

async function handleImageUploadPaste(
  i: PostForm,
  event: ClipboardEvent<HTMLInputElement>,
) {
  const image = event.clipboardData?.files[0];
  if (image) {
    await handleImageUpload(i, image);
  }
}

async function handleImageUpload(
  i: PostForm,
  event: File | FormEvent<HTMLInputElement>,
) {
  let file: any;
  if (event instanceof Event) {
    event.preventDefault();
    file = event.target.files?.[0];
  } else {
    file = event;
  }

  i.setState({ imageLoading: true });

  await HttpService.client.uploadImage({ image: file }).then(res => {
    if (res.state === "success") {
      i.state.form.url = res.data.image_url;
      i.setState({
        imageLoading: false,
        uploadedImage: res.data,
      });
    } else if (res.state === "failed") {
      console.error(res.err.name);
      toast(res.err.name, "danger");
      i.setState({ imageLoading: false });
    }
  });
}

function handleTagsChange(i: PostForm, event: FormEvent<HTMLSelectElement>) {
  const options: HTMLOptionElement[] = Array.from(event.target.options);
  const tagIdsSelected: number[] = options
    .filter(o => o.selected)
    .map(o => Number(o.value));

  i.setState(s => ((s.form.tags = tagIdsSelected), s));
}

async function handlePostNameChange(
  i: PostForm,
  event: FormEvent<HTMLTextAreaElement>,
) {
  i.setState(s => ((s.form.name = event.target.value), s));
  await fetchSimilarPosts(i);
}

async function handleImageDelete(i: PostForm) {
  const { uploadedImage } = i.state;

  if (uploadedImage) {
    await HttpService.client.deleteMedia({
      filename: uploadedImage.filename,
    });
  }

  i.setState(prev => ({
    ...prev,
    uploadedImage: undefined,
    imageLoading: false,
    form: {
      ...prev.form,
      url: "",
    },
  }));
}
