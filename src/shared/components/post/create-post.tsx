import { Either, Left, None, Option, Right, Some } from "@sniptt/monads";
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
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest, PostFormParams } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  isBrowser,
  setIsoData,
  setOptionalAuth,
  toast,
  toOption,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PostForm } from "./post-form";

interface CreatePostState {
  listCommunitiesResponse: Option<ListCommunitiesResponse>;
  siteRes: GetSiteResponse;
  loading: boolean;
}

export class CreatePost extends Component<any, CreatePostState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreatePostState = {
    siteRes: this.isoData.site_res,
    listCommunitiesResponse: None,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.state = this.emptyState;

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.listCommunitiesResponse = Some(this.isoData.routeData[0]);
      this.state.loading = false;
    } else {
      this.refetch();
    }
  }

  refetch() {
    this.params.nameOrId.match({
      some: opt =>
        opt.match({
          left: name => {
            let form: GetCommunity = {
              name,
              auth: auth(false),
            };
            WebSocketService.Instance.send(wsClient.getCommunity(form));
          },
          right: id => {
            let form: GetCommunity = {
              id,
              auth: auth(false),
            };
            WebSocketService.Instance.send(wsClient.getCommunity(form));
          },
        }),
      none: () => {
        let listCommunitiesForm: ListCommunities = {
          type_: ListingType.All,
          sort: SortType.TopAll,
          limit: fetchLimit,
          auth: auth(false),
        };
        WebSocketService.Instance.send(
          wsClient.listCommunities(listCommunitiesForm)
        );
      },
    });
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return toOption(this.state.siteRes.site_view).match({
      some: siteView => `${i18n.t("create_post")} - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.listCommunitiesResponse.match({
            some: res => (
              <div class="row">
                <div class="col-12 col-lg-6 offset-lg-3 mb-4">
                  <h5>{i18n.t("create_post")}</h5>
                  <PostForm
                    post_view={None}
                    communities={Some(res.communities)}
                    onCreate={this.handlePostCreate}
                    params={Some(this.params)}
                    enableDownvotes={enableDownvotes(this.state.siteRes)}
                    enableNsfw={enableNsfw(this.state.siteRes)}
                  />
                </div>
              </div>
            ),
            none: <></>,
          })
        )}
      </div>
    );
  }

  get params(): PostFormParams {
    let urlParams = new URLSearchParams(this.props.location.search);
    let name = toOption(urlParams.get("community_name")).or(
      this.prevCommunityName
    );
    let id = toOption(urlParams.get("community_id"))
      .map(Number)
      .or(this.prevCommunityId);
    let nameOrId: Option<Either<string, number>>;
    if (name.isSome()) {
      nameOrId = Some(Left(name.unwrap()));
    } else if (id.isSome()) {
      nameOrId = Some(Right(id.unwrap()));
    } else {
      nameOrId = None;
    }

    let params: PostFormParams = {
      name: toOption(urlParams.get("title")),
      nameOrId,
      body: toOption(urlParams.get("body")),
      url: toOption(urlParams.get("url")),
    };

    return params;
  }

  get prevCommunityName(): Option<string> {
    if (this.props.match.params.name) {
      return Some(this.props.match.params.name);
    } else if (this.props.location.state) {
      let lastLocation = this.props.location.state.prevPath;
      if (lastLocation.includes("/c/")) {
        return Some(lastLocation.split("/c/")[1]);
      }
    }
    return None;
  }

  get prevCommunityId(): Option<number> {
    if (this.props.match.params.id) {
      return Some(this.props.match.params.id);
    }
    return None;
  }

  handlePostCreate(post_view: PostView) {
    this.props.history.push(`/post/${post_view.post.id}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.All,
      sort: SortType.TopAll,
      limit: fetchLimit,
    };
    setOptionalAuth(listCommunitiesForm, req.auth);
    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.listCommunitiesResponse = Some(data);
      this.state.loading = false;
      this.setState(this.state);
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg).data;
      this.state.listCommunitiesResponse = Some({
        communities: [data.community_view],
      });
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
