import { myAuthRequired, setIsoData } from "@utils/app";
import { Choice, QueryParams, RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import { GetFederatedInstancesResponse } from "lemmy-js-client";
import { RequestState } from "shared/services/HttpService";
import { emDash } from "../../shared/config";
import { InitialFetchRequest } from "../../shared/interfaces";
import { FirstLoadService, HttpService } from "../../shared/services";
import { HtmlTags } from "./common/html-tags";
import { SearchableSelect } from "./common/searchable-select";

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
}

function handleInstanceDomainChange(i: Federate, event: any) {
  i.setState({ instanceDomain: event.target.value });
}

function handleCommunityNameChange(i: Federate, event: any) {
  i.setState({ communityName: event.target.value });
}

export class Federate extends Component<any, FederateState> {
  private isoData = setIsoData<FederateData>(this.context);
  state: FederateState = {
    isIsomorphic: false,
    federatedInstancesRes: { state: "empty" },
    communityName: "",
    instanceDomain: "",
    linkedDomainQuery: "",
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
        <form className="row">
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
                options={[
                  { label: emDash, value: "0", disabled: true } as Choice,
                ].concat(instanceOptions)}
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
        </form>
      </main>
    );
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
