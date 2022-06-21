import { None, Option, Some } from "@sniptt/monads";
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
  toUndefined,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import { PostFormParams } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  archiveTodayUrl,
  auth,
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
  trendingFetchLimit,
  validTitle,
  validURL,
  webArchiveUrl,
  wsClient,
  wsSubscribe,
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
  post_view: Option<PostView>; // If a post is given, that means this is an edit
  communities: Option<CommunityView[]>;
  params: Option<PostFormParams>;
  onCancel?(): any;
  onCreate?(post: PostView): any;
  onEdit?(post: PostView): any;
  enableNsfw?: boolean;
  enableDownvotes?: boolean;
}

interface PostFormState {
  postForm: CreatePost;
  suggestedTitle: Option<string>;
  suggestedPosts: Option<PostView[]>;
  crossPosts: Option<PostView[]>;
  loading: boolean;
  imageLoading: boolean;
  previewMode: boolean;
}

export class PostForm extends Component<PostFormProps, PostFormState> {
  private subscription: Subscription;
  private choices: any;
  private emptyState: PostFormState = {
    postForm: new CreatePost({
      community_id: undefined,
      name: undefined,
      nsfw: Some(false),
      url: None,
      body: None,
      honeypot: None,
      auth: undefined,
    }),
    loading: false,
    imageLoading: false,
    previewMode: false,
    suggestedTitle: None,
    suggestedPosts: None,
    crossPosts: None,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.fetchSimilarPosts = debounce(this.fetchSimilarPosts.bind(this));
    this.fetchPageTitle = debounce(this.fetchPageTitle.bind(this));
    this.handlePostBodyChange = this.handlePostBodyChange.bind(this);

    this.state = this.emptyState;

    // Means its an edit
    this.props.post_view.match({
      some: pv =>
        (this.state.postForm = new CreatePost({
          body: pv.post.body,
          name: pv.post.name,
          community_id: pv.community.id,
          url: pv.post.url,
          nsfw: Some(pv.post.nsfw),
          honeypot: None,
          auth: auth().unwrap(),
        })),
      none: void 0,
    });

    this.props.params.match({
      some: params => {
        this.state.postForm.name = toUndefined(params.name);
        this.state.postForm.url = params.url;
        this.state.postForm.body = params.body;
      },
      none: void 0,
    });

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
        this.state.postForm.url.isSome() ||
        this.state.postForm.body.isSome())
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
              this.state.postForm.url.isSome() ||
              this.state.postForm.body.isSome())
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
                value={toUndefined(this.state.postForm.url)}
                onInput={linkEvent(this, this.handlePostUrlChange)}
                onPaste={linkEvent(this, this.handleImageUploadPaste)}
              />
              {this.state.suggestedTitle.match({
                some: title => (
                  <div
                    class="mt-1 text-muted small font-weight-bold pointer"
                    role="button"
                    onClick={linkEvent(this, this.copySuggestedTitle)}
                  >
                    {i18n.t("copy_suggested_title", {
                      title,
                    })}
                  </div>
                ),
                none: <></>,
              })}
              <form>
                <label
                  htmlFor="file-upload"
                  className={`${
                    UserService.Instance.myUserInfo.isSome() && "pointer"
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
                  disabled={UserService.Instance.myUserInfo.isNone()}
                  onChange={linkEvent(this, this.handleImageUpload)}
                />
              </form>
              {this.state.postForm.url.match({
                some: url =>
                  validURL(url) && (
                    <div>
                      <a
                        href={`${webArchiveUrl}/save/${encodeURIComponent(
                          url
                        )}`}
                        class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                        rel={relTags}
                      >
                        archive.org {i18n.t("archive_link")}
                      </a>
                      <a
                        href={`${ghostArchiveUrl}/search?term=${encodeURIComponent(
                          url
                        )}`}
                        class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                        rel={relTags}
                      >
                        ghostarchive.org {i18n.t("archive_link")}
                      </a>
                      <a
                        href={`${archiveTodayUrl}/?run=1&url=${encodeURIComponent(
                          url
                        )}`}
                        class="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                        rel={relTags}
                      >
                        archive.today {i18n.t("archive_link")}
                      </a>
                    </div>
                  ),
                none: <></>,
              })}
              {this.state.imageLoading && <Spinner />}
              {this.state.postForm.url.match({
                some: url =>
                  isImage(url) && <img src={url} class="img-fluid" alt="" />,
                none: <></>,
              })}
              {this.state.crossPosts.match({
                some: xPosts =>
                  xPosts.length > 0 && (
                    <>
                      <div class="my-1 text-muted small font-weight-bold">
                        {i18n.t("cross_posts")}
                      </div>
                      <PostListings
                        showCommunity
                        posts={xPosts}
                        enableDownvotes={this.props.enableDownvotes}
                        enableNsfw={this.props.enableNsfw}
                      />
                    </>
                  ),
                none: <></>,
              })}
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
              {this.state.suggestedPosts.match({
                some: sPosts =>
                  sPosts.length > 0 && (
                    <>
                      <div class="my-1 text-muted small font-weight-bold">
                        {i18n.t("related_posts")}
                      </div>
                      <PostListings
                        posts={sPosts}
                        enableDownvotes={this.props.enableDownvotes}
                        enableNsfw={this.props.enableNsfw}
                      />
                    </>
                  ),
                none: <></>,
              })}
            </div>
          </div>

          <div class="form-group row">
            <label class="col-sm-2 col-form-label">{i18n.t("body")}</label>
            <div class="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.postForm.body}
                onContentChange={this.handlePostBodyChange}
                placeholder={None}
                buttonTitle={None}
                maxLength={None}
              />
            </div>
          </div>
          {this.props.post_view.isNone() && (
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
                  {this.props.communities.unwrapOr([]).map(cv => (
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
                    checked={toUndefined(this.state.postForm.nsfw)}
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
            value={toUndefined(this.state.postForm.honeypot)}
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
                ) : this.props.post_view.isSome() ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("create"))
                )}
              </button>
              {this.props.post_view.isSome() && (
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
    if (
      i.state.postForm.url.isSome() &&
      i.state.postForm.url.unwrapOr("blank") === ""
    ) {
      i.state.postForm.url = None;
    }

    let pForm = i.state.postForm;
    i.props.post_view.match({
      some: pv => {
        let form = new EditPost({
          name: Some(pForm.name),
          url: pForm.url,
          body: pForm.body,
          nsfw: pForm.nsfw,
          post_id: pv.post.id,
          auth: auth().unwrap(),
        });
        WebSocketService.Instance.send(wsClient.editPost(form));
      },
      none: () => {
        i.state.postForm.auth = auth().unwrap();
        WebSocketService.Instance.send(wsClient.createPost(i.state.postForm));
      },
    });
    i.state.loading = true;
    i.setState(i.state);
  }

  copySuggestedTitle(i: PostForm) {
    i.state.suggestedTitle.match({
      some: sTitle => {
        i.state.postForm.name = sTitle.substring(0, MAX_POST_TITLE_LENGTH);
        i.state.suggestedTitle = None;
        setTimeout(() => {
          let textarea: any = document.getElementById("post-title");
          autosize.update(textarea);
        }, 10);
        i.setState(i.state);
      },
      none: void 0,
    });
  }

  handlePostUrlChange(i: PostForm, event: any) {
    i.state.postForm.url = Some(event.target.value);
    i.setState(i.state);
    i.fetchPageTitle();
  }

  fetchPageTitle() {
    this.state.postForm.url.match({
      some: url => {
        if (validURL(url)) {
          let form = new Search({
            q: url,
            community_id: None,
            community_name: None,
            creator_id: None,
            type_: Some(SearchType.Url),
            sort: Some(SortType.TopAll),
            listing_type: Some(ListingType.All),
            page: Some(1),
            limit: Some(trendingFetchLimit),
            auth: auth(false).ok(),
          });

          WebSocketService.Instance.send(wsClient.search(form));

          // Fetch the page title
          getSiteMetadata(url).then(d => {
            this.state.suggestedTitle = d.metadata.title;
            this.setState(this.state);
          });
        } else {
          this.state.suggestedTitle = None;
          this.state.crossPosts = None;
        }
      },
      none: void 0,
    });
  }

  handlePostNameChange(i: PostForm, event: any) {
    i.state.postForm.name = event.target.value;
    i.setState(i.state);
    i.fetchSimilarPosts();
  }

  fetchSimilarPosts() {
    let form = new Search({
      q: this.state.postForm.name,
      type_: Some(SearchType.Posts),
      sort: Some(SortType.TopAll),
      listing_type: Some(ListingType.All),
      community_id: Some(this.state.postForm.community_id),
      community_name: None,
      creator_id: None,
      page: Some(1),
      limit: Some(trendingFetchLimit),
      auth: auth(false).ok(),
    });

    if (this.state.postForm.name !== "") {
      WebSocketService.Instance.send(wsClient.search(form));
    } else {
      this.state.suggestedPosts = None;
    }

    this.setState(this.state);
  }

  handlePostBodyChange(val: string) {
    this.state.postForm.body = Some(val);
    this.setState(this.state);
  }

  handlePostCommunityChange(i: PostForm, event: any) {
    i.state.postForm.community_id = Number(event.target.value);
    i.setState(i.state);
  }

  handlePostNsfwChange(i: PostForm, event: any) {
    i.state.postForm.nsfw = Some(event.target.checked);
    i.setState(i.state);
  }

  handleHoneyPotChange(i: PostForm, event: any) {
    i.state.postForm.honeypot = Some(event.target.value);
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
          i.state.postForm.url = Some(url);
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
          }),
          false
        );
      }
    }

    this.props.post_view.match({
      some: pv => (this.state.postForm.community_id = pv.community.id),
      none: void 0,
    });
    this.props.params.match({
      some: params =>
        params.nameOrId.match({
          some: nameOrId =>
            nameOrId.match({
              left: name => {
                let foundCommunityId = this.props.communities
                  .unwrapOr([])
                  .find(r => r.community.name == name).community.id;
                this.state.postForm.community_id = foundCommunityId;
              },
              right: id => (this.state.postForm.community_id = id),
            }),
          none: void 0,
        }),
      none: void 0,
    });

    if (isBrowser() && this.state.postForm.community_id) {
      this.choices.setChoiceByValue(
        this.state.postForm.community_id.toString()
      );
    }
    this.setState(this.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      // Errors handled by top level pages
      // toast(i18n.t(msg.error), "danger");
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      UserService.Instance.myUserInfo.match({
        some: mui => {
          if (data.post_view.creator.id == mui.local_user_view.person.id) {
            this.state.loading = false;
            this.props.onCreate(data.post_view);
          }
        },
        none: void 0,
      });
    } else if (op == UserOperation.EditPost) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      UserService.Instance.myUserInfo.match({
        some: mui => {
          if (data.post_view.creator.id == mui.local_user_view.person.id) {
            this.state.loading = false;
            this.props.onEdit(data.post_view);
          }
        },
        none: void 0,
      });
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg, SearchResponse);

      if (data.type_ == SearchType[SearchType.Posts]) {
        this.state.suggestedPosts = Some(data.posts);
      } else if (data.type_ == SearchType[SearchType.Url]) {
        this.state.crossPosts = Some(data.posts);
      }
      this.setState(this.state);
    }
  }
}
