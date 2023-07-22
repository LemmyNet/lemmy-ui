import { myAuthRequired, setIsoData } from "@utils/app";
import { getQueryParams } from "@utils/helpers";
import { QueryParams, RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import { CommunityView, ResolveObjectResponse } from "lemmy-js-client";
import { InitialFetchRequest } from "../interfaces";
import { FirstLoadService, HttpService, I18NextService } from "../services";
import { RequestState } from "../services/HttpService";
import { HtmlTags } from "./common/html-tags";
import { Spinner } from "./common/icon";
import { LoadingEllipses } from "./common/loading-ellipses";
import { PictrsImage } from "./common/pictrs-image";
import { SubscribeButton } from "./common/subscribe-button";
import { CommunityLink } from "./community/community-link";

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

const _test_com_view: CommunityView = {
  community: {
    id: 2,
    name: "test",
    title: "Testy",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    removed: false,
    published: "2023-07-08T03:12:46.323277",
    updated: "2023-07-22T00:29:46.425846",
    deleted: false,
    nsfw: false,
    actor_id: "https://localhost/c/test",
    local: true,
    icon: "http://localhost:1236/pictrs/image/dc71f5e8-fdb2-48ae-8a49-f504e4adaf26.png",
    banner:
      "http://localhost:1236/pictrs/image/fdf28def-5c4d-49a6-84bc-fd6b5d901cc7.jpeg",
    hidden: false,
    posting_restricted_to_mods: false,
    instance_id: 1,
    followers_url: "dwdwdwd",
    inbox_url: "dwdwdwdw",
  },
  subscribed: "Subscribed",
  blocked: false,
  counts: {
    id: 1,
    community_id: 2,
    subscribers: 1,
    posts: 1,
    comments: 30,
    published: "2023-07-08T03:12:46.323277",
    users_active_day: 1,
    users_active_week: 1,
    users_active_month: 1,
    users_active_half_year: 1,
    hot_rank: 0,
  },
};

async function handleToggleFollow(i: RemoteFetch, follow: boolean) {
  const { resolveObjectRes } = i.state;
  if (resolveObjectRes.state === "success" && resolveObjectRes.data.community) {
    i.setState({
      followCommunityLoading: true,
    });

    const communityRes = await HttpService.client.followCommunity({
      auth: myAuthRequired(),
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
  private isoData = setIsoData<RemoteFetchData>(this.context);
  state: RemoteFetchState = {
    resolveObjectRes: { state: "empty" },
    isIsomorphic: false,
    followCommunityLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (FirstLoadService.isFirstLoad) {
      //      const { resolveObjectRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        // resolveObjectRes,
      };
    }
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      const { uri } = getRemoteFetchQueryParams();

      if (uri) {
        this.setState({ resolveObjectRes: { state: "loading" } });
        this.setState({
          resolveObjectRes: await HttpService.client.resolveObject({
            auth: myAuthRequired(),
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
    const status = "success" as "success" | "loading" | "empty";

    const { uri } = getRemoteFetchQueryParams();
    const remoteCommunityName = uri ? uriToQuery(uri) : "remote community";

    switch (status) {
      case "success": {
        return (
          <>
            <h1>Community Federated!</h1>
            <div className="card mt-5">
              {_test_com_view.community.banner && (
                <PictrsImage src={_test_com_view.community.banner} cardTop />
              )}
              <div className="card-body">
                <h2 className="card-title">
                  <CommunityLink community={_test_com_view.community} />
                </h2>
                {_test_com_view.community.description && (
                  <div className="card-text mb-3 preview-lines">
                    {_test_com_view.community.description}
                  </div>
                )}
                <SubscribeButton
                  subscribed={_test_com_view.subscribed}
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
              Fetching {remoteCommunityName}
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
            <h1>Could not fetch {remoteCommunityName}</h1>
          </>
        );
      }
    }
  }

  get documentTitle(): string {
    const { uri } = getRemoteFetchQueryParams();
    const name = this.isoData.site_res.site_view.site.name;
    return `${I18NextService.i18n.t("search")} - ${
      uri ? `${uri} - ` : ""
    }${name}`;
  }

  static async fetchInitialData({
    client,
    auth,
    query: { uri },
  }: InitialFetchRequest<
    QueryParams<RemoteFetchProps>
  >): Promise<RemoteFetchData> {
    const data: RemoteFetchData = { resolveObjectRes: { state: "empty" } };

    if (uri && auth) {
      data.resolveObjectRes = await client.resolveObject({
        auth,
        q: uriToQuery(uri),
      });
    }

    return data;
  }
}
