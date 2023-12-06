import { getQueryParams } from "@utils/helpers";
import { QueryParams, RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityView,
  LemmyHttp,
  ResolveObjectResponse,
} from "lemmy-js-client";
import { InitialFetchRequest, IsoData } from "../interfaces";
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

interface RemoteFetchProps {
  uri?: string;
}

type RemoteFetchData = RouteDataResponse<{
  resolveObjectRes: ResolveObjectResponse;
}>;

interface RemoteFetchState {
  resolveObjectRes: RequestState<ResolveObjectResponse>;
  isIsomorphic: boolean;
  followCommunityLoading: boolean;
}

const getUriFromQuery = (uri?: string): string | undefined =>
  uri ? decodeURIComponent(uri) : undefined;

const getRemoteFetchQueryParams = () =>
  getQueryParams<RemoteFetchProps>({
    uri: getUriFromQuery,
  });

function uriToQuery(uri: string) {
  const match = decodeURIComponent(uri).match(/https?:\/\/(.+)\/c\/(.+)/);

  return match ? `!${match[2]}@${match[1]}` : "";
}

async function handleToggleFollow(i: RemoteFetch, follow: boolean) {
  const { resolveObjectRes } = i.state;
  if (resolveObjectRes.state === "success" && resolveObjectRes.data.community) {
    i.setState({
      followCommunityLoading: true,
    });

    const communityRes = await HttpService.client.followCommunity({
      community_id: resolveObjectRes.data.community.community.id,
      follow,
    });

    i.setState(prev => {
      if (
        communityRes.state === "success" &&
        prev.resolveObjectRes.state === "success" &&
        prev.resolveObjectRes.data.community
      ) {
        prev.resolveObjectRes.data.community = communityRes.data.community_view;
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

export class RemoteFetch extends Component<any, RemoteFetchState> {
  get isoData(): IsoData<RemoteFetchData> {
    return this.context.store.getState().value;
  }
  state: RemoteFetchState = {
    resolveObjectRes: EMPTY_REQUEST,
    isIsomorphic: false,
    followCommunityLoading: false,
  };

  constructor(props: any, context: any) {
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

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      const { uri } = getRemoteFetchQueryParams();

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

  get content() {
    const res = this.state.resolveObjectRes;

    const { uri } = getRemoteFetchQueryParams();
    const remoteCommunityName = uri ? uriToQuery(uri) : "remote community";

    switch (res.state) {
      case "success": {
        const communityView = res.data.community as CommunityView;
        return (
          <>
            <h1>{I18NextService.i18n.t("community_federated")}</h1>
            <div className="card mt-5">
              {communityView.community.banner && (
                <PictrsImage src={communityView.community.banner} cardTop />
              )}
              <div className="card-body">
                <h2 className="card-title">
                  <CommunityLink community={communityView.community} />
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
    const { uri } = getRemoteFetchQueryParams();
    const name = this.isoData.site_res.site_view.site.name;
    return `${I18NextService.i18n.t("remote_follow")} - ${
      uri ? `${uri} - ` : ""
    }${name}`;
  }

  static async fetchInitialData({
    headers,
    query: { uri },
  }: InitialFetchRequest<
    QueryParams<RemoteFetchProps>
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
