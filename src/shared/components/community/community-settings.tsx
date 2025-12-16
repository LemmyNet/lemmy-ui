import { canViewCommunity, enableNsfw, setIsoData } from "@utils/app";
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
  RemoveCommunity,
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
import { PurgeWarning, Spinner } from "@components/common/icon";
import { FormEvent } from "inferno";

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
  removeReason?: string;
  removeExpires?: string;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason?: string;
  showConfirmLeaveModTeam: boolean;
}

// There are no url filters to this page, hence no props
interface Props {}

type PathProps = { name: string };
type RouteProps = RouteComponentProps<PathProps> & Props;
export type CommunityFetchConfig = IRoutePropsWithFetch<
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
    showRemoveDialog: false,
    showPurgeDialog: false,
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
                          onEditCommunity={form =>
                            handleEditCommunity(this, form)
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

  // TODO all this needs to get moved into community settings
  adminButtons() {
    const community_view = this.props.community_view;
    return (
      <>
        <ul className="list-inline mb-1 text-muted fw-bold">
          {amMod(this.props.community_view) && (
            <>
              <li className="list-inline-item-action">
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={() => handleEditClick(this)}
                  data-tippy-content={I18NextService.i18n.t("edit")}
                  aria-label={I18NextService.i18n.t("edit")}
                >
                  <Icon icon="edit" classes="icon-inline" />
                </button>
              </li>
              {!amTopMod(this.props.moderators, this.props.myUserInfo) &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <button
                      className="btn btn-link text-muted d-inline-block"
                      onClick={() => handleShowConfirmLeaveModTeamClick(this)}
                    >
                      {I18NextService.i18n.t("leave_mod_team")}
                    </button>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {I18NextService.i18n.t("are_you_sure")}
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={() => handleLeaveModTeam(this)}
                      >
                        {I18NextService.i18n.t("yes")}
                      </button>
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={() => handleCancelLeaveModTeamClick(this)}
                      >
                        {I18NextService.i18n.t("no")}
                      </button>
                    </li>
                  </>
                ))}
              {amTopMod(this.props.moderators, this.props.myUserInfo) && (
                <li className="list-inline-item-action">
                  <button
                    className="btn btn-link text-muted d-inline-block"
                    onClick={() => handleDeleteCommunity(this)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? I18NextService.i18n.t("delete")
                        : I18NextService.i18n.t("restore")
                    }
                    aria-label={
                      !community_view.community.deleted
                        ? I18NextService.i18n.t("delete")
                        : I18NextService.i18n.t("restore")
                    }
                  >
                    {this.state.deleteCommunityLoading ? (
                      <Spinner />
                    ) : (
                      <Icon
                        icon="trash"
                        classes={`icon-inline ${
                          community_view.community.deleted && "text-danger"
                        }`}
                      />
                    )}{" "}
                  </button>
                </li>
              )}
            </>
          )}
          {amAdmin(this.props.myUserInfo) && (
            <li className="list-inline-item">
              {!this.props.community_view.community.removed ? (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={() => handleModRemoveShow(this)}
                >
                  {I18NextService.i18n.t("remove")}
                </button>
              ) : (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={e => handleRemoveCommunity(this, e)}
                >
                  {this.state.removeCommunityLoading ? (
                    <Spinner />
                  ) : (
                    I18NextService.i18n.t("restore")
                  )}
                </button>
              )}
              <button
                className="btn btn-link text-muted d-inline-block"
                onClick={() => handlePurgeCommunityShow(this)}
                aria-label={I18NextService.i18n.t("purge_community")}
              >
                {I18NextService.i18n.t("purge_community")}
              </button>
            </li>
          )}
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={e => handleRemoveCommunity(this, e)}>
            <div className="input-group mb-3">
              <label className="col-form-label" htmlFor="remove-reason">
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id="remove-reason"
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("optional")}
                value={this.state.removeReason}
                onInput={e => handleModRemoveReasonChange(this, e)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="mb-3 row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control me-2" placeholder={I18NextService.i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div className="input-group mb-3">
              <button type="submit" className="btn btn-secondary">
                {this.state.removeCommunityLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("remove_community")
                )}
              </button>
            </div>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form onSubmit={e => handlePurgeCommunity(this, e)}>
            <div className="input-group mb-3">
              <PurgeWarning />
            </div>
            <div className="input-group mb-3">
              <label className="visually-hidden" htmlFor="purge-reason">
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id="purge-reason"
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("reason")}
                value={this.state.purgeReason}
                onInput={e => handlePurgeReasonChange(this, e)}
              />
            </div>
            <div className="input-group mb-3">
              {this.state.purgeCommunityLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={I18NextService.i18n.t("purge_community")}
                >
                  {I18NextService.i18n.t("purge_community")}
                </button>
              )}
            </div>
          </form>
        )}
      </>
    );
  }

  moderatorsTab() {
    const mods =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data.moderators;

    const nameCols = "col-12 col-md-6";
    const dataCols = "col-4 col-md-2";

    return (
      <>
        <h1 className="h4 mb-4">
          {capitalizeFirstLetter(I18NextService.i18n.t("moderators"))}
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
                      myUserInfo={this.isoData.myUserInfo}
                    />
                    <UserBadges
                      classNames="ms-1"
                      isAdmin={false}
                      isBanned={false}
                      myUserInfo={this.isoData.myUserInfo}
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
        {this.leaveModTeam()}
        <ConfirmationModal
          message={I18NextService.i18n.t("leave_mod_team_confirmation")}
          loadingMessage={I18NextService.i18n.t("leaving_mod_team")}
          onNo={() => handleToggleShowLeaveModTeamConfirmation(this)}
          onYes={() => handleLeaveModTeam(this, this.isoData.myUserInfo)}
          show={this.state.showConfirmLeaveModTeam}
        />
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

async function handleDeleteCommunity(
  i: CommunitySettings,
  form: DeleteCommunity,
) {
  i.setState({ deleteCommunityRes: LOADING_REQUEST });
  i.setState({
    deleteCommunityRes: await HttpService.client.deleteCommunity(form),
  });

  if (i.state.deleteCommunityRes.state === "success") {
    toast(I18NextService.i18n.t("deleted"));
    i.updateCommunity(i.state.deleteCommunityRes);
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

async function handleRemoveCommunity(i: CommunitySettings, reason: string) {
  if (i.state.communityRes.state === "success") {
    i.setState({ removeCommunityRes: LOADING_REQUEST });
    const form: RemoveCommunity = {
      community_id: i.state.communityRes.data.community_view.community.id,
      removed: !i.state.communityRes.data.community_view.community.removed,
      reason,
    };
    i.setState({
      removeCommunityRes: await HttpService.client.removeCommunity(form),
    });
    if (i.state.removeCommunityRes.state === "success") {
      toast(I18NextService.i18n.t("removed"));
      i.updateCommunity(i.state.removeCommunityRes);
    }
  }
}

function handlePurgeCommunity(i: CommunitySettings) {
  i.setState({ purgeCommunityLoading: true });
  i.props.onPurgeCommunity({
    community_id: i.props.community_view.community.id,
    reason: i.state.purgeReason ?? "",
  });
}

function handleShowConfirmLeaveModTeamClick(i: CommunitySidebar) {
  i.setState({ showConfirmLeaveModTeam: true });
}

function handleCancelLeaveModTeamClick(i: CommunitySidebar) {
  i.setState({ showConfirmLeaveModTeam: false });
}

function handleModRemoveShow(i: CommunitySidebar) {
  i.setState({ showRemoveDialog: true });
}

function handleModRemoveReasonChange(
  i: CommunitySettings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ removeReason: event.target.value });
}

// function handleModRemoveExpiresChange(i: CommunitySidebar, event: any) {
//   i.setState({ removeExpires: event.target.value });
// }

function handlePurgeCommunityShow(i: CommunitySidebar) {
  i.setState({ showPurgeDialog: true, showRemoveDialog: false });
}

function handlePurgeReasonChange(i: CommunitySettings, event) {
  i.setState({ purgeReason: event.target.value });
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

    if (this.state.leaveAdminTeamRes.state === "success") {
      toast(I18NextService.i18n.t("left_admin_team"));
      this.setState({ showConfirmLeaveAdmin: false });
      this.context.router.history.replace("/");
    }
  }
}

function handleToggleShowLeaveModTeamConfirmation(i: CommunitySettings) {
  i.setState({ showConfirmLeaveModTeam: !i.state.showConfirmLeaveModTeam });
}
