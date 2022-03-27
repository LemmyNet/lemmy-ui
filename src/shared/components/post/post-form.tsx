import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CreatePost,
  EditPost,
  ListingType,
  PostResponse,
  PostView,
  Search,
  SearchResponse,
  SearchType,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import { PostFormParams } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  archiveTodayUrl,
  authField,
  capitalizeFirstLetter,
  choicesConfig,
  communitySelectName,
  communityToChoice,
  debounce,
  fetchCommunities,
  getSiteMetadata,
  ghostArchiveUrl,
  isBrowser,
  isImage,
  pictrsDeleteToast,
  relTags,
  setupTippy,
  toast,
  validTitle,
  validURL,
  webArchiveUrl,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PostListings } from "./post-listings";

var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

const MAX_POST_TITLE_LENGTH = 200;

interface PostFormProps {
  post_view?: PostView; // If a post is given, that means this is an edit
  communities?: CommunityView[];
  params?: PostFormParams;
  onCancel?(): any;
  onCreate?(post: PostView): any;
  onEdit?(post: PostView): any;
  enableNsfw: boolean;
  enableDownvotes: boolean;
}

interface PostFormState {
  postForm: CreatePost;
  loading: boolean;
  imageLoading: boolean;
  previewMode: boolean;
  suggestedTitle: string;
  suggestedPosts: PostView[];
  crossPosts: PostView[];
}

