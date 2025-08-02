import { setIsoData } from "@utils/app";
import { getQueryParams, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "./mixins/scroll-mixin";
import { RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import { CommunityView, LemmyHttp, SearchResponse } from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, HttpService, I18NextService } from "../services";
import {
  EMPTY_REQUEST,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../services/HttpService";
import { HtmlTags } from "./common/html-tags";
import { Spinner } from "./common/icon";
import { LoadingEllipses } from "./common/loading-ellipses";
import { PictrsImage } from "./common/pictrs-image";
import { SubscribeButton } from "./common/subscribe-button";
import { CommunityLink } from "./community/community-link";
import { getHttpBaseInternal } from "../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";

interface RemoteFetchProps {
  uri?: string;
}

type RemoteFetchData = RouteDataResponse<{
  resolveObjectRes: SearchResponse;
}>;

interface RemoteFetchState {
  resolveObjectRes: RequestState<SearchResponse>;
  isIsomorphic: boolean;
  followCommunityLoading: boolean;
}

const getUriFromQuery = (uri?: string): string | undefined => uri;

export function getRemoteFetchQueryParams(source?: string): RemoteFetchProps {
  return getQueryParams<RemoteFetchProps>(
    {
      uri: getUriFromQuery,
    },
    source,
  );
}

function uriToQuery(uri: string) {
  const match = uri.match(/https?:\/\/(.+)\/c\/(.+)/);

  return match ? `!${match[2]}@${match[1]}` : "";
}

async function handleToggleFollow(i: RemoteFetch, follow: boolean) {
  const { community } = i;
  if (community) {
    i.setState({
      followCommunityLoading: true,
    });

    const communityRes = await HttpService.client.followCommunity({
      community_id: community.community.id,
      follow,
    });

    i.setState(prev => {
      if (communityRes.state === "success") {
        community.community_actions =
          communityRes.data.community_view.community_actions;
      }

      return {
        ...prev,
        followCommunityLoading: false,
      };
    });
  }
}

const handleFollow = (i: RemoteFetch) => handleToggleFollow(i, true);
const handleUnfollow = (i: RemoteFetch) => handleToggleFollow(i, false);

type RemoteFetchPathProps = Record<string, never>;
type RemoteFetchRouteProps = RouteComponentProps<RemoteFetchPathProps> &
  RemoteFetchProps;
export type RemoteFetchFetchConfig = IRoutePropsWithFetch<
  RemoteFetchData,
  RemoteFetchPathProps,
  RemoteFetchProps
>;

@scrollMixin
export class RemoteFetch extends Component<
  RemoteFetchRouteProps,
  RemoteFetchState
> {
  private isoData = setIsoData<RemoteFetchData>(this.context);
  state: RemoteFetchState = {
    resolveObjectRes: EMPTY_REQUEST,
    isIsomorphic: false,
    followCommunityLoading: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.resolveObjectRes]);
  }

  constructor(props: RemoteFetchRouteProps, context: any) {
    super(props, context);

    if (FirstLoadService.isFirstLoad) {
      const { resolveObjectRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        resolveObjectRes,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      const { uri } = this.props;

      if (uri) {
        this.setState({ resolveObjectRes: LOADING_REQUEST });
        this.setState({
          resolveObjectRes: await HttpService.client.resolveObject({
            q: uriToQuery(uri),
          }),
        });
      }
    }
  }

  render() {
    return (
      <div className="remote-fetch container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 text-center">
            {this.content}
          </div>
        </div>
      </div>
    );
  }

  get community(): CommunityView | undefined {
    const { resolveObjectRes: res } = this.state;
    return res.state === "success"
      ? res.data.results.find(x => x.type_ === "Community")
      : undefined;
  }

  get content() {
    const res = this.state.resolveObjectRes;

    const { uri } = this.props;
    const remoteCommunityName = uri ? uriToQuery(uri) : "remote community";

    switch (res.state) {
      case "success": {
        const communityView = this.community;
        if (!communityView) {
          return (
            <>
              <div className="card mt-5">
                <div className="card-body">
                  <h2 className="card-title">
                    {I18NextService.i18n.t("could_not_fetch_community")}
                  </h2>
                </div>
              </div>
            </>
          );
        }
        return (
          <>
            <h1>{I18NextService.i18n.t("community_federated")}</h1>
            <div className="card mt-5">
              {communityView.community.banner && (
                <PictrsImage src={communityView.community.banner} cardTop />
              )}
              <div className="card-body">
                <h2 className="card-title">
                  <CommunityLink
                    community={communityView.community}
                    myUserInfo={this.isoData.myUserInfo}
                  />
                </h2>
                {communityView.community.description && (
                  <div className="card-text mb-3 preview-lines">
                    {communityView.community.description}
                  </div>
                )}
                <SubscribeButton
                  communityView={communityView}
                  onFollow={linkEvent(this, handleFollow)}
                  onUnFollow={linkEvent(this, handleUnfollow)}
                  loading={this.state.followCommunityLoading}
                  showRemoteFetch={!this.isoData.myUserInfo}
                />
              </div>
            </div>
          </>
        );
      }

      case "loading": {
        return (
          <>
            <h1>
              {I18NextService.i18n.t("fetching_community", {
                community: remoteCommunityName,
              })}
              <LoadingEllipses />
            </h1>
            <h5>
              <Spinner large />
            </h5>
          </>
        );
      }

      default: {
        return (
          <>
            <h1>
              {I18NextService.i18n.t("could_not_fetch_community", {
                community: remoteCommunityName,
              })}
            </h1>
          </>
        );
      }
    }
  }

  get documentTitle(): string {
    const { uri } = this.props;
    const name = this.isoData.siteRes?.site_view.site.name;
    return `${I18NextService.i18n.t("remote_follow")} - ${
      uri ? `${uri} - ` : ""
    }${name}`;
  }

  static async fetchInitialData({
    headers,
    query: { uri },
  }: InitialFetchRequest<
    RemoteFetchPathProps,
    RemoteFetchProps
  >): Promise<RemoteFetchData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const data: RemoteFetchData = { resolveObjectRes: EMPTY_REQUEST };

    if (uri && headers["Authorization"]) {
      data.resolveObjectRes = await client.resolveObject({
        q: uriToQuery(uri),
      });
    }

    return data;
  }
}
