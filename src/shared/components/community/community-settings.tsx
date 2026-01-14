import { enableNsfw, setIsoData } from "@utils/app";
import {
  resourcesSettled,
  bareRoutePush,
  capitalizeFirstLetter,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { RouteDataResponse } from "@utils/types";
import { Component, InfernoNode } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  CommunityResponse,
  DeleteCommunity,
  EditCommunity,
  GetCommunity,
  GetCommunityResponse,
  LemmyHttp,
  MyUserInfo,
  SuccessResponse,
  TransferCommunity,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
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
import classNames from "classnames";
import { HtmlTags } from "@components/common/html-tags";
import Tabs from "@components/common/tabs";
import { CommunityForm } from "./community-form";
import { TableHr } from "@components/common/tables";
import { PersonListing } from "@components/person/person-listing";
import { MomentTime } from "@components/common/moment-time";
import ConfirmationModal from "@components/common/modal/confirmation-modal";
import { UserBadges } from "@components/common/user-badges";
import { Spinner } from "@components/common/icon";
import { amTopMod } from "@utils/roles";

type CommunitySettingsData = RouteDataResponse<{
  communityRes: GetCommunityResponse;
}>;

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  editCommunityRes: RequestState<CommunityResponse>;
  transferCommunityRes: RequestState<GetCommunityResponse>;
  deleteCommunityRes: RequestState<CommunityResponse>;
  removeCommunityRes: RequestState<CommunityResponse>;
  leaveModTeamRes: RequestState<AddModToCommunityResponse>;
  purgeCommunityRes: RequestState<SuccessResponse>;
  isIsomorphic: boolean;
  showConfirmLeaveModTeam: boolean;
}

// There are no url filters to this page, hence no props
interface Props {}

type PathProps = { name: string };
type RouteProps = RouteComponentProps<PathProps> & Props;
export type CommunitySettingsFetchConfig = IRoutePropsWithFetch<
  CommunitySettingsData,
  PathProps,
  Props
>;