export class PostForm extends Component<PostFormProps, PostFormState> {
  private subscription: Subscription;
  private choices: any;
  private emptyState: PostFormState = {
    postForm: {
      community_id: null,
      name: null,
      nsfw: false,
      auth: authField(false),
    },
    loading: false,
    imageLoading: false,
    previewMode: false,
    suggestedTitle: undefined,
    suggestedPosts: [],
    crossPosts: [],
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.fetchSimilarPosts = debounce(this.fetchSimilarPosts.bind(this));
    this.fetchPageTitle = debounce(this.fetchPageTitle.bind(this));
    this.handlePostBodyChange = this.handlePostBodyChange.bind(this);

    this.state = this.emptyState;

    // Means its an edit
    if (this.props.post_view) {
      this.state.postForm = {
        body: this.props.post_view.post.body,
        name: this.props.post_view.post.name,
        community_id: this.props.post_view.community.id,
        url: this.props.post_view.post.url,
        nsfw: this.props.post_view.post.nsfw,
        auth: authField(),
      };
    }

    if (this.props.params) {
      this.state.postForm.name = this.props.params.name;
      if (this.props.params.url) {
        this.state.postForm.url = this.props.params.url;
      }
      if (this.props.params.body) {
        this.state.postForm.body = this.props.params.body;
      }
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentDidMount() {
    setupTippy();
    this.setupCommunities();
    let textarea: any = document.getElementById("post-title");
    if (textarea) {
      autosize(textarea);
    }
  }

  componentDidUpdate() {
    if (
      !this.state.loading &&
      (this.state.postForm.name ||
        this.state.postForm.url ||
        this.state.postForm.body)
    ) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    /* this.choices && this.choices.destroy(); */
    window.onbeforeunload = null;
  }

  render() {
    return (
      <div>
        <Prompt
          when={
            !this.state.loading &&
            (this.state.postForm.name ||
              this.state.postForm.url ||
              this.state.postForm.body)
          }
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handlePostSubmit)}>
          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="post-url">
              {i18n.t("url")}
            </label>
            <div class="col-sm-10">
              <input
                type="url"
                id="post-url"
                class="form-control"
                value={this.state.postForm.url}
                onInput={linkEvent(this, this.handlePostUrlChange)}
                onPaste={linkEvent(this, this.handleImageUploadPaste)}
              />
              {this.state.suggestedTitle && (
                <div
                  class="mt-1 text-muted small font-weight-bold pointer"
                  role="button"
                  onClick={linkEvent(this, this.copySuggestedTitle)}
                >
                  {i18n.t("copy_suggested_title", {
                    title: this.state.suggestedTitle,
                  })}
                </div>
              )}
              <form>
                <label
                  htmlFor="file-upload"
                  className={`${
                    UserService.Instance.myUserInfo && "pointer"
                  } d-inline-block float-right text-muted font-weight-bold`}
                  data-tippy-content={i18n.t("upload_image")}
                >
                  <Icon icon="image" classes="icon-inline" />
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,video/*"
                  name="file"
                  class="d-none"
                  disabled={!UserService.Instance.myUserInfo}
                  onChange={linkEvent(this, this.handleImageUpload)}
                />
              </form>
              {this.state.postForm.url && validURL(this.state.postForm.url) && (
                <div>
                  <a
                    href={`${webArchiveUrl}/save/${encodeURIComponent(
                      this.state.postForm.url
                    )}`}
                    class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    archive.org {i18n.t("archive_link")}
                  </a>
                  <a
                    href={`${ghostArchiveUrl}/search?term=${encodeURIComponent(
                      this.state.postForm.url
                    )}`}
                    class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    ghostarchive.org {i18n.t("archive_link")}
                  </a>
                  <a
                    href={`${archiveTodayUrl}/?run=1&url=${encodeURIComponent(
                      this.state.postForm.url
                    )}`}
                    class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    archive.today {i18n.t("archive_link")}
                  </a>
                </div>
              )}
              {this.state.imageLoading && <Spinner />}
              {isImage(this.state.postForm.url) && (
                <img src={this.state.postForm.url} class="img-fluid" alt="" />
              )}
              {this.state.crossPosts.length > 0 && (
                <>
                  <div class="my-1 text-muted small font-weight-bold">
                    {i18n.t("cross_posts")}
                  </div>
                  <PostListings
                    showCommunity
                    posts={this.state.crossPosts}
                    enableDownvotes={this.props.enableDownvotes}
                    enableNsfw={this.props.enableNsfw}
                  />
                </>
              )}
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="post-title">
              {i18n.t("title")}
            </label>
            <div class="col-sm-10">
              <textarea
                value={this.state.postForm.name}
                id="post-title"
                onInput={linkEvent(this, this.handlePostNameChange)}
                class={`form-control ${
                  !validTitle(this.state.postForm.name) && "is-invalid"
                }`}
                required
                rows={1}
                minLength={3}
                maxLength={MAX_POST_TITLE_LENGTH}
              />
              {!validTitle(this.state.postForm.name) && (
                <div class="invalid-feedback">
                  {i18n.t("invalid_post_title")}
                </div>
              )}
              {this.state.suggestedPosts.length > 0 && (
                <>
                  <div class="my-1 text-muted small font-weight-bold">
                    {i18n.t("related_posts")}
                  </div>
                  <PostListings
                    posts={this.state.suggestedPosts}
                    enableDownvotes={this.props.enableDownvotes}
                    enableNsfw={this.props.enableNsfw}
                  />
                </>
              )}
            </div>
          </div>

          <div class="form-group row">
            <label class="col-sm-2 col-form-label">{i18n.t("body")}</label>
            <div class="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.postForm.body}
                onContentChange={this.handlePostBodyChange}
              />
            </div>
          </div>
          {!this.props.post_view && (
            <div class="form-group row">
              <label class="col-sm-2 col-form-label" htmlFor="post-community">
                {i18n.t("community")}
              </label>
              <div class="col-sm-10">
                <select
                  class="form-control"
                  id="post-community"
                  value={this.state.postForm.community_id}
                  onInput={linkEvent(this, this.handlePostCommunityChange)}
                >
                  <option>{i18n.t("select_a_community")}</option>
                  {this.props.communities.map(cv => (
                    <option value={cv.community.id}>
                      {communitySelectName(cv)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {this.props.enableNsfw && (
            <div class="form-group row">
              <legend class="col-form-label col-sm-2 pt-0">
                {i18n.t("nsfw")}
              </legend>
              <div class="col-sm-10">
                <div class="form-check">
                  <input
                    class="form-check-input position-static"
                    id="post-nsfw"
                    type="checkbox"
                    checked={this.state.postForm.nsfw}
                    onChange={linkEvent(this, this.handlePostNsfwChange)}
                  />
                </div>
              </div>
            </div>
          )}
          <input
            tabIndex={-1}
            autoComplete="false"
            name="a_password"
            type="text"
            class="form-control honeypot"
            id="register-honey"
            value={this.state.postForm.honeypot}
            onInput={linkEvent(this, this.handleHoneyPotChange)}
          />
          <div class="form-group row">
            <div class="col-sm-10">
              <button
                disabled={
                  !this.state.postForm.community_id || this.state.loading
                }
                type="submit"
                class="btn btn-secondary mr-2"
              >
                {this.state.loading ? (
                  <Spinner />
                ) : this.props.post_view ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("create"))
                )}
              </button>
              {this.props.post_view && (
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t("cancel")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

  handlePostSubmit(i: PostForm, event: any) {
    event.preventDefault();

    // Coerce empty url string to undefined
    if (i.state.postForm.url !== undefined && i.state.postForm.url === "") {
      i.state.postForm.url = undefined;
    }

    if (i.props.post_view) {
      let form: EditPost = {
        ...i.state.postForm,
        post_id: i.props.post_view.post.id,
      };
      WebSocketService.Instance.send(wsClient.editPost(form));
    } else {
      WebSocketService.Instance.send(wsClient.createPost(i.state.postForm));
    }
    i.state.loading = true;
    i.setState(i.state);
  }

  copySuggestedTitle(i: PostForm) {
    i.state.postForm.name = i.state.suggestedTitle.substring(
      0,
      MAX_POST_TITLE_LENGTH
    );
    i.state.suggestedTitle = undefined;
    setTimeout(() => {
      let textarea: any = document.getElementById("post-title");
      autosize.update(textarea);
    }, 10);
    i.setState(i.state);
  }

  handlePostUrlChange(i: PostForm, event: any) {
    i.state.postForm.url = event.target.value;
    i.setState(i.state);
    i.fetchPageTitle();
  }

  fetchPageTitle() {
    if (validURL(this.state.postForm.url)) {
      let form: Search = {
        q: this.state.postForm.url,
        type_: SearchType.Url,
        sort: SortType.TopAll,
        listing_type: ListingType.All,
        page: 1,
        limit: 6,
        auth: authField(false),
      };

      WebSocketService.Instance.send(wsClient.search(form));

      // Fetch the page title
      getSiteMetadata(this.state.postForm.url).then(d => {
        this.state.suggestedTitle = d.metadata.title;
        this.setState(this.state);
      });
    } else {
      this.state.suggestedTitle = undefined;
      this.state.crossPosts = [];
    }
  }

  handlePostNameChange(i: PostForm, event: any) {
    i.state.postForm.name = event.target.value;
    i.setState(i.state);
    i.fetchSimilarPosts();
  }

  fetchSimilarPosts() {
    let form: Search = {
      q: this.state.postForm.name,
      type_: SearchType.Posts,
      sort: SortType.TopAll,
      listing_type: ListingType.All,
      community_id: this.state.postForm.community_id,
      page: 1,
      limit: 6,
      auth: authField(false),
    };

    if (this.state.postForm.name !== "") {
      WebSocketService.Instance.send(wsClient.search(form));
    } else {
      this.state.suggestedPosts = [];
    }

    this.setState(this.state);
  }

  handlePostBodyChange(val: string) {
    this.state.postForm.body = val;
    this.setState(this.state);
  }

  handlePostCommunityChange(i: PostForm, event: any) {
    i.state.postForm.community_id = Number(event.target.value);
    i.setState(i.state);
  }

  handlePostNsfwChange(i: PostForm, event: any) {
    i.state.postForm.nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleHoneyPotChange(i: PostForm, event: any) {
    i.state.postForm.honeypot = event.target.value;
    i.setState(i.state);
  }

  handleCancel(i: PostForm) {
    i.props.onCancel();
  }

  handlePreviewToggle(i: PostForm, event: any) {
    event.preventDefault();
    i.state.previewMode = !i.state.previewMode;
    i.setState(i.state);
  }

  handleImageUploadPaste(i: PostForm, event: any) {
    let image = event.clipboardData.files[0];
    if (image) {
      i.handleImageUpload(i, image);
    }
  }

  handleImageUpload(i: PostForm, event: any) {
    let file: any;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    const formData = new FormData();
    formData.append("images[]", file);

    i.state.imageLoading = true;
    i.setState(i.state);

    fetch(pictrsUri, {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(res => {
        console.log("pictrs upload:");
        console.log(res);
        if (res.msg == "ok") {
          let hash = res.files[0].file;
          let url = `${pictrsUri}/${hash}`;
          let deleteToken = res.files[0].delete_token;
          let deleteUrl = `${pictrsUri}/delete/${deleteToken}/${hash}`;
          i.state.postForm.url = url;
          i.state.imageLoading = false;
          i.setState(i.state);
          pictrsDeleteToast(
            i18n.t("click_to_delete_picture"),
            i18n.t("picture_deleted"),
            deleteUrl
          );
        } else {
          i.state.imageLoading = false;
          i.setState(i.state);
          toast(JSON.stringify(res), "danger");
        }
      })
      .catch(error => {
        i.state.imageLoading = false;
        i.setState(i.state);
        console.error(error);
        toast(error, "danger");
      });
  }

  setupCommunities() {
    // Set up select searching
    if (isBrowser()) {
      let selectId: any = document.getElementById("post-community");
      if (selectId) {
        this.choices = new Choices(selectId, choicesConfig);
        this.choices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.state.postForm.community_id = Number(e.detail.choice.value);
            this.setState(this.state);
          },
          false
        );
        this.choices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let communities = (await fetchCommunities(e.detail.value))
                .communities;
              this.choices.setChoices(
                communities.map(cv => communityToChoice(cv)),
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          }, 400),
          false
        );
      }
    }

    if (this.props.post_view) {
      this.state.postForm.community_id = this.props.post_view.community.id;
    } else if (
      this.props.params &&
      (this.props.params.community_id || this.props.params.community_name)
    ) {
      if (this.props.params.community_name) {
        let foundCommunityId = this.props.communities.find(
          r => r.community.name == this.props.params.community_name
        ).community.id;
        this.state.postForm.community_id = foundCommunityId;
      } else if (this.props.params.community_id) {
        this.state.postForm.community_id = this.props.params.community_id;
      }

      if (isBrowser()) {
        this.choices.setChoiceByValue(
          this.state.postForm.community_id.toString()
        );
      }
      this.setState(this.state);
    } else {
      // By default, the null valued 'Select a Community'
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      if (
        data.post_view.creator.id ==
        UserService.Instance.myUserInfo.local_user_view.person.id
      ) {
        this.state.loading = false;
        this.props.onCreate(data.post_view);
      }
    } else if (op == UserOperation.EditPost) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      if (
        data.post_view.creator.id ==
        UserService.Instance.myUserInfo.local_user_view.person.id
      ) {
        this.state.loading = false;
        this.props.onEdit(data.post_view);
      }
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg).data;

      if (data.type_ == SearchType[SearchType.Posts]) {
        this.state.suggestedPosts = data.posts;
      } else if (data.type_ == SearchType[SearchType.Url]) {
        this.state.crossPosts = data.posts;
      }
      this.setState(this.state);
    }
  }
}
