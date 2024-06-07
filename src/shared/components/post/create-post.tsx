import {
  communityToChoice,
  enableDownvotes,
  enableNsfw,
  setIsoData,
  voteDisplayMode,
} from "@utils/app";
import {
  getIdFromString,
  getQueryParams,
  getQueryString,
} from "@utils/helpers";
import {
  Choice,
  CrossPostParams,
  QueryParams,
  RouteDataResponse,
  StringBoolean,
} from "@utils/types";
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
import { PostForm } from "./post-form";
import { getHttpBaseInternal } from "../../utils/env";
import { IRoutePropsWithFetch } from "../../routes";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { toast } from "../../toast";
import { isBrowser } from "@utils/browser";

export interface CreatePostProps {
  communityId?: number;
  url?: string;
  title?: string;
  body?: string;
  languageId?: number;
  nsfw?: StringBoolean;
  customThumbnailUrl?: string;
  altText?: string;
}

type CreatePostData = RouteDataResponse<{
  communityResponse: GetCommunityResponse;
  initialCommunitiesRes: ListCommunitiesResponse;
}>;

export function getCreatePostQueryParams(source?: string): CreatePostProps {
  return getQueryParams<CreatePostProps>(
    {
      communityId: getIdFromString,
      url: (url?: string) => url,
      body: (body?: string) => body,
      languageId: getIdFromString,
      nsfw: (nsfw?: StringBoolean) => nsfw,
      customThumbnailUrl: (customThumbnailUrl?: string) => customThumbnailUrl,
      title: (title?: string) => title,
      altText: (altText?: string) => altText,
    },
    source,
  );
}

function fetchCommunitiesForOptions(client: WrappedLemmyHttp) {
  return client.listCommunities({ limit: 30, sort: "TopMonth", type_: "All" });
}

function stringAsQueryParam(param?: string) {
  return (param?.length ?? 0) > 0 ? param : undefined;
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
    loading: false,
    initialCommunitiesRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  constructor(props: CreatePostRouteProps, context: any) {
    super(props, context);

    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.handleSelectedCommunityChange =
      this.handleSelectedCommunityChange.bind(this);
    this.handleTitleBlur = this.handleTitleBlur.bind(this);
    this.handleUrlBlur = this.handleUrlBlur.bind(this);
    this.handleBodyBlur = this.handleBodyBlur.bind(this);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
    this.handleNsfwChange = this.handleNsfwChange.bind(this);
    this.handleThumbnailUrlBlur = this.handleThumbnailUrlBlur.bind(this);
    this.handleAltTextBlur = this.handleAltTextBlur.bind(this);
    this.handleCopySuggestedTitle = this.handleCopySuggestedTitle.bind(this);

    // Only fetch the data if coming from another routeupdate
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

  async componentWillMount() {
    // TODO test this
    if (!this.state.isIsomorphic && isBrowser()) {
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
    const { selectedCommunityChoice, siteRes, loading } = this.state;
    const {
      body,
      communityId,
      customThumbnailUrl,
      languageId,
      title,
      nsfw,
      url,
    } = this.props;

    // Only use the name, url, and body from this
    const locationState = this.props.history.location.state as
      | CrossPostParams
      | undefined;

    const params: PostFormParams = {
      name: title || locationState?.name,
      url: url || locationState?.url,
      body: body || locationState?.body,
      community_id: communityId,
      custom_thumbnail: customThumbnailUrl,
      language_id: languageId,
      nsfw: nsfw === "true",
    };

    return (
      <div className="create-post container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div id="createPostForm" className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">{I18NextService.i18n.t("create_post")}</h1>
            <PostForm
              onCreate={this.handlePostCreate}
              params={params}
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
              loading={loading}
              onBodyBlur={this.handleBodyBlur}
              onLanguageChange={this.handleLanguageChange}
              onTitleBlur={this.handleTitleBlur}
              onUrlBlur={this.handleUrlBlur}
              onThumbnailUrlBlur={this.handleThumbnailUrlBlur}
              onNsfwChange={this.handleNsfwChange}
              onCopySuggestedTitle={this.handleCopySuggestedTitle}
            />
          </div>
        </div>
      </div>
    );
  }

  async updateUrl(props: Partial<CreatePostProps>) {
    const {
      body,
      communityId,
      customThumbnailUrl,
      languageId,
      nsfw,
      url,
      title,
      altText,
    } = {
      ...this.props,
      ...props,
    };

    const createPostQueryParams: QueryParams<CreatePostProps> = {
      body: stringAsQueryParam(body),
      communityId: communityId?.toString(),
      customThumbnailUrl: stringAsQueryParam(customThumbnailUrl),
      languageId: languageId?.toString(),
      title: stringAsQueryParam(title),
      nsfw,
      url: stringAsQueryParam(url),
      altText: stringAsQueryParam(altText),
    };

    this.props.history.replace({
      pathname: "/create_post",
      search: getQueryString(createPostQueryParams),
    });

    await this.fetchCommunity({ communityId });
  }

  handleSelectedCommunityChange(choice: Choice) {
    this.updateUrl({
      communityId: getIdFromString(choice?.value),
    });
  }

  handleTitleBlur(title: string) {
    this.updateUrl({ title });
  }

  handleUrlBlur(url: string) {
    this.updateUrl({ url });
  }

  handleBodyBlur(body: string) {
    this.updateUrl({ body });
  }

  handleLanguageChange(languageId: number) {
    this.updateUrl({ languageId });
  }

  handleNsfwChange(nsfw: StringBoolean) {
    this.updateUrl({ nsfw });
  }

  handleThumbnailUrlBlur(customThumbnailUrl: string) {
    this.updateUrl({ customThumbnailUrl });
  }

  handleAltTextBlur(altText: string) {
    this.updateUrl({ altText });
  }

  handleCopySuggestedTitle(url: string, title: string) {
    this.updateUrl({ url, title });
  }

  async handlePostCreate(form: CreatePostI, bypassNavWarning: () => void) {
    this.setState({ loading: true });
    const res = await HttpService.client.createPost(form);

    if (res.state === "success") {
      const postId = res.data.post_view.post.id;
      bypassNavWarning();
      this.props.history.replace(`/post/${postId}`);
    } else if (res.state === "failed") {
      this.setState({
        loading: false,
      });
      toast(I18NextService.i18n.t(res.err.message), "danger");
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
