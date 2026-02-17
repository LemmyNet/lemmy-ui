import { setIsoData } from "@utils/app";
import { resourcesSettled, bareRoutePush } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { RouteDataResponse } from "@utils/types";
import { Component, InfernoNode } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  CommunityId,
  GetMultiCommunity,
  GetMultiCommunityResponse,
  LemmyHttp,
  MultiCommunityId,
  MultiCommunityResponse,
  EditMultiCommunity,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import { T } from "inferno-i18next-dess";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";
import { toast } from "@utils/app";
import { getHttpBaseInternal } from "../../utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { HtmlTags } from "@components/common/html-tags";
import { MultiCommunityForm } from "./multi-community-form";
import {
  MultiCommunityEntryForm,
  MultiCommunityEntryList,
} from "./multi-community-entry-form";
import { MultiCommunityLink } from "./multi-community-link";

type MultiCommunitySettingsData = RouteDataResponse<{
  multiCommunityRes: GetMultiCommunityResponse;
}>;

interface State {
  multiRes: RequestState<GetMultiCommunityResponse>;
  editRes: RequestState<MultiCommunityResponse>;
  deleteRes: RequestState<MultiCommunityResponse>;
  isIsomorphic: boolean;
}

// There are no url filters to this page, hence no props
interface Props {
  none: string;
}

type PathProps = { name: string };
type RouteProps = RouteComponentProps<PathProps> & Props;
export type MultiCommunitySettingsFetchConfig = IRoutePropsWithFetch<
  MultiCommunitySettingsData,
  PathProps,
  Props
>;

@scrollMixin
@tippyMixin
export class MultiCommunitySettings extends Component<RouteProps, State> {
  private isoData = setIsoData<MultiCommunitySettingsData>(this.context);
  state: State = {
    multiRes: EMPTY_REQUEST,
    editRes: EMPTY_REQUEST,
    deleteRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.multiRes]);
  }

  constructor(props: RouteProps, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { multiCommunityRes: multiRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        multiRes,
      };
    }
  }

  fetchMultiCommunityToken?: symbol;
  async fetchMultiCommunity(props: RouteProps) {
    const token = (this.fetchMultiCommunityToken = Symbol());
    this.setState({ multiRes: LOADING_REQUEST });
    const name = decodeURIComponent(props.match.params.name);
    const multiRes = await HttpService.client.getMultiCommunity({
      name,
    });
    if (token === this.fetchMultiCommunityToken) {
      this.setState({ multiRes });
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.fetchMultiCommunity(this.props);
    }
  }

  componentWillReceiveProps(
    nextProps: RouteProps & { children?: InfernoNode },
  ) {
    if (
      bareRoutePush(this.props, nextProps) ||
      this.props.match.params.name !== nextProps.match.params.name
    ) {
      this.fetchMultiCommunity(nextProps);
    }
  }

  static fetchInitialData = async ({
    headers,
    match: { params: props },
  }: InitialFetchRequest<
    PathProps,
    Props
  >): Promise<MultiCommunitySettingsData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const name = decodeURIComponent(props.name);
    const form: GetMultiCommunity = {
      name,
    };

    const multiRes = await client.getMultiCommunity(form);

    return {
      multiCommunityRes: multiRes,
    };
  };

  get documentTitle(): string {
    const cRes = this.state.multiRes;
    return cRes.state === "success"
      ? `${cRes.data.multi_community_view.multi.title} ${I18NextService.i18n.t("settings")} - ${this.isoData.siteRes.site_view.site.name}`
      : "";
  }

  get amCreator(): boolean {
    return (
      this.state.multiRes.state === "success" &&
      this.isoData.myUserInfo?.local_user_view.person.id ===
        this.state.multiRes.data.multi_community_view.owner.id
    );
  }

  render() {
    const getMultiRes =
      this.state.multiRes.state === "success" && this.state.multiRes.data;
    const myUserInfo = this.isoData.myUserInfo;

    return (
      getMultiRes && (
        <div className="multi-community-settings container">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
          />
          <div className="row">
            <div className="col-12 col-md-6">
              <h1 className="h4 mb-4">
                <T i18nKey="x_settings">
                  <MultiCommunityLink
                    multiCommunity={getMultiRes.multi_community_view.multi}
                    myUserInfo={myUserInfo}
                  />
                </T>
              </h1>
              <MultiCommunityForm
                multiCommunityView={getMultiRes.multi_community_view}
                onEdit={form => handleEditMultiCommunity(this, form)}
                createOrEditLoading={this.state.editRes.state === "loading"}
                deleteLoading={this.state.deleteRes.state === "loading"}
                onDelete={deleted => handleDeleteMultiCommunity(this, deleted)}
                myUserInfo={myUserInfo}
              />
            </div>
            <div className="col-12 col-md-6">
              <h1 className="h4 mb-4">
                {I18NextService.i18n.t("communities")}
              </h1>
              <MultiCommunityEntryList
                communities={getMultiRes.communities}
                isCreator={this.amCreator}
                onDelete={communityId =>
                  handleDeleteMultiCommunityEntry(
                    this,
                    getMultiRes.multi_community_view.multi.id,
                    communityId,
                  )
                }
                myUserInfo={myUserInfo}
              />
              {this.amCreator && (
                <MultiCommunityEntryForm
                  currentCommunities={getMultiRes.communities}
                  onCreate={communityId =>
                    handleCreateMultiCommunityEntry(
                      this,
                      getMultiRes.multi_community_view.multi.id,
                      communityId,
                    )
                  }
                  myUserInfo={myUserInfo}
                />
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  updateMultiCommunity(res: RequestState<MultiCommunityResponse>) {
    this.setState(s => {
      if (s.multiRes.state === "success" && res.state === "success") {
        s.multiRes.data.multi_community_view = res.data.multi_community_view;
      }
      return s;
    });
  }
}

async function handleDeleteMultiCommunity(
  i: MultiCommunitySettings,
  deleted: boolean,
) {
  if (i.state.multiRes.state === "success") {
    const form: EditMultiCommunity = {
      id: i.state.multiRes.data.multi_community_view.multi.id,
      deleted,
    };
    i.setState({ deleteRes: LOADING_REQUEST });
    i.setState({
      deleteRes: await HttpService.client.editMultiCommunity(form),
    });

    if (i.state.deleteRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          deleted ? "deleted_multi_community" : "restored_multi_community",
        ),
      );
      i.updateMultiCommunity(i.state.deleteRes);
    }
  }
}

async function handleEditMultiCommunity(
  i: MultiCommunitySettings,
  form: EditMultiCommunity,
) {
  i.setState({ editRes: LOADING_REQUEST });

  i.setState({
    editRes: await HttpService.client.editMultiCommunity(form),
  });

  if (i.state.editRes.state === "success") {
    i.updateMultiCommunity(i.state.editRes);
    toast(I18NextService.i18n.t("saved"));
  }
}

async function handleCreateMultiCommunityEntry(
  i: MultiCommunitySettings,
  id: MultiCommunityId,
  community_id: CommunityId,
) {
  const res = await HttpService.client.createMultiCommunityEntry({
    id,
    community_id,
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("community_added"));
  }

  // Refetch to rebuild the community list
  i.fetchMultiCommunity(i.props);
}

async function handleDeleteMultiCommunityEntry(
  i: MultiCommunitySettings,
  id: MultiCommunityId,
  community_id: CommunityId,
) {
  const res = await HttpService.client.deleteMultiCommunityEntry({
    id,
    community_id,
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("community_removed"), "danger");
  }

  i.fetchMultiCommunity(i.props);
}
