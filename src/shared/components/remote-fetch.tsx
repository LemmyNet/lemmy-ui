import { myAuthRequired, setIsoData } from "@utils/app";
import { getQueryParams } from "@utils/helpers";
import { QueryParams, RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { ResolveObjectResponse } from "lemmy-js-client";
import { InitialFetchRequest } from "../interfaces";
import { FirstLoadService, HttpService, I18NextService } from "../services";
import { RequestState } from "../services/HttpService";
import { HtmlTags } from "./common/html-tags";

interface RemoteFetchProps {
  uri?: string;
}

type RemoteFetchData = RouteDataResponse<{
  resolveObjectRes: ResolveObjectResponse;
}>;

interface RemoteFetchState {
  resolveObjectRes: RequestState<ResolveObjectResponse>;
  isIsomorphic: boolean;
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

export class RemoteFetch extends Component<any, RemoteFetchState> {
  private isoData = setIsoData<RemoteFetchData>(this.context);
  state: RemoteFetchState = {
    resolveObjectRes: { state: "empty" },
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (FirstLoadService.isFirstLoad) {
      //   const { resolveObjectRes } = this.isoData.routeData;

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
      <div className="remote-fetch container-lg d-flex">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row flex-grow-1 align-items-center">
          <div className="col-12 col-lg-6 offset-lg-3 text-center">
            {this.content}
          </div>
        </div>
      </div>
    );
  }

  get content() {
    const status: "success" | "loading" | "empty" = "success";

    switch (status) {
      case "success": {
        return (
          <>
            <h1>Community Federated!</h1>
            <Link href="/" className="btn btn-lg bt-link btn-primary mt-5">
              Click to visit com
            </Link>
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