@scrollMixin
@tippyMixin
export class CommunitySettings extends Component<RouteProps, State> {
  private isoData = setIsoData<CommunitySettingsData>(this.context);
  state: State = {
    communityRes: EMPTY_REQUEST,
    editCommunityRes: EMPTY_REQUEST,
    transferCommunityRes: EMPTY_REQUEST,
    deleteCommunityRes: EMPTY_REQUEST,
    removeCommunityRes: EMPTY_REQUEST,
    leaveModTeamRes: EMPTY_REQUEST,
    purgeCommunityRes: EMPTY_REQUEST,
    showConfirmLeaveModTeam: false,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.communityRes]);
  }

  constructor(props: RouteProps, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { communityRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        communityRes,
      };
    }
  }

  fetchCommunityToken?: symbol;
  async fetchCommunity(props: RouteProps) {
    const token = (this.fetchCommunityToken = Symbol());
    this.setState({ communityRes: LOADING_REQUEST });
    const name = decodeURIComponent(props.match.params.name);
    const communityRes = await HttpService.client.getCommunity({
      name,
    });
    if (token === this.fetchCommunityToken) {
      this.setState({ communityRes });
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.fetchCommunity(this.props);
    }
  }

  componentWillReceiveProps(
    nextProps: RouteProps & { children?: InfernoNode },
  ) {
    if (
      bareRoutePush(this.props, nextProps) ||
      this.props.match.params.name !== nextProps.match.params.name
    ) {
      this.fetchCommunity(nextProps);
    }
  }

  static async fetchInitialData({
    headers,
    match: { params: props },
  }: InitialFetchRequest<PathProps, Props>): Promise<CommunitySettingsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const communityName = decodeURIComponent(props.name);
    const communityForm: GetCommunity = {
      name: communityName,
    };

    const communityRes = await client.getCommunity(communityForm);

    return {
      communityRes,
    };
  }

  get documentTitle(): string {
    const cRes = this.state.communityRes;
    return cRes.state === "success"
      ? `${cRes.data.community_view.community.title} ${I18NextService.i18n.t("settings")} - ${this.isoData.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    const { siteRes, myUserInfo } = this.isoData;
    const getCommunityRes =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;

    return (
      getCommunityRes && (
        <div className="community-settings container">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
          />
          <Tabs
            tabs={[
              {
                key: "community",
                label: I18NextService.i18n.t("community"),
                getNode: isSelected => (
                  <div
                    className={classNames("tab-pane show", {
                      active: isSelected,
                    })}
                    role="tabpanel"
                    id="community-tab-pane"
                  >
                    <h1 className="row justify-content-md-center h4 mb-4">
                      {I18NextService.i18n.t("settings")}
                    </h1>
                    <div className="row justify-content-md-center">
                      <div className="col-12 col-md-6">
                        <CommunityForm
                          community_view={getCommunityRes.community_view}
                          allLanguages={siteRes.all_languages}
                          siteLanguages={siteRes.discussion_languages}
                          communityLanguages={
                            getCommunityRes.discussion_languages
                          }
                          onEdit={form => handleEditCommunity(this, form)}
                          createOrEditLoading={
                            this.state.editCommunityRes.state === "loading"
                          }
                          onDelete={deleted =>
                            handleDeleteCommunity(this, deleted)
                          }
                          deleteLoading={
                            this.state.deleteCommunityRes.state === "loading"
                          }
                          enableNsfw={enableNsfw(siteRes)}
                          myUserInfo={myUserInfo}
                        />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "moderators",
                label: I18NextService.i18n.t("mods"),
                getNode: isSelected => (
                  <div
                    className={classNames("tab-pane", {
                      active: isSelected,
                    })}
                    role="tabpanel"
                    id="users-tab-pane"
                  >
                    {this.moderatorsTab()}
                  </div>
                ),
              },
              {
                key: "tags",
                label: I18NextService.i18n.t("tags"),
                getNode: isSelected => (
                  <div
                    className={classNames("tab-pane", {
                      active: isSelected,
                    })}
                    role="tabpanel"
                    id="taglines-tab-pane"
                  >
                    {this.tagsTab()}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )
    );
  }

  tagsTab() {
    // TODO
  }

  moderatorsTab() {
    const mods =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data.moderators;

    const myUserInfo = this.isoData.myUserInfo;

    const nameCols = "col-12 col-md-6";
    const dataCols = "col-4 col-md-2";

    return (
      <>
        <h1 className="h4 mb-4">
          {capitalizeFirstLetter(I18NextService.i18n.t("mods"))}
        </h1>
        <div id="mods-table">
          <div className="row">
            <div className={`${nameCols} fw-bold`}>
              {I18NextService.i18n.t("username")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("registered_date_title")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("posts")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("comments")}
            </div>
          </div>
          <TableHr />
          {mods &&
            mods.map(m => (
              <>
                <div className="row" key={m.moderator.id}>
                  <div className={nameCols}>
                    <PersonListing
                      person={m.moderator}
                      banned={false}
                      myUserInfo={myUserInfo}
                    />
                    <UserBadges
                      classNames="ms-1"
                      isAdmin={false}
                      isBanned={false}
                      myUserInfo={myUserInfo}
                      creator={m.moderator}
                    />
                  </div>
                  <div className={dataCols}>
                    <MomentTime published={m.moderator.published_at} />
                  </div>
                  <div className={dataCols}>{m.moderator.post_count}</div>
                  <div className={dataCols}>{m.moderator.comment_count}</div>
                </div>
                <hr />
              </>
            ))}
        </div>
        {mods && !amTopMod(mods, myUserInfo) && (
          <>
            {this.leaveModTeam()}
            <ConfirmationModal
              message={I18NextService.i18n.t("leave_mod_team_confirmation")}
              loadingMessage={I18NextService.i18n.t("leaving_mod_team")}
              onNo={() => handleToggleShowLeaveModTeamConfirmation(this)}
              onYes={() => handleLeaveModTeam(this, myUserInfo)}
              show={this.state.showConfirmLeaveModTeam}
            />
          </>
        )}
      </>
    );
  }

  leaveModTeam() {
    return (
      <button
        onClick={() => handleToggleShowLeaveModTeamConfirmation(this)}
        className="btn btn-danger mb-2"
      >
        {this.state.leaveModTeamRes.state === "loading" ? (
          <Spinner />
        ) : (
          I18NextService.i18n.t("leave_mod_team")
        )}
      </button>
    );
  }

  updateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.discussion_languages =
          res.data.discussion_languages;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}

async function handleDeleteCommunity(i: CommunitySettings, deleted: boolean) {
  if (i.state.communityRes.state === "success") {
    const form: DeleteCommunity = {
      community_id: i.state.communityRes.data.community_view.community.id,
      deleted,
    };
    i.setState({ deleteCommunityRes: LOADING_REQUEST });
    i.setState({
      deleteCommunityRes: await HttpService.client.deleteCommunity(form),
    });

    if (i.state.deleteCommunityRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          deleted ? "deleted_community" : "restored_community",
        ),
      );
      i.updateCommunity(i.state.deleteCommunityRes);
    }
  }
}

// TODO need an abstracted user search dropdown for this
async function handleAddModToCommunity(
  i: CommunitySettings,
  form: AddModToCommunity,
) {
  const addModRes = await HttpService.client.addModToCommunity(form);
  i.updateModerators(addModRes);
  if (addModRes.state === "success") {
    toast(I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"));
  }
}

async function handleEditCommunity(i: CommunitySettings, form: EditCommunity) {
  i.setState({ editCommunityRes: LOADING_REQUEST });

  i.setState({
    editCommunityRes: await HttpService.client.editCommunity(form),
  });

  if (i.state.editCommunityRes.state === "success") {
    i.updateCommunity(i.state.editCommunityRes);
    toast(I18NextService.i18n.t("saved"));
  }
}

async function handleTransferCommunity(
  i: CommunitySettings,
  form: TransferCommunity,
) {
  i.setState({ transferCommunityRes: LOADING_REQUEST });
  i.setState({
    transferCommunityRes: await HttpService.client.transferCommunity(form),
  });

  if (i.state.transferCommunityRes.state === "success") {
    toast(I18NextService.i18n.t("transfer_community"));
    i.updateCommunityFull(i.state.transferCommunityRes);
  }
}

// TODO this also needs some kind of smart user picker
async function handleBanFromCommunity(
  i: CommunitySettings,
  form: BanFromCommunity,
) {
  const banRes = await HttpService.client.banFromCommunity(form);

  // TODO
  // i.updateBanFromCommunity(banRes, form.ban);
}

async function handleLeaveModTeam(
  i: CommunitySettings,
  myUserInfo: MyUserInfo | undefined,
) {
  const myId = myUserInfo?.local_user_view.person.id;
  if (i.state.communityRes.state === "success" && myId) {
    const form: AddModToCommunity = {
      community_id: i.state.communityRes.data.community_view.community.id,
      person_id: myId,
      added: false,
    };
    i.setState({ leaveModTeamRes: LOADING_REQUEST });
    i.setState({
      leaveModTeamRes: await HttpService.client.addModToCommunity(form),
    });

    if (i.state.leaveModTeamRes.state === "success") {
      toast(I18NextService.i18n.t("left_admin_team"));
      i.setState({ showConfirmLeaveModTeam: false });
      i.context.router.history.replace("/");
    }
  }
}

function handleToggleShowLeaveModTeamConfirmation(i: CommunitySettings) {
  i.setState({ showConfirmLeaveModTeam: !i.state.showConfirmLeaveModTeam });
}
