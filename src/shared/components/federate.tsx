import { myAuthRequired, setIsoData } from "@utils/app";
import { Choice, QueryParams, RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityView,
  FollowCommunity,
  GetFederatedInstancesResponse,
  ResolveObjectResponse,
} from "lemmy-js-client";
import { emDash } from "../../shared/config";
import { InitialFetchRequest } from "../../shared/interfaces";
import {
  FirstLoadService,
  HttpService,
  UserService,
} from "../../shared/services";
import { RequestState } from "../../shared/services/HttpService";
import { toast } from "../../shared/toast";
import { HtmlTags } from "./common/html-tags";
import { Spinner } from "./common/icon";
import { SearchableSelect } from "./common/searchable-select";
import CommunityCard from "./community/community-card";

type FederateData = RouteDataResponse<{
  federatedInstancesRes: GetFederatedInstancesResponse;
}>;

interface FederateState {
  isIsomorphic: boolean;
  federatedInstancesRes: RequestState<GetFederatedInstancesResponse>;
  communityName: string;
  selectedLinkedInstanceOption?: Choice;
  instanceDomain: string;
  linkedDomainQuery: string;
  resolveObjectRes: RequestState<ResolveObjectResponse>;
  loadingFollow: boolean;
}

function handleInstanceDomainChange(i: Federate, event: any) {
  i.setState({ instanceDomain: event.target.value });
}

function handleCommunityNameChange(i: Federate, event: any) {
  i.setState({ communityName: event.target.value });
}

async function handleSubmit(i: Federate, event: Event) {
  event.preventDefault();
  i.setState({ resolveObjectRes: { state: "loading" } });

  const resolveObjectRes = await HttpService.silent_client.resolveObject({
    auth: myAuthRequired(),
    q: i.webfinger,
  });

  if (resolveObjectRes.state === "failed") {
    toast(`Could not resolve ${i.webfinger}`, "danger");
  }

  i.setState({
    resolveObjectRes,
  });
}

// TODO: this is for local testing only. Delete before merge.
const testcom: CommunityView = {
  community: {
    id: 2,
    name: "test",
    title: "Test Com",
    description: "This is a test community.",
    removed: false,
    published: "2023-06-21T00:42:32.959825",
    updated: "2023-07-04T13:00:22.110683",
    deleted: false,
    nsfw: false,
    actor_id: "https://localhost/c/test",
    local: true,
    icon: "http://localhost:1236/pictrs/image/ee92a87c-d5b3-4373-8d37-fa24ba342c74.jpeg",
    hidden: false,
    posting_restricted_to_mods: false,
    instance_id: 1,
  },
  subscribed: "Subscribed",
  blocked: false,
  counts: {
    id: 1,
    community_id: 2,
    subscribers: 1,
    posts: 3,
    comments: 8,
    published: "2023-06-21T00:42:32.959825",
    users_active_day: 3,
    users_active_week: 3,
    users_active_month: 3,
    users_active_half_year: 3,
    hot_rank: 0,
  },
};

export class Federate extends Component<any, FederateState> {
  private isoData = setIsoData<FederateData>(this.context);
  state: FederateState = {
    isIsomorphic: false,
    federatedInstancesRes: { state: "empty" },
    resolveObjectRes: { state: "empty" },
    communityName: "",
    instanceDomain: "",
    linkedDomainQuery: "",
    loadingFollow: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (FirstLoadService.isFirstLoad) {
      this.state = {
        ...this.state,
        federatedInstancesRes: this.isoData.routeData.federatedInstancesRes,
        isIsomorphic: true,
      };
    }
  }

