import { enableNsfw, fetchUsers, personToChoice, setIsoData } from "@utils/app";
import {
  resourcesSettled,
  bareRoutePush,
  capitalizeFirstLetter,
  getIdFromString,
  debounce,
  getApubName,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  Choice,
  ItemIdAndRes,
  itemLoading,
  RouteDataResponse,
} from "@utils/types";
import { Component, InfernoNode } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddModToCommunity,
  AddModToCommunityResponse,
  CommunityModeratorView,
  CommunityResponse,
  CreateCommunityTag,
  DeleteCommunity,
  DeleteCommunityTag,
  EditCommunity,
  GetCommunity,
  GetCommunityResponse,
  LemmyHttp,
  MyUserInfo,
  SuccessResponse,
  CommunityTag,
  CommunityTagId,
  TransferCommunity,
  EditCommunityTag,
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
import classNames from "classnames";
import { HtmlTags } from "@components/common/html-tags";
import Tabs from "@components/common/tabs";
import { CommunityForm } from "./community-form";
import { TableHr } from "@components/common/tables";
import { PersonListing } from "@components/person/person-listing";
import { MomentTime } from "@components/common/moment-time";
import ConfirmationModal from "@components/common/modal/confirmation-modal";
import { UserBadges } from "@components/common/user-badges";
import { Icon, Spinner } from "@components/common/icon";
import { amTopMod, amHigherModerator, amTopModExcludeMe } from "@utils/roles";
import { SearchableSelect } from "@components/common/searchable-select";
import { CommunityTagForm } from "./community-tag-form";
import { NoOptionI18nKeys } from "i18next";
import { CommunityLink } from "./community-link";

type CommunitySettingsData = RouteDataResponse<{
  communityRes: GetCommunityResponse;
}>;

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  editCommunityRes: RequestState<CommunityResponse>;
  transferCommunityRes: RequestState<GetCommunityResponse>;
  deleteCommunityRes: RequestState<CommunityResponse>;
  leaveModTeamRes: RequestState<AddModToCommunityResponse>;
  purgeCommunityRes: RequestState<SuccessResponse>;
  createOrEditTagRes: ItemIdAndRes<CommunityTagId, CommunityTag>;
  deleteTagRes: ItemIdAndRes<CommunityTagId, CommunityTag>;
  isIsomorphic: boolean;
  showLeaveModTeamDialog: boolean;
  // You need to filter by the specific mod id, since this is a jsx loop
  // An undefined means hide the dialog
  showRemoveModDialog: CommunityModeratorView | undefined;
  showTransferDialog: CommunityModeratorView | undefined;
  addModSearchOptions: Choice[];
  addModSearchLoading: boolean;
}

