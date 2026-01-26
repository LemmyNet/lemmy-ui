import {
  communityToChoice,
  enableNsfw,
  filterCommunitySelection,
  setIsoData,
} from "@utils/app";
import {
  bareRoutePush,
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
  CommunityView,
  CreatePost as CreatePostI,
  GetCommunity,
  GetCommunityResponse,
  LemmyHttp,
  PagedResponse,
} from "lemmy-js-client";
import { InitialFetchRequest, PostFormParams } from "@utils/types";
import { FirstLoadService, I18NextService } from "@services/index";
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
import { IRoutePropsWithFetch } from "@utils/routes";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { toast } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { NoOptionI18nKeys } from "i18next";
import { CommunitySidebar } from "@components/community/community-sidebar";
import { Icon } from "@components/common/icon";

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
  initialCommunitiesRes: PagedResponse<CommunityView>;
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
  return client.listCommunities({
    limit: 30,
    sort: "active_monthly",
    type_: "all",
  });
}

function stringAsQueryParam(param?: string) {
  return (param?.length ?? 0) > 0 ? param : undefined;
}

interface CreatePostState {
  loading: boolean;
  selectedCommunity?: CommunityView;
  selectedCommunityIsNsfw: boolean;
  initialCommunitiesRes: RequestState<PagedResponse<CommunityView>>;
  isIsomorphic: boolean;
  resetCounter: number; // resets PostForm when changed
  showSidebarMobile: boolean;
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
    loading: false,
    initialCommunitiesRes: EMPTY_REQUEST,
    isIsomorphic: false,
    resetCounter: 0,
    selectedCommunityIsNsfw: false,
    showSidebarMobile: false,
  };

  constructor(props: CreatePostRouteProps, context: any) {
    super(props, context);

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
        this.state = {
          ...this.state,
          selectedCommunity: communityRes.data.community_view,
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
          selectedCommunity: res.data.community_view,
          selectedCommunityIsNsfw: res.data.community_view.community.nsfw,
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
        communityId?.toString() !== this.state.selectedCommunity?.community.id
      ) {
        await this.fetchCommunity({ communityId });
      } else if (!communityId) {
        this.setState({
          selectedCommunity: undefined,
          loading: false,
        });
      }

      const locationState = this.props.history.location.state as
        | CrossPostParams
        | undefined;
      if (locationState) {
        this.updateUrl({
          title: locationState.name,
          url: locationState.url,
          body: locationState.body,
          altText: locationState.altText,
          nsfw: locationState.nsfw,
          languageId: locationState.languageId,
          customThumbnailUrl: locationState.customThumbnailUrl,
        });
        this.setState(s => ({ resetCounter: s.resetCounter + 1 }));
      }
    }
  }

  componentWillReceiveProps(nextProps: CreatePostRouteProps) {
    if (bareRoutePush(this.props, nextProps)) {
      this.setState(s => ({ resetCounter: s.resetCounter + 1 }));
    }
    if (this.props.communityId !== nextProps.communityId) {
      this.fetchCommunity(nextProps);
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("create_post")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    const { selectedCommunity, selectedCommunityIsNsfw, loading } = this.state;
    const {
      body,
      communityId,
      customThumbnailUrl,
      languageId,
      title,
      nsfw,
      url,
      altText,
    } = this.props;

    const params: PostFormParams = {
      name: title,
      url,
      body,
      community_id: communityId,
      custom_thumbnail: customThumbnailUrl,
      language_id: languageId,
      nsfw: nsfw === "true",
      alt_text: altText,
    };

    const siteRes = this.isoData.siteRes;
    const selectedCommunityChoice = selectedCommunity
      ? communityToChoice(selectedCommunity)
      : undefined;
    return (
      <div className="create-post container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div id="createPostForm" className="col-12 col-lg-6 offset-lg-2 mb-4">
            <h1 className="h4 mb-4">{I18NextService.i18n.t("create_post")}</h1>
            <PostForm
              key={this.state.resetCounter}
              onCreate={(form, bypassNav) =>
                handlePostCreate(this, form, bypassNav)
              }
              params={params}
              enableNsfw={enableNsfw(siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={siteRes?.all_languages}
              siteLanguages={siteRes?.discussion_languages}
              selectedCommunityChoice={selectedCommunityChoice}
              onSelectCommunity={form =>
                handleSelectedCommunityChange(this, form)
              }
              initialCommunities={
                this.state.initialCommunitiesRes.state === "success"
                  ? filterCommunitySelection(
                      this.state.initialCommunitiesRes.data.items,
                      this.isoData.myUserInfo,
                    )
                  : []
              }
              loading={loading}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onBodyBlur={form => handleBodyBlur(this, form)}
              onLanguageChange={languangeId =>
                handleLanguageChange(this, languangeId)
              }
              onTitleBlur={form => handleTitleBlur(this, form)}
              onUrlBlur={form => handleUrlBlur(this, form)}
              onThumbnailUrlBlur={form => handleThumbnailUrlBlur(this, form)}
              onNsfwChange={form => handleNsfwChange(this, form)}
              onAltTextBlur={form => handleAltTextBlur(this, form)}
              onCopySuggestedTitle={(url, title) =>
                handleCopySuggestedTitle(this, url, title)
              }
              isNsfwCommunity={selectedCommunityIsNsfw}
            />
          </div>
          <div className="d-block d-md-none">
            <button
              className="btn btn-secondary d-inline-block mb-2 me-3"
              onClick={() => handleShowSidebarMobile(this)}
            >
              {I18NextService.i18n.t("sidebar")}{" "}
              <Icon
                icon={
                  this.state.showSidebarMobile ? `minus-square` : `plus-square`
                }
                classes="icon-inline"
              />
            </button>
            {this.state.showSidebarMobile && this.sidebar()}
          </div>
          <aside className="d-none d-md-block col-md-4 col-lg-3">
            {this.sidebar()}
          </aside>
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

  sidebar() {
    if (this.state.selectedCommunity) {
      return (
        <CommunitySidebar
          communityView={this.state.selectedCommunity}
          moderators={[]} // TODO: fetch GetCommunityResponse?
          admins={this.isoData.siteRes.admins}
          enableNsfw={enableNsfw(this.isoData.siteRes)}
          showIcon
          allLanguages={this.isoData.siteRes.all_languages}
          siteLanguages={this.isoData.siteRes.discussion_languages}
          myUserInfo={this.isoData.myUserInfo}
          hideButtons
          onFollow={() => {}}
          onBlock={() => {}}
          onEditNotifs={() => {}}
          onRemove={() => {}}
          onPurge={() => {}}
          removeLoading={false}
          purgeLoading={false}
          followLoading={false}
        />
      );
    }
  }
}

function handleSelectedCommunityChange(i: CreatePost, choice: Choice) {
  i.updateUrl({
    communityId: getIdFromString(choice?.value),
  });
}

function handleTitleBlur(i: CreatePost, title: string) {
  i.updateUrl({ title });
}

function handleUrlBlur(i: CreatePost, url: string) {
  i.updateUrl({ url });
}

function handleBodyBlur(i: CreatePost, body: string) {
  i.updateUrl({ body });
}

function handleLanguageChange(i: CreatePost, languageId: number | undefined) {
  i.updateUrl({ languageId });
}

function handleNsfwChange(i: CreatePost, nsfw: StringBoolean) {
  i.updateUrl({ nsfw });
}

function handleThumbnailUrlBlur(i: CreatePost, customThumbnailUrl: string) {
  i.updateUrl({ customThumbnailUrl });
}

function handleAltTextBlur(i: CreatePost, altText: string) {
  i.updateUrl({ altText });
}

function handleCopySuggestedTitle(i: CreatePost, url: string, title: string) {
  i.updateUrl({ url, title });
}

async function handlePostCreate(
  i: CreatePost,
  form: CreatePostI,
  bypassNavWarning: () => void,
) {
  i.setState({ loading: true });
  const res = await HttpService.client.createPost(form);

  if (res.state === "success") {
    const postId = res.data.post_view.post.id;
    bypassNavWarning();
    i.props.history.replace(`/post/${postId}`);
  } else if (res.state === "failed") {
    i.setState({
      loading: false,
    });
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
}

function handleShowSidebarMobile(i: CreatePost) {
  i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
}
