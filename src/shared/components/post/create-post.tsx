import { Component } from "inferno";
import {
  GetCommunity,
  GetCommunityResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  PostView,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest, PostFormParams } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  isBrowser,
  myAuth,
  setIsoData,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PostForm } from "./post-form";

interface CreatePostState {
  listCommunitiesResponse?: ListCommunitiesResponse;
  siteRes: GetSiteResponse;
  loading: boolean;
}

export class CreatePost extends Component<any, CreatePostState> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: CreatePostState = {
    siteRes: this.isoData.site_res,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePostCreate = this.handlePostCreate.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        listCommunitiesResponse: this.isoData
          .routeData[0] as ListCommunitiesResponse,
        loading: false,
      };
    } else {
      this.refetch();
    }
  }

  refetch() {
    let nameOrId = this.params.nameOrId;
    let auth = myAuth(false);
    if (nameOrId) {
      if (typeof nameOrId === "string") {
        let form: GetCommunity = {
          name: nameOrId,
          auth,
        };
        WebSocketService.Instance.send(wsClient.getCommunity(form));
      } else {
        let form: GetCommunity = {
          id: nameOrId,
          auth,
        };
        WebSocketService.Instance.send(wsClient.getCommunity(form));
      }
    } else {
      let listCommunitiesForm: ListCommunities = {
        type_: ListingType.All,
        sort: SortType.TopAll,
        limit: fetchLimit,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.listCommunities(listCommunitiesForm)
      );
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("create_post")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    let res = this.state.listCommunitiesResponse;
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          res && (
            <div className="row">
              <div className="col-12 col-lg-6 offset-lg-3 mb-4">
                <h5>{i18n.t("create_post")}</h5>
                <PostForm
                  communities={res.communities}
                  onCreate={this.handlePostCreate}
                  params={this.params}
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  enableNsfw={enableNsfw(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                />
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  get params(): PostFormParams {
    let urlParams = new URLSearchParams(this.props.location.search);
    let name = urlParams.get("community_name") ?? this.prevCommunityName;
    let communityIdParam = urlParams.get("community_id");
    let id = communityIdParam ? Number(communityIdParam) : this.prevCommunityId;
    let nameOrId: string | number | undefined;
    if (name) {
      nameOrId = name;
    } else if (id) {
      nameOrId = id;
    }

    let params: PostFormParams = {
      name: urlParams.get("title") ?? undefined,
      nameOrId,
      body: urlParams.get("body") ?? undefined,
      url: urlParams.get("url") ?? undefined,
    };

    return params;
  }

  get prevCommunityName(): string | undefined {
    if (this.props.match.params.name) {
      return this.props.match.params.name;
    } else if (this.props.location.state) {
      let lastLocation = this.props.location.state.prevPath;
      if (lastLocation.includes("/c/")) {
        return lastLocation.split("/c/").at(1);
      }
    }
    return undefined;
  }

  get prevCommunityId(): number | undefined {
    // TODO is this actually a number? Whats the real return type
    let id = this.props.match.params.id;
    return id ?? undefined;
  }

  handlePostCreate(post_view: PostView) {
    this.props.history.push(`/post/${post_view.post.id}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.All,
      sort: SortType.TopAll,
      limit: fetchLimit,
      auth: req.auth,
    };
    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg);
      this.setState({ listCommunitiesResponse: data, loading: false });
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg);
      this.setState({
        listCommunitiesResponse: {
          communities: [data.community_view],
        },
        loading: false,
      });
    }
  }
}
