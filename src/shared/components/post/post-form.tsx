import {
  communityToChoice,
  fetchCommunities,
  myAuth,
  myAuthRequired,
} from "@utils/app";
import {
  capitalizeFirstLetter,
  debounce,
  getIdFromString,
  validTitle,
  validURL,
} from "@utils/helpers";
import { isImage } from "@utils/media";
import { Choice } from "@utils/types";
import autosize from "autosize";
import { Component, InfernoNode, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CreatePost,
  EditPost,
  GetSiteMetadataResponse,
  Language,
  PostView,
  SearchResponse,
} from "lemmy-js-client";
import {
  archiveTodayUrl,
  ghostArchiveUrl,
  relTags,
  trendingFetchLimit,
  webArchiveUrl,
} from "../../config";
import { PostFormParams } from "../../interfaces";
import { I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { setupTippy } from "../../tippy";
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
  onCreate?(form: CreatePost): void;
  onEdit?(form: EditPost): void;
  enableNsfw?: boolean;
  enableDownvotes?: boolean;
  selectedCommunityChoice?: Choice;
  onSelectCommunity?: (choice: Choice) => void;
  initialCommunities?: CommunityView[];
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
  };
  loading: boolean;
  suggestedPostsRes: RequestState<SearchResponse>;
  metadataRes: RequestState<GetSiteMetadataResponse>;
  imageLoading: boolean;
  imageDeleteUrl: string;
  communitySearchLoading: boolean;
  communitySearchOptions: Choice[];
  previewMode: boolean;
  submitted: boolean;
}

function handlePostSubmit(i: PostForm, event: any) {
  event.preventDefault();
  // Coerce empty url string to undefined
  if ((i.state.form.url ?? "") === "") {
    i.setState(s => ((s.form.url = undefined), s));
  }
  i.setState({ loading: true, submitted: true });
  const auth = myAuthRequired();

  const pForm = i.state.form;
  const pv = i.props.post_view;

  if (pv) {
    i.props.onEdit?.({
      name: pForm.name,
      url: pForm.url,
      body: pForm.body,
      nsfw: pForm.nsfw,
      post_id: pv.post.id,
      language_id: pForm.language_id,
      auth,
    });
  } else if (pForm.name && pForm.community_id) {
    i.props.onCreate?.({
      name: pForm.name,
      community_id: pForm.community_id,
      url: pForm.url,
      body: pForm.body,
      nsfw: pForm.nsfw,
      language_id: pForm.language_id,
      honeypot: pForm.honeypot,
      auth,
    });
  }
}

function copySuggestedTitle(d: { i: PostForm; suggestedTitle?: string }) {
  const sTitle = d.suggestedTitle;
  if (sTitle) {
    d.i.setState(
      s => ((s.form.name = sTitle?.substring(0, MAX_POST_TITLE_LENGTH)), s)
    );
    d.i.setState({ suggestedPostsRes: { state: "empty" } });
    setTimeout(() => {
      const textarea: any = document.getElementById("post-title");
      autosize.update(textarea);
    }, 10);
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

function handlePostNsfwChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.nsfw = event.target.checked), s));
}

function handleHoneyPotChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.honeypot = event.target.value), s));
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
    console.log("pictrs upload:");
    console.log(res);
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
      console.error(res.msg);
      toast(res.msg, "danger");
      i.setState({ imageLoading: false });
    }
  });
}

