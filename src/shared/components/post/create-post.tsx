import {
  communityToChoice,
  enableDownvotes,
  enableNsfw,
  setIsoData,
  voteDisplayMode,
} from "@utils/app";
import { getIdFromString, getQueryParams } from "@utils/helpers";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  CreatePost as CreatePostI,
  GetCommunity,
  GetCommunityResponse,
  GetSiteResponse,
  LemmyHttp,
  ListCommunitiesResponse,
} from "lemmy-js-client";
import { InitialFetchRequest, PostFormParams } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  RequestState,
  WrappedLemmyHttp,
  wrapClient,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PostForm } from "./post-form";
import { getHttpBaseInternal } from "../../utils/env";
import { IRoutePropsWithFetch } from "../../routes";
import { simpleScrollMixin } from "../mixins/scroll-mixin";

export interface CreatePostProps {
  communityId?: number;
}

type CreatePostData = RouteDataResponse<{
  communityResponse: GetCommunityResponse;
  initialCommunitiesRes: ListCommunitiesResponse;
}>;

export function getCreatePostQueryParams(source?: string): CreatePostProps {
  return getQueryParams<CreatePostProps>(
    {
      communityId: getIdFromString,
    },
    source,
  );
}

function fetchCommunitiesForOptions(client: WrappedLemmyHttp) {
  return client.listCommunities({ limit: 30, sort: "TopMonth", type_: "All" });
}

interface CreatePostState {
  siteRes: GetSiteResponse;
  loading: boolean;
  selectedCommunityChoice?: Choice;
  initialCommunitiesRes: RequestState<ListCommunitiesResponse>;
  isIsomorphic: boolean;
}

type CreatePostPathProps = Record<string, never>;
type CreatePostRouteProps = RouteComponentProps<CreatePostPathProps> &
  CreatePostProps;
export type CreatePostFetchConfig = IRoutePropsWithFetch<
  CreatePostData,
  CreatePostPathProps,
  CreatePostProps
>;

@simpleScrollMixin
export class CreatePost extends Component<
  CreatePostRouteProps,
  CreatePostState
> {
  private isoData = setIsoData<CreatePostData>(this.context);
  state: CreatePostState = {
    siteRes: this.isoData.site_res,
    loading: true,
    initialCommunitiesRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  constructor(props: CreatePostRouteProps, context: any) {
    super(props, context);

    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.handleSelectedCommunityChange =
      this.handleSelectedCommunityChange.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { communityResponse: communityRes, initialCommunitiesRes } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        loading: false,
        initialCommunitiesRes,
        isIsomorphic: true,
      };

      if (communityRes?.state === "success") {
        const communityChoice = communityToChoice(
          communityRes.data.community_view,
        );

        this.state = {
          ...this.state,
          selectedCommunityChoice: communityChoice,
        };
      }
    }
  }

  async fetchCommunity({ communityId }: CreatePostProps) {
    if (communityId) {
      const res = await HttpService.client.getCommunity({
        id: communityId,
      });
      if (res.state === "success") {
        this.setState({
          selectedCommunityChoice: communityToChoice(res.data.community_view),
          loading: false,
        });
      }
    }
  }

  async componentDidMount() {
    // TODO test this
    if (!this.state.isIsomorphic) {
      const { communityId } = this.props;

      const initialCommunitiesRes = await fetchCommunitiesForOptions(
        HttpService.client,
      );

      this.setState({
        initialCommunitiesRes,
      });

      if (
        communityId?.toString() !== this.state.selectedCommunityChoice?.value
      ) {
        await this.fetchCommunity({ communityId });
      } else if (!communityId) {
        this.setState({
          selectedCommunityChoice: undefined,
          loading: false,
        });
      }
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("create_post")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    const { selectedCommunityChoice, siteRes } = this.state;

    const locationState = this.props.history.location.state as
      | PostFormParams
      | undefined;

    return (
      <div className="create-post container-lg">
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
            <div
              id="createPostForm"
              className="col-12 col-lg-6 offset-lg-3 mb-4"
            >
              <h1 className="h4 mb-4">
                {I18NextService.i18n.t("create_post")}
              </h1>
              <PostForm
                onCreate={this.handlePostCreate}
                params={locationState}
                enableDownvotes={enableDownvotes(siteRes)}
                voteDisplayMode={voteDisplayMode(siteRes)}
                enableNsfw={enableNsfw(siteRes)}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                selectedCommunityChoice={selectedCommunityChoice}
                onSelectCommunity={this.handleSelectedCommunityChange}
                initialCommunities={
                  this.state.initialCommunitiesRes.state === "success"
                    ? this.state.initialCommunitiesRes.data.communities
                    : []
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  async updateUrl({ communityId }: Partial<CreatePostProps>) {
    const locationState = this.props.history.location.state as
      | PostFormParams
      | undefined;

    const url = new URL(location.href);

    const newId = communityId?.toString();

    if (newId !== undefined) {
      url.searchParams.set("communityId", newId);
    } else {
      url.searchParams.delete("communityId");
    }

    // This bypasses the router and doesn't update the query props.
    window.history.replaceState(locationState, "", url);

    await this.fetchCommunity({ communityId });
  }

  handleSelectedCommunityChange(choice: Choice) {
    this.updateUrl({
      communityId: getIdFromString(choice?.value),
    });
  }

  async handlePostCreate(form: CreatePostI) {
    const res = await HttpService.client.createPost(form);

    if (res.state === "success") {
      const postId = res.data.post_view.post.id;
      this.props.history.replace(`/post/${postId}`);
    } else {
      this.setState({
        loading: false,
      });
    }
  }

  static async fetchInitialData({
    headers,
    query: { communityId },
  }: InitialFetchRequest<
    CreatePostPathProps,
    CreatePostProps
  >): Promise<CreatePostData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const data: CreatePostData = {
      initialCommunitiesRes: await fetchCommunitiesForOptions(client),
      communityResponse: EMPTY_REQUEST,
    };

    if (communityId) {
      const form: GetCommunity = {
        id: communityId,
      };

      data.communityResponse = await client.getCommunity(form);
    }

    return data;
  }
}
