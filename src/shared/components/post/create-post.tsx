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
  toOption,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
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
  toast,
  wsClient,
  wsSubscribe,
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
  private isoData = setIsoData(this.context, ListCommunitiesResponse);
  private subscription: Subscription;
  private emptyState: CreatePostState = {
    siteRes: this.isoData.site_res,
    listCommunitiesResponse: None,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;

    this.handlePostCreate = this.handlePostCreate.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        listCommunitiesResponse: Some(
          this.isoData.routeData[0] as ListCommunitiesResponse
        ),
        loading: false,
      };
    } else {
      this.refetch();
    }
  }

  refetch() {
    this.params.nameOrId.match({
      some: opt =>
        opt.match({
          left: name => {
            let form = new GetCommunity({
              name: Some(name),
              id: None,
              auth: auth(false).ok(),
            });
            WebSocketService.Instance.send(wsClient.getCommunity(form));
          },
          right: id => {
            let form = new GetCommunity({
              id: Some(id),
              name: None,
              auth: auth(false).ok(),
            });
            WebSocketService.Instance.send(wsClient.getCommunity(form));
          },
        }),
      none: () => {
        let listCommunitiesForm = new ListCommunities({
          type_: Some(ListingType.All),
          sort: Some(SortType.TopAll),
          limit: Some(fetchLimit),
          page: None,
          auth: auth(false).ok(),
        });
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
    return `${i18n.t("create_post")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="container-lg">
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
              <div className="row">
                <div className="col-12 col-lg-6 offset-lg-3 mb-4">
                  <h5>{i18n.t("create_post")}</h5>
                  <PostForm
                    post_view={None}
                    communities={Some(res.communities)}
                    onCreate={this.handlePostCreate}
                    params={Some(this.params)}
                    enableDownvotes={enableDownvotes(this.state.siteRes)}
                    enableNsfw={enableNsfw(this.state.siteRes)}
                    allLanguages={this.state.siteRes.all_languages}
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
      return toOption(this.props.match.params.name);
    } else if (this.props.location.state) {
      let lastLocation = this.props.location.state.prevPath;
      if (lastLocation.includes("/c/")) {
        return toOption(lastLocation.split("/c/")[1]);
      }
    }
    return None;
  }

  get prevCommunityId(): Option<number> {
    if (this.props.match.params.id) {
      return toOption(this.props.match.params.id);
    }
    return None;
  }

  handlePostCreate(post_view: PostView) {
    this.props.history.push(`/post/${post_view.post.id}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let listCommunitiesForm = new ListCommunities({
      type_: Some(ListingType.All),
      sort: Some(SortType.TopAll),
      limit: Some(fetchLimit),
      page: None,
      auth: req.auth,
    });
    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(
        msg,
        ListCommunitiesResponse
      );
      this.setState({ listCommunitiesResponse: Some(data), loading: false });
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg, GetCommunityResponse);
      this.setState({
        listCommunitiesResponse: Some({
          communities: [data.community_view],
        }),
        loading: false,
      });
    }
  }
}
