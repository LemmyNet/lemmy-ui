import { Component } from "inferno";
import { Redirect } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  GetCommunity,
  GetCommunityResponse,
  GetSiteResponse,
  PostView,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest, PostFormParams } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  Choice,
  QueryParams,
  enableDownvotes,
  enableNsfw,
  getIdFromString,
  getQueryParams,
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

export interface CreatePostProps {
  communityId?: number;
}

function getCreatePostQueryParams() {
  return getQueryParams<CreatePostProps>({
    communityId: getIdFromString,
  });
}

interface CreatePostState {
  siteRes: GetSiteResponse;
  loading: boolean;
  selectedCommunityChoice?: Choice;
}

export class CreatePost extends Component<
  RouteComponentProps<Record<string, never>>,
  CreatePostState
> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: CreatePostState = {
    siteRes: this.isoData.site_res,
    loading: true,
  };

  constructor(props: RouteComponentProps<Record<string, never>>, context: any) {
    super(props, context);

    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.handleSelectedCommunityChange =
      this.handleSelectedCommunityChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path === this.context.router.route.match.url) {
      const communityRes = this.isoData.routeData[0] as
        | GetCommunityResponse
        | undefined;

      if (communityRes) {
        const communityChoice: Choice = {
          label: communityRes.community_view.community.title,
          value: communityRes.community_view.community.id.toString(),
        };

        this.state = {
          ...this.state,
          selectedCommunityChoice: communityChoice,
        };
      }

      this.state = {
        ...this.state,
        loading: false,
      };
    } else {
      this.fetchCommunity();
    }
  }

  fetchCommunity() {
    const { communityId } = getCreatePostQueryParams();
    const auth = myAuth(false);

    if (communityId) {
      const form: GetCommunity = {
        id: communityId,
        auth,
      };

      WebSocketService.Instance.send(wsClient.getCommunity(form));
    }
  }

  componentDidMount(): void {
    const { communityId } = getCreatePostQueryParams();

    if (communityId?.toString() !== this.state.selectedCommunityChoice?.value) {
      this.fetchCommunity();
    } else if (!communityId) {
      this.setState({
        selectedCommunityChoice: undefined,
        loading: false,
      });
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
    const { selectedCommunityChoice } = this.state;

    const locationState = this.props.history.location.state as
      | PostFormParams
      | undefined;

    return (
      <div className="container-lg">
        {!UserService.Instance.myUserInfo && <Redirect to="/login" />}
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div className="row">
            <div className="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t("create_post")}</h5>
              <PostForm
                onCreate={this.handlePostCreate}
                params={locationState}
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                enableNsfw={enableNsfw(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
                selectedCommunityChoice={selectedCommunityChoice}
                onSelectCommunity={this.handleSelectedCommunityChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  updateUrl({ communityId }: Partial<CreatePostProps>) {
    const { communityId: urlCommunityId } = getCreatePostQueryParams();

    const locationState = this.props.history.location.state as
      | PostFormParams
      | undefined;

    const url = new URL(location.href);

    const newId = (communityId ?? urlCommunityId)?.toString();

    if (newId !== undefined) {
      url.searchParams.set("communityId", newId);
    } else {
      url.searchParams.delete("communityId");
    }

    history.replaceState(locationState, "", url);

    this.fetchCommunity();
  }

  handleSelectedCommunityChange(choice: Choice) {
    this.updateUrl({
      communityId: getIdFromString(choice?.value),
    });
  }

  handlePostCreate(post_view: PostView) {
    this.props.history.replace(`/post/${post_view.post.id}`);
  }

  static fetchInitialData({
    client,
    query: { communityId },
    auth,
  }: InitialFetchRequest<QueryParams<CreatePostProps>>): Promise<any>[] {
    const promises: Promise<any>[] = [];

    if (communityId) {
      const form: GetCommunity = {
        auth,
        id: getIdFromString(communityId),
      };

      promises.push(client.getCommunity(form));
    } else {
      promises.push(Promise.resolve());
    }

    return promises;
  }

  parseMessage(msg: any) {
    const op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    }

    if (op === UserOperation.GetCommunity) {
      const {
        community_view: {
          community: { title, id },
        },
      } = wsJsonToRes<GetCommunityResponse>(msg);

      this.setState({
        selectedCommunityChoice: { label: title, value: id.toString() },
        loading: false,
      });
    }
  }
}
