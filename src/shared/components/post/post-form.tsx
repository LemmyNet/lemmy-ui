import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreatePost,
  EditPost,
  Language,
  PostResponse,
  PostView,
  Search,
  SearchResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { PostFormParams } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  Choice,
  archiveTodayUrl,
  capitalizeFirstLetter,
  communityToChoice,
  debounce,
  fetchCommunities,
  getIdFromString,
  getSiteMetadata,
  ghostArchiveUrl,
  isImage,
  myAuth,
  pictrsDeleteToast,
  relTags,
  setupTippy,
  toast,
  trendingFetchLimit,
  uploadImage,
  validTitle,
  validURL,
  webArchiveUrl,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SearchableSelect } from "../common/searchable-select";
import { PostListings } from "./post-listings";

const MAX_POST_TITLE_LENGTH = 200;

interface PostFormProps {
  post_view?: PostView; // If a post is given, that means this is an edit
  allLanguages: Language[];
  siteLanguages: number[];
  params?: PostFormParams;
  onCancel?(): any;
  onCreate?(post: PostView): any;
  onEdit?(post: PostView): any;
  enableNsfw?: boolean;
  enableDownvotes?: boolean;
  selectedCommunityChoice?: Choice;
  onSelectCommunity?: (choice: Choice) => void;
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
  suggestedTitle?: string;
  suggestedPosts?: PostView[];
  crossPosts?: PostView[];
  loading: boolean;
  imageLoading: boolean;
  communitySearchLoading: boolean;
  communitySearchOptions: Choice[];
  previewMode: boolean;
}

export class PostForm extends Component<PostFormProps, PostFormState> {
  private subscription?: Subscription;
  state: PostFormState = {
    form: {},
    loading: false,
    imageLoading: false,
    communitySearchLoading: false,
    previewMode: false,
    communitySearchOptions: [],
  };