function handlePostNameChange(i: PostForm, event: any) {
  i.setState(s => ((s.form.name = event.target.value), s));
  i.fetchSimilarPosts();
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
    suggestedPostsRes: { state: "empty" },
    metadataRes: { state: "empty" },
    form: {},
    loading: false,
    imageLoading: false,
    imageDeleteUrl: "",
    communitySearchLoading: false,
    previewMode: false,
    communitySearchOptions: [],
    submitted: false,
  };

  constructor(props: PostFormProps, context: any) {
    super(props, context);
    this.fetchSimilarPosts = debounce(this.fetchSimilarPosts.bind(this));
    this.fetchPageTitle = debounce(this.fetchPageTitle.bind(this));
    this.handlePostBodyChange = this.handlePostBodyChange.bind(this);
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
          (
            this.props.initialCommunities?.map(
              ({ community: { id, title } }) => ({
                label: title,
                value: id.toString(),
              })
            ) ?? []
          ).filter(option => option.value !== selectedCommunityChoice.value)
        ),
      };
    } else {
      this.state = {
        ...this.state,
        communitySearchOptions:
          this.props.initialCommunities?.map(
            ({ community: { id, title } }) => ({
              label: title,
              value: id.toString(),
            })
          ) ?? [],
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

  componentDidMount() {
    setupTippy();
    const textarea: any = document.getElementById("post-title");

    if (textarea) {
      autosize(textarea);
    }
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostFormProps>
  ): void {
    if (this.props != nextProps) {
      this.setState(
        s => (
          (s.form.community_id = getIdFromString(
            nextProps.selectedCommunityChoice?.value
          )),
          s
        )
      );
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
            ) && !this.state.submitted
          }
        />
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="post-url">
            {I18NextService.i18n.t("url")}
          </label>
          <div className="col-sm-10">
            <input
              type="url"
              id="post-url"
              className="form-control mb-3"
              value={url}
              onInput={linkEvent(this, handlePostUrlChange)}
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
                  href={`${ghostArchiveUrl}/search?term=${encodeURIComponent(
                    url
                  )}`}
                  className="me-2 d-inline-block float-right text-muted small fw-bold"
                  rel={relTags}
                >
                  ghostarchive.org {I18NextService.i18n.t("archive_link")}
                </a>
                <a
                  href={`${archiveTodayUrl}/?run=1&url=${encodeURIComponent(
                    url
                  )}`}
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
                enableNsfw={this.props.enableNsfw}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                viewOnly
                // All of these are unused, since its view only
                onPostEdit={() => {}}
                onPostVote={() => {}}
                onPostReport={() => {}}
                onBlockPerson={() => {}}
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
              />
            </>
          )}
        </div>

        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="post-title">
            {I18NextService.i18n.t("title")}
          </label>
          <div className="col-sm-10">
            <textarea
              value={this.state.form.name}
              id="post-title"
              onInput={linkEvent(this, handlePostNameChange)}
              className={`form-control ${
                !validTitle(this.state.form.name) && "is-invalid"
              }`}
              required
              rows={1}
              minLength={3}
              maxLength={MAX_POST_TITLE_LENGTH}
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
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("body")}
          </label>
          <div className="col-sm-10">
            <MarkdownTextArea
              initialContent={this.state.form.body}
              onContentChange={this.handlePostBodyChange}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              hideNavigationWarnings
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
              disabled={!this.state.form.community_id || this.state.loading}
              type="submit"
              className="btn btn-secondary me-2"
            >
              {this.state.loading ? (
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
        const suggestedTitle = this.state.metadataRes.data.metadata.title;

        return (
          suggestedTitle && (
            <button
              type="button"
              className="mt-1 small border-0 bg-transparent p-0 d-block text-muted fw-bold pointer"
              onClick={linkEvent(
                { i: this, suggestedTitle },
                copySuggestedTitle
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
                enableNsfw={this.props.enableNsfw}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                viewOnly
                // All of these are unused, since its view only
                onPostEdit={() => {}}
                onPostVote={() => {}}
                onPostReport={() => {}}
                onBlockPerson={() => {}}
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
      this.setState({ metadataRes: { state: "loading" } });
      this.setState({
        metadataRes: await HttpService.client.getSiteMetadata({ url }),
      });
    }
  }

  async fetchSimilarPosts() {
    const q = this.state.form.name;
    if (q && q !== "") {
      this.setState({ suggestedPostsRes: { state: "loading" } });
      this.setState({
        suggestedPostsRes: await HttpService.client.search({
          q,
          type_: "Posts",
          sort: "TopAll",
          listing_type: "All",
          community_id: this.state.form.community_id,
          page: 1,
          limit: trendingFetchLimit,
          auth: myAuth(),
        }),
      });
    }
  }

  handlePostBodyChange(val: string) {
    this.setState(s => ((s.form.body = val), s));
  }

  handleLanguageChange(val: number[]) {
    this.setState(s => ((s.form.language_id = val.at(0)), s));
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
    if (this.props.onSelectCommunity) {
      this.props.onSelectCommunity(choice);
    }
  }
}