// There are no url filters to this page, hence no props
interface Props {
  none: string;
}

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
    leaveModTeamRes: EMPTY_REQUEST,
    purgeCommunityRes: EMPTY_REQUEST,
    createOrEditTagRes: { id: 0, res: EMPTY_REQUEST },
    deleteTagRes: { id: 0, res: EMPTY_REQUEST },
    showLeaveModTeamDialog: false,
    showRemoveModDialog: undefined,
    showTransferDialog: undefined,
    isIsomorphic: false,
    addModSearchOptions: [],
    addModSearchLoading: false,
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

  static fetchInitialData = async ({
    headers,
    match: { params: props },
  }: InitialFetchRequest<PathProps, Props>): Promise<CommunitySettingsData> => {
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
  };

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
                  {getCommunityRes && (
                    <>
                      <div className="row justify-content-md-center">
                        <h1 className="col-12 col-md-6 h4 mb-4">
                          <T i18nKey="x_settings">
                            <CommunityLink
                              community={
                                getCommunityRes.community_view.community
                              }
                              myUserInfo={myUserInfo}
                            />
                          </T>
                        </h1>
                      </div>
                      <div className="row justify-content-md-center">
                        <div className="col-12 col-md-6">
                          <CommunityForm
                            communityView={getCommunityRes.community_view}
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
                    </>
                  )}
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
    );
  }

  tagsTab() {
    const res =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;

    return (
      res && (
        <>
          <h1 className="h4 mb-4">{I18NextService.i18n.t("tags")}</h1>
          {res.community_view.tags.map(t => (
            <CommunityTagForm
              key={`community-tag-form-${t.id}`}
              tag={t}
              onEdit={form => handleEditTag(this, form)}
              onDeleteOrRestore={form => handleDeleteTag(this, form)}
              createOrEditLoading={
                itemLoading(this.state.createOrEditTagRes) === t.id
              }
              deleteOrRestoreLoading={
                itemLoading(this.state.deleteTagRes) === t.id
              }
              myUserInfo={this.isoData.myUserInfo}
            />
          ))}
          {/** The create or empty tag form **/}
          <CommunityTagForm
            onCreate={form => handleCreateTag(this, form)}
            communityId={res.community_view.community.id}
            createOrEditLoading={
              itemLoading(this.state.createOrEditTagRes) === 0
            }
            myUserInfo={this.isoData.myUserInfo}
          />
        </>
      )
    );
  }

  moderatorsTab() {
    const res =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;

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
          {res &&
            res.moderators.map(m => (
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
                    {amHigherModerator(res.moderators, m, myUserInfo) && (
                      <>
                        <button
                          className="btn btn-link"
                          onClick={() =>
                            this.setState({
                              showRemoveModDialog: m,
                            })
                          }
                          data-tippy-content={I18NextService.i18n.t(
                            "remove_as_mod",
                          )}
                        >
                          <Icon icon="x" classes="icon-inline text-danger" />
                        </button>
                        <ConfirmationModal
                          show={
                            this.state.showRemoveModDialog?.moderator.id ===
                            m.moderator.id
                          }
                          message={I18NextService.i18n.t(
                            "remove_as_mod_are_you_sure",
                            {
                              user: getApubName(m.moderator),
                              community: getApubName(m.community),
                            },
                          )}
                          loadingMessage={I18NextService.i18n.t("removing_mod")}
                          onNo={() =>
                            this.setState({ showRemoveModDialog: undefined })
                          }
                          onYes={() =>
                            handleAddMod(this, {
                              community_id: res.community_view.community.id,
                              person_id: m.moderator.id,
                              added: false,
                            })
                          }
                        />
                      </>
                    )}
                    {amTopModExcludeMe(
                      m.moderator.id,
                      res.moderators,
                      myUserInfo,
                    ) && (
                      <>
                        <button
                          className="btn btn-link"
                          onClick={() =>
                            this.setState({
                              showTransferDialog: m,
                            })
                          }
                          data-tippy-content={I18NextService.i18n.t(
                            "transfer_community",
                          )}
                        >
                          <Icon icon="transfer" classes="icon-inline" />
                        </button>
                        <ConfirmationModal
                          show={
                            this.state.showTransferDialog?.moderator.id ===
                            m.moderator.id
                          }
                          message={I18NextService.i18n.t(
                            "transfer_community_are_you_sure",
                            {
                              user: getApubName(m.moderator),
                              community: getApubName(m.community),
                            },
                          )}
                          loadingMessage={I18NextService.i18n.t(
                            "transferring_community",
                          )}
                          onNo={() =>
                            this.setState({ showTransferDialog: undefined })
                          }
                          onYes={() =>
                            handleTransferCommunity(this, {
                              community_id: res.community_view.community.id,
                              person_id: m.moderator.id,
                            })
                          }
                        />
                      </>
                    )}
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
        <div className="row mb-4">
          <div className="col-12 col-md-4">
            <SearchableSelect
              id="add-mod-to-community-select"
              options={[
                {
                  label: I18NextService.i18n.t("appoint_mod"),
                  value: "",
                  disabled: true,
                } as Choice,
              ].concat(this.state.addModSearchOptions)}
              loading={this.state.addModSearchLoading}
              onChange={choice => handleAddModSelect(this, choice)}
              onSearch={res => handleAddModSearch(this, res)}
            />
          </div>
        </div>
        {res && !amTopMod(res.moderators, myUserInfo) && (
          <>
            {this.leaveModTeam()}
            <ConfirmationModal
              message={I18NextService.i18n.t("leave_mod_team_confirmation")}
              loadingMessage={I18NextService.i18n.t("leaving_mod_team")}
              onNo={() => handleToggleShowLeaveModTeamConfirmation(this)}
              onYes={() => handleLeaveModTeam(this, myUserInfo)}
              show={this.state.showLeaveModTeamDialog}
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

function handleAddModSelect(i: CommunitySettings, choice: Choice) {
  const person_id = getIdFromString(choice.value);
  if (i.state.communityRes.state === "success" && person_id) {
    const form: AddModToCommunity = {
      person_id,
      community_id: i.state.communityRes.data.community_view.community.id,
      added: true,
    };
    handleAddMod(i, form);
  }
}

async function handleAddMod(i: CommunitySettings, form: AddModToCommunity) {
  const addModRes = await HttpService.client.addModToCommunity(form);
  i.updateModerators(addModRes);

  i.setState({ showRemoveModDialog: undefined });
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

async function handleCreateTag(i: CommunitySettings, form: CreateCommunityTag) {
  i.setState({ createOrEditTagRes: { id: 0, res: LOADING_REQUEST } });
  const res = await HttpService.client.createCommunityTag(form);
  i.setState({
    createOrEditTagRes: {
      id: 0,
      res,
    },
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("community_tag_created"));
    // Need to refetch community to update tags
    await i.fetchCommunity(i.props);
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
}

async function handleEditTag(i: CommunitySettings, form: EditCommunityTag) {
  i.setState({
    createOrEditTagRes: { id: form.tag_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.editCommunityTag(form);
  i.setState({
    createOrEditTagRes: { id: form.tag_id, res },
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("community_tag_edited"));
  }
}

async function handleDeleteTag(i: CommunitySettings, form: DeleteCommunityTag) {
  i.setState({ deleteTagRes: { id: form.tag_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.deleteCommunityTag(form);
  i.setState({
    deleteTagRes: { id: form.tag_id, res },
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("community_tag_deleted"));
    // Need to refetch community to update tags
    await i.fetchCommunity(i.props);
  }
}

// TODO this also needs some kind of smart user picker
// async function handleBanFromCommunity(
//   i: CommunitySettings,
//   form: BanFromCommunity,
// ) {
//   const banRes = await HttpService.client.banFromCommunity(form);

//   // TODO
//   // i.updateBanFromCommunity(banRes, form.ban);
// }

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
      toast(I18NextService.i18n.t("left_mod_team"));
      i.setState({ showLeaveModTeamDialog: false });
      i.context.router.history.replace("/");
    }
  }
}

function handleToggleShowLeaveModTeamConfirmation(i: CommunitySettings) {
  i.setState({ showLeaveModTeamDialog: !i.state.showLeaveModTeamDialog });
}

const handleAddModSearch = debounce(
  async (i: CommunitySettings, text: string) => {
    const currentMods =
      (i.state.communityRes.state === "success" &&
        i.state.communityRes.data.moderators) ||
      [];

    i.setState({ addModSearchLoading: true });

    const newOptions: Choice[] = [];

    if (text.length > 0) {
      newOptions.push(
        ...(await fetchUsers(text))
          // Filter out current mods
          .filter(
            pv =>
              !currentMods.map(cc => cc.moderator.id).includes(pv.person.id),
          )
          .map(personToChoice),
      );

      i.setState({
        addModSearchOptions: newOptions,
      });
    }

    i.setState({
      addModSearchLoading: false,
    });
  },
);
