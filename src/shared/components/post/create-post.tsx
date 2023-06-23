import { enableDownvotes, enableNsfw, myAuth, setIsoData } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { getIdFromString, getQueryParams } from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  CreatePost as CreatePostI,
  GetCommunity,
  GetCommunityResponse,
  GetSiteResponse,
  ListCommunitiesResponse,
} from "lemmy-js-client";
import { InitialFetchRequest, PostFormParams } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import {
  HttpService,
  RequestState,
  WrappedLemmyHttp,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PostForm } from "./post-form";

export interface CreatePostProps {
  communityId?: number;
}

type CreatePostData = RouteDataResponse<{
  communityResponse: GetCommunityResponse;
  initialCommunitiesRes: ListCommunitiesResponse;
}>;

function getCreatePostQueryParams() {
  return getQueryParams<CreatePostProps>({
    communityId: getIdFromString,
  });
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

export class CreatePost extends Component<
  RouteComponentProps<Record<string, never>>,
  CreatePostState
> {
  private isoData = setIsoData<CreatePostData>(this.context);
  state: CreatePostState = {
    siteRes: this.isoData.site_res,
    loading: true,
    initialCommunitiesRes: { state: "empty" },
    isIsomorphic: false,
  };

  constructor(props: RouteComponentProps<Record<string, never>>, context: any) {
    super(props, context);

    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.handleSelectedCommunityChange =
      this.handleSelectedCommunityChange.bind(this);

    // Only fetch the data if coming from another route
    if (!isBrowser() || FirstLoadService.isFirstLoad) {
      const { communityResponse: communityRes, initialCommunitiesRes } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        loading: false,
        initialCommunitiesRes,
        isIsomorphic: true,
      };

      if (communityRes?.state === "success") {
        const communityChoice: Choice = {
          label: communityRes.data.community_view.community.title,
          value: communityRes.data.community_view.community.id.toString(),
        };

        this.state = {
          ...this.state,
          selectedCommunityChoice: communityChoice,
        };
      }
    }
  }

  async fetchCommunity() {
    const { communityId } = getCreatePostQueryParams();
    const auth = myAuth();

    if (communityId) {
      const res = await HttpService.client.getCommunity({
        id: communityId,
        auth,
      });
      if (res.state === "success") {
        this.setState({
          selectedCommunityChoice: {
            label: res.data.community_view.community.title,
            value: res.data.community_view.community.id.toString(),
          },
          loading: false,
        });
      }
    }
  }

  async componentDidMount() {
    // TODO test this
    if (!this.state.isIsomorphic) {
      const { communityId } = getCreatePostQueryParams();

      const initialCommunitiesRes = await fetchCommunitiesForOptions(
        HttpService.client
      );

      this.setState({
        initialCommunitiesRes,
      });

      if (
        communityId?.toString() !== this.state.selectedCommunityChoice?.value
      ) {
        await this.fetchCommunity();
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
    const { selectedCommunityChoice } = this.state;

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
              <h1 className="h4">{I18NextService.i18n.t("create_post")}</h1>
              <PostForm
                onCreate={this.handlePostCreate}
                params={locationState}
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                enableNsfw={enableNsfw(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
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

    await this.fetchCommunity();
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
    client,
    query: { communityId },
    auth,
  }: InitialFetchRequest<
    QueryParams<CreatePostProps>
  >): Promise<CreatePostData> {
    const data: CreatePostData = {
      initialCommunitiesRes: await fetchCommunitiesForOptions(client),
      communityResponse: { state: "empty" },
    };

    if (communityId) {
      const form: GetCommunity = {
        auth,
        id: getIdFromString(communityId),
      };

      data.communityResponse = await client.getCommunity(form);
    }

    return data;
  }
}