  constructor(props: PostFormProps, context: any) {
    super(props, context);
    this.fetchSimilarPosts = debounce(this.fetchSimilarPosts.bind(this));
    this.fetchPageTitle = debounce(this.fetchPageTitle.bind(this));
    this.handlePostBodyChange = this.handlePostBodyChange.bind(this);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
    this.handleCommunitySelect = this.handleCommunitySelect.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Means its an edit
    const pv = this.props.post_view;
    if (pv) {
      this.state = {
        ...this.state,
        form: {
          body: pv.post.body,
          name: pv.post.name,
          community_id: pv.community.id,
          url: pv.post.url,
          nsfw: pv.post.nsfw,
          language_id: pv.post.language_id,
        },
      };
    }

    const selectedCommunityChoice = this.props.selectedCommunityChoice;

    if (selectedCommunityChoice) {
      this.state = {
        ...this.state,
        form: {
          ...this.state.form,
          community_id: getIdFromString(selectedCommunityChoice.value),
        },
        communitySearchOptions: [selectedCommunityChoice],
      };
    }

    const params = this.props.params;
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

  componentDidUpdate() {
    if (
      !this.state.loading &&
      (this.state.form.name || this.state.form.url || this.state.form.body)
    ) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
    /* this.choices && this.choices.destroy(); */
    window.onbeforeunload = null;
  }

  static getDerivedStateFromProps(
    { selectedCommunityChoice }: PostFormProps,
    { form, ...restState }: PostFormState
  ) {
    return {
      ...restState,
      form: {
        ...form,
        community_id: getIdFromString(selectedCommunityChoice?.value),
      },
    };
  }

  render() {
    let firstLang = this.state.form.language_id;
    let selectedLangs = firstLang ? Array.of(firstLang) : undefined;

    let url = this.state.form.url;
    return (
      <div>
        <Prompt
          when={
            !this.state.loading &&
            (this.state.form.name ||
              this.state.form.url ||
              this.state.form.body)
          }
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handlePostSubmit)}>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label" htmlFor="post-url">
              {i18n.t("url")}
            </label>
            <div className="col-sm-10">
              <input
                type="url"
                id="post-url"
                className="form-control"
                value={this.state.form.url}
                onInput={linkEvent(this, this.handlePostUrlChange)}
                onPaste={linkEvent(this, this.handleImageUploadPaste)}
              />
              {this.state.suggestedTitle && (
                <div
                  className="mt-1 text-muted small font-weight-bold pointer"
                  role="button"
                  onClick={linkEvent(this, this.copySuggestedTitle)}
                >
                  {i18n.t("copy_suggested_title", { title: "" })}{" "}
                  {this.state.suggestedTitle}
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
                  className="d-none"
                  disabled={!UserService.Instance.myUserInfo}
                  onChange={linkEvent(this, this.handleImageUpload)}
                />
              </form>
              {url && validURL(url) && (
                <div>
                  <a
                    href={`${webArchiveUrl}/save/${encodeURIComponent(url)}`}
                    className="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    archive.org {i18n.t("archive_link")}
                  </a>
                  <a
                    href={`${ghostArchiveUrl}/search?term=${encodeURIComponent(
                      url
                    )}`}
                    className="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    ghostarchive.org {i18n.t("archive_link")}
                  </a>
                  <a
                    href={`${archiveTodayUrl}/?run=1&url=${encodeURIComponent(
                      url
                    )}`}
                    className="mr-2 d-inline-block float-right text-muted small font-weight-bold"
                    rel={relTags}
                  >
                    archive.today {i18n.t("archive_link")}
                  </a>
                </div>
              )}
              {this.state.imageLoading && <Spinner />}
              {url && isImage(url) && (
                <img src={url} className="img-fluid" alt="" />
              )}
              {this.state.crossPosts && this.state.crossPosts.length > 0 && (
                <>
                  <div className="my-1 text-muted small font-weight-bold">
                    {i18n.t("cross_posts")}
                  </div>
                  <PostListings
                    showCommunity
                    posts={this.state.crossPosts}
                    enableDownvotes={this.props.enableDownvotes}
                    enableNsfw={this.props.enableNsfw}
                    allLanguages={this.props.allLanguages}
                    siteLanguages={this.props.siteLanguages}
                  />
                </>
              )}
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label" htmlFor="post-title">
              {i18n.t("title")}
            </label>
            <div className="col-sm-10">
              <textarea
                value={this.state.form.name}
                id="post-title"
                onInput={linkEvent(this, this.handlePostNameChange)}
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
                  {i18n.t("invalid_post_title")}
                </div>
              )}
              {this.state.suggestedPosts &&
                this.state.suggestedPosts.length > 0 && (
                  <>
                    <div className="my-1 text-muted small font-weight-bold">
                      {i18n.t("related_posts")}
                    </div>
                    <PostListings
                      showCommunity
                      posts={this.state.suggestedPosts}
                      enableDownvotes={this.props.enableDownvotes}
                      enableNsfw={this.props.enableNsfw}
                      allLanguages={this.props.allLanguages}
                      siteLanguages={this.props.siteLanguages}
                    />
                  </>
                )}
            </div>
          </div>

          <div className="form-group row">
            <label className="col-sm-2 col-form-label">{i18n.t("body")}</label>
            <div className="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.form.body}
                onContentChange={this.handlePostBodyChange}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
              />
            </div>
          </div>
          {!this.props.post_view && (
            <div className="form-group row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="post-community"
              >
                {i18n.t("community")}
              </label>
              <div className="col-sm-10">
                <SearchableSelect
                  id="post-community"
                  value={this.state.form.community_id}
                  options={[
                    {
                      label: i18n.t("select_a_community"),
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
            <div className="form-group row">
              <legend className="col-form-label col-sm-2 pt-0">
                {i18n.t("nsfw")}
              </legend>
              <div className="col-sm-10">
                <div className="form-check">
                  <input
                    className="form-check-input position-static"
                    id="post-nsfw"
                    type="checkbox"
                    checked={this.state.form.nsfw}
                    onChange={linkEvent(this, this.handlePostNsfwChange)}
                  />
                </div>
              </div>
            </div>
          )}
          <LanguageSelect
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            selectedLanguageIds={selectedLangs}
            multiple={false}
            onChange={this.handleLanguageChange}
          />
          <input
            tabIndex={-1}
            autoComplete="false"
            name="a_password"
            type="text"
            className="form-control honeypot"
            id="register-honey"
            value={this.state.form.honeypot}
            onInput={linkEvent(this, this.handleHoneyPotChange)}
          />
          <div className="form-group row">
            <div className="col-sm-10">
              <button
                disabled={!this.state.form.community_id || this.state.loading}
                type="submit"
                className="btn btn-secondary mr-2"
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
                  className="btn btn-secondary"
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

    i.setState({ loading: true });

    // Coerce empty url string to undefined
    if ((i.state.form.url ?? "blank") === "") {
      i.setState(s => ((s.form.url = undefined), s));
    }

    let pForm = i.state.form;
    let pv = i.props.post_view;
    let auth = myAuth();
    if (auth) {
      if (pv) {
        let form: EditPost = {
          name: pForm.name,
          url: pForm.url,
          body: pForm.body,
          nsfw: pForm.nsfw,
          post_id: pv.post.id,
          language_id: pv.post.language_id,
          auth,
        };
        WebSocketService.Instance.send(wsClient.editPost(form));
      } else {
        if (pForm.name && pForm.community_id) {
          let form: CreatePost = {
            name: pForm.name,
            community_id: pForm.community_id,
            url: pForm.url,
            body: pForm.body,
            nsfw: pForm.nsfw,
            language_id: pForm.language_id,
            honeypot: pForm.honeypot,
            auth,
          };
          WebSocketService.Instance.send(wsClient.createPost(form));
        }
      }
    }
  }

  copySuggestedTitle(i: PostForm) {
    let sTitle = i.state.suggestedTitle;
    if (sTitle) {
      i.setState(
        s => ((s.form.name = sTitle?.substring(0, MAX_POST_TITLE_LENGTH)), s)
      );
      i.setState({ suggestedTitle: undefined });
      setTimeout(() => {
        let textarea: any = document.getElementById("post-title");
        autosize.update(textarea);
      }, 10);
    }
  }

  handlePostUrlChange(i: PostForm, event: any) {
    i.setState(s => ((s.form.url = event.target.value), s));
    i.fetchPageTitle();
  }

  fetchPageTitle() {
    let url = this.state.form.url;
    if (url && validURL(url)) {
      let form: Search = {
        q: url,
        type_: "Url",
        sort: "TopAll",
        listing_type: "All",
        page: 1n,
        limit: trendingFetchLimit,
        auth: myAuth(false),
      };

      WebSocketService.Instance.send(wsClient.search(form));

      // Fetch the page title
      getSiteMetadata(url).then(d => {
        this.setState({ suggestedTitle: d.metadata.title });
      });
    } else {
      this.setState({ suggestedTitle: undefined, crossPosts: undefined });
    }
  }

  handlePostNameChange(i: PostForm, event: any) {
    i.setState(s => ((s.form.name = event.target.value), s));
    i.fetchSimilarPosts();
  }

  fetchSimilarPosts() {
    let q = this.state.form.name;
    if (q && q !== "") {
      let form: Search = {
        q,
        type_: "Posts",
        sort: "TopAll",
        listing_type: "All",
        community_id: this.state.form.community_id,
        page: 1n,
        limit: trendingFetchLimit,
        auth: myAuth(false),
      };

      WebSocketService.Instance.send(wsClient.search(form));
    } else {
      this.setState({ suggestedPosts: undefined });
    }
  }

  handlePostBodyChange(val: string) {
    this.setState(s => ((s.form.body = val), s));
  }

  handlePostCommunityChange(i: PostForm, event: any) {
    i.setState(s => ((s.form.community_id = Number(event.target.value)), s));
  }

  handlePostNsfwChange(i: PostForm, event: any) {
    i.setState(s => ((s.form.nsfw = event.target.checked), s));
  }

  handleLanguageChange(val: number[]) {
    this.setState(s => ((s.form.language_id = val.at(0)), s));
  }

  handleHoneyPotChange(i: PostForm, event: any) {
    i.setState(s => ((s.form.honeypot = event.target.value), s));
  }

  handleCancel(i: PostForm) {
    i.props.onCancel?.();
  }

  handlePreviewToggle(i: PostForm, event: any) {
    event.preventDefault();
    i.setState({ previewMode: !i.state.previewMode });
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

    i.setState({ imageLoading: true });

    uploadImage(file)
      .then(res => {
        console.log("pictrs upload:");
        console.log(res);
        if (res.msg === "ok") {
          i.state.form.url = res.url;
          i.setState({ imageLoading: false });
          pictrsDeleteToast(file.name, res.delete_url as string);
        } else {
          i.setState({ imageLoading: false });
          toast(JSON.stringify(res), "danger");
        }
      })
      .catch(error => {
        i.setState({ imageLoading: false });
        console.error(error);
        toast(error, "danger");
      });
  }

  handleCommunitySearch = debounce(async (text: string) => {
    const { selectedCommunityChoice } = this.props;
    this.setState({ communitySearchLoading: true });

    const newOptions: Choice[] = [];

    if (selectedCommunityChoice) {
      newOptions.push(selectedCommunityChoice);
    }

    if (text.length > 0) {
      newOptions.push(
        ...(await fetchCommunities(text)).communities.map(communityToChoice)
      );

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
      this.setState({
        loading: true,
      });

      this.props.onSelectCommunity(choice);

      this.setState({ loading: false });
    }
  }

  parseMessage(msg: any) {
    let mui = UserService.Instance.myUserInfo;
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      // Errors handled by top level pages
      // toast(i18n.t(msg.error), "danger");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg);
      if (data.post_view.creator.id == mui?.local_user_view.person.id) {
        this.props.onCreate?.(data.post_view);
      }
    } else if (op == UserOperation.EditPost) {
      let data = wsJsonToRes<PostResponse>(msg);
      if (data.post_view.creator.id == mui?.local_user_view.person.id) {
        this.setState({ loading: false });
        this.props.onEdit?.(data.post_view);
      }
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg);

      if (data.type_ == "Posts") {
        this.setState({ suggestedPosts: data.posts });
      } else if (data.type_ == "Url") {
        this.setState({ crossPosts: data.posts });
      }
    }
  }
}