  render() {
    const {
      communityName,
      federatedInstancesRes,
      instanceDomain,
      selectedLinkedInstanceOption,
      linkedDomainQuery,
      resolveObjectRes,
    } = this.state;

    const instanceOptions: Choice[] = (
      federatedInstancesRes.state === "success"
        ? (federatedInstancesRes.data.federated_instances?.allowed.length ??
            0) > 0
          ? federatedInstancesRes.data.federated_instances?.allowed.map(
              ({ domain, id }) => ({ label: domain, value: id.toString() })
            ) ?? []
          : federatedInstancesRes.data.federated_instances?.linked.map(
              ({ domain, id }) => ({ label: domain, value: id.toString() })
            ) ?? []
        : []
    )
      .filter(
        option =>
          option.label.includes(linkedDomainQuery.toLowerCase()) &&
          option.value !== selectedLinkedInstanceOption?.value
      )
      .slice(0, 30);

    if (selectedLinkedInstanceOption) {
      instanceOptions.unshift(selectedLinkedInstanceOption);
    }

    return (
      <main className="federate container-lg">
        <HtmlTags
          title="Federate!"
          path={this.context.router.route.match.url}
        />
        <h1 className="h4 mb-4">Federate</h1>
        <p>
          Search for communities that aren&apos;t federated with your instance
          yet.
        </p>
        <form className="row" onSubmit={linkEvent(this, handleSubmit)}>
          <div className="col-12 col-md-6 my-2">
            <p className="alert alert-info">
              Enter the name of the community you want to federate. Make sure to
              use the part after the <code>/c</code> in a community&apos;s URL.
              E.g. if trying to federate with the community{" "}
              <a href="https://lemmy.ml/c/lemmy_support">
                lemmy.ml/c/lemmy_support
              </a>
              , enter <code>lemmy_support</code>, not &quot;Lemmy Support&quot;.
            </p>
            <input
              type="text"
              id="community-name-input"
              className="form-control"
              placeholder="Community name..."
              aria-label="Community Name"
              required
              minLength={3}
              value={communityName}
              onInput={linkEvent(this, handleCommunityNameChange)}
            />
          </div>
          <div className="col-12 col-md-6 my-2">
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="linked-instances-search-select"
              >
                Linked Instances
              </label>
              <SearchableSelect
                id="linked-instances-search-select"
                options={[{ label: emDash, value: "0" } as Choice].concat(
                  instanceOptions
                )}
                value={selectedLinkedInstanceOption?.value}
                onChange={this.handleLinkedInstanceChange}
                onSearch={this.handleSearch}
              />
            </div>
            {!selectedLinkedInstanceOption && (
              <div className="form-group mt-2">
                <label htmlFor="instance-name-input">
                  Is the instance you&apos;re looking for not linked already?
                  Enter it here!
                </label>
                <input
                  type="text"
                  id="instance-name-input"
                  className="form-control"
                  placeholder="Instance domain..."
                  value={instanceDomain}
                  onInput={linkEvent(this, handleInstanceDomainChange)}
                />
              </div>
            )}
          </div>
          <button
            className="btn btn-lg btn-secondary mx-auto col-auto mt-4"
            type="submit"
            disabled={
              !(
                communityName &&
                (selectedLinkedInstanceOption || instanceDomain)
              ) || resolveObjectRes.state === "loading"
            }
          >
            {resolveObjectRes.state === "loading" ? <Spinner /> : "Federate"}
          </button>
        </form>

        <div className="col-12 col-md-6 col-lg-4 mx-auto mt-4">
          {this.federationResult}
        </div>
      </main>
    );
  }

  get webfinger() {
    const { communityName, selectedLinkedInstanceOption, instanceDomain } =
      this.state;

    return `!${communityName}@${
      selectedLinkedInstanceOption?.label ?? instanceDomain
    }`;
  }

  get federationResult() {
    const { resolveObjectRes, loadingFollow } = this.state;
    console.log("in fed result");
    console.log(resolveObjectRes);
    return (
      <CommunityCard
        communityView={testcom}
        webfinger={`!test@localhost`}
        loading={loadingFollow}
        onSubscribe={this.handleFollowCommunity}
      />
    );
    // if (
    //   resolveObjectRes.state === "success" &&
    //   resolveObjectRes.data.community
    // ) {
    //   return (
    //     <CommunityCard
    //       communityView={resolveObjectRes.data.community}
    //       webfinger={this.webfinger}
    //       loading={loadingFollow}
    //       onSubscribe={this.handleFollowCommunity}
    //     />
    //   );
    // } else {
    //   return null;
    // }
  }

  handleLinkedInstanceChange = (option: Choice) => {
    this.setState({
      selectedLinkedInstanceOption: option.disabled ? undefined : option,
      instanceDomain: "",
    });
  };

  handleSearch = (query: string) => {
    this.setState({ linkedDomainQuery: query });
  };

  handleFollowCommunity = async (form: FollowCommunity) => {
    this.setState({ loadingFollow: true });

    const res = await HttpService.client.followCommunity(form);

    this.setState(prev => {
      if (
        res.state === "success" &&
        prev.resolveObjectRes.state === "success" &&
        prev.resolveObjectRes.data.community
      ) {
        prev.resolveObjectRes.data.community.subscribed =
          res.data.community_view.subscribed;
      }

      return {
        ...prev,
        loadingFollow: false,
      };
    });

    // Update myUserInfo
    if (res.state === "success") {
      const communityId = res.data.community_view.community.id;
      const mui = UserService.Instance.myUserInfo;
      if (mui) {
        mui.follows = mui.follows.filter(i => i.community.id != communityId);
      }
    }
  };

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.fetchFederatedInstances();
    }
  }

  async fetchFederatedInstances() {
    this.setState({ federatedInstancesRes: { state: "loading" } });

    this.setState({
      federatedInstancesRes: await HttpService.client.getFederatedInstances({
        auth: myAuthRequired(),
      }),
    });
  }

  static async fetchInitialData({
    client,
    auth,
  }: InitialFetchRequest<
    QueryParams<Record<string, any>>
  >): Promise<FederateData> {
    let federatedInstancesRes: RequestState<GetFederatedInstancesResponse> = {
      state: "empty",
    };

    if (auth) {
      federatedInstancesRes = await client.getFederatedInstances({ auth });
    }

    return { federatedInstancesRes };
  }
}
