import {
  CommentView,
  CommunityView,
  FederationMode,
  GetSiteResponse,
  MyUserInfo,
  PostView,
  RegistrationApplicationView,
  Search,
  Comment,
  SearchType,
  PersonView,
  Language,
  Instance,
  PostReport,
  CommentReport,
  PrivateMessageReport,
  CommunityReport,
  ReportCombinedView,
  Post,
  PostCommentCombinedView,
  PersonId,
  PersonActions,
  Person,
  CommentSlimView,
  Community,
  CommentId,
  CommunityResponse,
  PersonResponse,
  PostListingMode,
  MultiCommunity,
  MultiCommunityView,
} from "lemmy-js-client";
import {
  CommentNodeI,
  IsoData,
  CommentNodeType,
  RouteData,
  VoteType,
} from "@utils/types";
import { CommentSortType, PostSortType } from "lemmy-js-client";
import { editListImmutable, getQueryString, hostname } from "@utils/helpers";
import {
  Choice,
  CommunityTribute,
  PersonTribute,
  ThemeColor,
} from "@utils/types";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  HttpService,
  I18NextService,
  UnreadCounterService,
  UserService,
} from "@services/index";
import { isBrowser } from "@utils/browser";
import Toastify from "toastify-js";
import { isAnimatedImage } from "./media";
import { httpBackendUrl } from "./env";

export function buildCommentsTree<T extends CommentSlimView>(
  comments: T[],
  parentCommentId?: CommentId,
): CommentNodeI<T>[] {
  const map = new Map<number, CommentNodeI<T>>();
  const parentComment = comments.find(c => c.comment.id === parentCommentId);
  const depthOffset = getDepthFromComment(parentComment?.comment) ?? 0;

  for (const comment_view of comments) {
    const depthI = getDepthFromComment(comment_view.comment) ?? 0;
    const depth = depthI ? depthI - depthOffset : 0;
    const node: CommentNodeI<T> = {
      comment_view,
      children: [],
      depth,
    };
    map.set(comment_view.comment.id, { ...node });
  }

  const tree: CommentNodeI<T>[] = [];

  // if its a parent comment fetch, then push the first comment to the top node.
  if (parentCommentId) {
    const cNode = map.get(parentCommentId);
    if (cNode) {
      tree.push(cNode);
    }
  }

  // This should not be sorted on the front end, in order to preserve the
  // back end sorts. However, the parent ids must be sorted, so make sure
  // When adding new comments to trees, that they're inserted right after
  // their parent index. This is done in post.tsx
  for (const comment_view of comments) {
    const child = map.get(comment_view.comment.id);
    if (child) {
      const parent_id = getCommentParentId(comment_view.comment);
      if (parent_id) {
        const parent = map.get(parent_id);
        // Necessary because blocked comment might not exist
        if (parent) {
          parent.children.push(child);
        }
      } else {
        if (!parentComment) {
          tree.push(child);
        }
      }
    }
  }

  return tree;
}

export const colorList: string[] = [
  "var(--comment-node-1-color)",
  "var(--comment-node-2-color)",
  "var(--comment-node-3-color)",
  "var(--comment-node-4-color)",
  "var(--comment-node-5-color)",
  "var(--comment-node-6-color)",
  "var(--comment-node-7-color)",
];

export function commentsToFlatNodes(
  comments: CommentView[],
): CommentNodeType[] {
  return comments.map(commentToFlatNode);
}

export function commentToFlatNode(cv: CommentView): CommentNodeType {
  return { view: { comment_view: cv, children: [], depth: 0 } };
}

export function communityRSSUrl(community: Community, sort: string): string {
  // Only add the domain for non-local
  const domain = community.local ? "" : `@${hostname(community.ap_id)}`;

  return httpBackendUrl(
    `/feeds/c/${community.name}${domain}.xml${getQueryString({ sort })}`,
  );
}

export function multiCommunityRSSUrl(
  multiCommunity: MultiCommunity,
  sort: string,
): string {
  // Only add the domain for non-local
  const domain = multiCommunity.local
    ? ""
    : `@${hostname(multiCommunity.ap_id)}`;

  return `/feeds/m/${multiCommunity.name}${domain}.xml${getQueryString({ sort })}`;
}

export async function communitySearch(
  text: string,
): Promise<CommunityTribute[]> {
  const communitiesResponse = await fetchCommunities(text);

  return communitiesResponse.map(cv => ({
    key: `!${cv.community.name}@${hostname(cv.community.ap_id)}`,
    view: cv,
  }));
}

export function communitySelectName(cv: CommunityView): string {
  return cv.community.local
    ? cv.community.title
    : `!${cv.community.title}@${hostname(cv.community.ap_id)}`;
}

export function communityToChoice(cv: CommunityView): Choice {
  return {
    value: cv.community.id.toString(),
    label: communitySelectName(cv),
  };
}

export function editCombined<
  T extends { type_: string },
  I extends { id: number },
>(data: T, list: T[], identFn: (item: T) => I): T[] {
  const id = identFn(data).id;
  return list.map(i =>
    id === identFn(i).id && data.type_ === i.type_ ? data : i,
  );
}

export function editComment(
  data: CommentView,
  comments: CommentView[],
): CommentView[] {
  return editListImmutable("comment", data, comments);
}

export function editCommentSlim(
  data: CommentSlimView,
  comments: CommentSlimView[],
): CommentSlimView[] {
  return editListImmutable("comment", data, comments);
}

export function editCommunity(
  data: CommunityView,
  communities: CommunityView[],
): CommunityView[] {
  return editListImmutable("community", data, communities);
}

export function editMultiCommunity(
  data: MultiCommunityView,
  multiCommunities: MultiCommunityView[],
): MultiCommunityView[] {
  return editListImmutable("multi", data, multiCommunities);
}

export function editPost(data: PostView, posts: PostView[]): PostView[] {
  return editListImmutable("post", data, posts);
}

export function editRegistrationApplication(
  data: RegistrationApplicationView,
  apps: RegistrationApplicationView[],
): RegistrationApplicationView[] {
  return editListImmutable("registration_application", data, apps);
}

export function editPersonNotes<
  T extends { creator: Person; person_actions?: PersonActions },
>(note: string, personId: PersonId, views: T[]): T[] {
  return views.map(pv =>
    pv.creator.id === personId
      ? { ...pv, person_actions: { ...pv.person_actions, note } }
      : pv,
  );
}

export function editPersonViewPersonNote(
  note: string,
  personId: PersonId,
  view: PersonView,
): PersonView {
  return view.person.id === personId
    ? { ...view, person_actions: { ...view.person_actions, note } }
    : view;
}

/**
 * Updates a given comment and all its children with the current locked
 **/
export function editCommentsSlimLocked(
  path: string,
  locked: boolean,
  list: CommentSlimView[],
): CommentSlimView[] {
  return list.map(c =>
    c.comment.path.startsWith(path)
      ? { ...c, comment: { ...c.comment, locked } }
      : c,
  );
}

export function commentUpvotesMode(siteRes: GetSiteResponse): FederationMode {
  return siteRes.site_view.local_site.comment_upvotes;
}

export function commentDownvotesMode(siteRes: GetSiteResponse): FederationMode {
  return siteRes.site_view.local_site.comment_downvotes;
}

export function postUpvotesMode(siteRes: GetSiteResponse): FederationMode {
  return siteRes.site_view.local_site.post_upvotes;
}

export function postDownvotesMode(siteRes: GetSiteResponse): FederationMode {
  return siteRes.site_view.local_site.post_downvotes;
}

export function enableDownvotes(siteRes: GetSiteResponse): boolean {
  return (
    siteRes.site_view.local_site.post_downvotes !== "disable" ||
    siteRes.site_view.local_site.comment_downvotes !== "disable"
  );
}

export function enableNsfw(siteRes?: GetSiteResponse): boolean {
  return !!siteRes?.site_view.site.content_warning;
}

export async function fetchCommunities(q: string) {
  const res = await fetchSearchResults(q, "communities");

  return res.state === "success"
    ? res.data.search.filter(s => s.type_ === "community")
    : [];
}

export function fetchSearchResults(q: string, type_: SearchType) {
  const form: Search = {
    q,
    type_,
    sort: "top",
    listing_type: "all",
  };

  return HttpService.client.search(form);
}

export async function fetchThemeList(): Promise<string[]> {
  return fetch("/css/themelist").then(res => res.json());
}

export async function fetchUsers(q: string) {
  const res = await fetchSearchResults(q, "users");

  return res.state === "success"
    ? res.data.search.filter(s => s.type_ === "person")
    : [];
}

export function getCommentIdFromProps(
  props: Pick<RouteComponentProps<{ comment_id?: string }>, "match">,
): number | undefined {
  const id = props.match.params.comment_id;
  return id ? Number(id) : undefined;
}

export function getCommentParentId(comment?: Comment): number | undefined {
  const split = comment?.path.split(".");
  // remove the 0
  split?.shift();

  return split && split.length > 1
    ? Number(split.at(split.length - 2))
    : undefined;
}

export function getDepthFromComment(comment?: Comment): number | undefined {
  const len = comment?.path.split(".").length;
  return len ? len - 2 : undefined;
}

export function getIdFromProps(
  props: Pick<RouteComponentProps<{ post_id?: string }>, "match">,
): number | undefined {
  const id = props.match.params.post_id;
  return id ? Number(id) : undefined;
}

export function getRecipientIdFromProps(
  props: Pick<RouteComponentProps<{ recipient_id: string }>, "match">,
): number {
  return props.match.params.recipient_id
    ? Number(props.match.params.recipient_id)
    : 1;
}

type PersonContentCombined = Post | Comment;

export function getUncombinedPersonContent(
  content: PostCommentCombinedView,
): PersonContentCombined {
  switch (content.type_) {
    case "post":
      return content.post;
    case "comment":
      return content.comment;
  }
}

type ReportCombined =
  | PostReport
  | CommentReport
  | PrivateMessageReport
  | CommunityReport;

export function getUncombinedReport(
  report: ReportCombinedView,
): ReportCombined {
  switch (report.type_) {
    case "post":
      return report.post_report;
    case "comment":
      return report.comment_report;
    case "private_message":
      return report.private_message_report;
    case "community":
      return report.community_report;
  }
}

export function insertCommentIntoTree<T extends CommentSlimView>(
  tree: CommentNodeI<T>[],
  cv: T,
  parentComment: boolean,
) {
  // Building a fake node to be used for later
  const node: CommentNodeI<T> = {
    comment_view: cv,
    children: [],
    depth: 0,
  };

  const parentId = getCommentParentId(cv.comment);
  if (parentId) {
    const parent_comment = searchCommentTree(tree, parentId);
    if (parent_comment) {
      node.depth = parent_comment.depth + 1;
      parent_comment.children.unshift(node);
    }
  } else if (!parentComment) {
    tree.unshift(node);
  }
}

export function isAuthPath(pathname: string) {
  return /^\/(create_.*?|notifications|settings|admin|reports|registration_applications|activitypub.*?)\b/g.test(
    pathname,
  );
}

export function isPostBlocked(
  pv: PostView,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  return (
    (myUserInfo?.community_blocks.some(c => c.id === pv.community.id) ||
      myUserInfo?.person_blocks.some(p => p.id === pv.creator.id)) ??
    false
  );
}

/**
 * Warning, do not use this in fetchInitialData
 */
export function myAuth(): string | undefined {
  return UserService.Instance.auth();
}

export function newVoteIsUpvote(
  voteType: VoteType,
  myVoteIsUpvote?: boolean,
): boolean | undefined {
  if (voteType === "upvote") {
    return myVoteIsUpvote === true ? undefined : true;
  } else {
    return myVoteIsUpvote === false ? undefined : false;
  }
}

export function nsfwCheck(
  pv: PostView,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const nsfw = pv.post.nsfw || pv.community.nsfw;
  const myShowNsfw = myUserInfo?.local_user_view.local_user.show_nsfw ?? false;
  return !nsfw || (nsfw && myShowNsfw);
}

export async function personSearch(text: string): Promise<PersonTribute[]> {
  const usersResponse = await fetchUsers(text);

  return usersResponse.map(pv => ({
    key: `@${pv.person.name}@${hostname(pv.person.ap_id)}`,
    view: pv,
  }));
}

export function personSelectName({
  person: { display_name, name, local, ap_id },
}: PersonView): string {
  const pName = display_name ?? name;
  return local ? pName : `${hostname(ap_id)}/${pName}`;
}

export function personToChoice(pvs: PersonView): Choice {
  return {
    value: pvs.person.id.toString(),
    label: personSelectName(pvs),
  };
}

function assertType<T>(_: T) {}

export function mixedToCommentSortType(
  sort: CommentSortType | PostSortType,
): CommentSortType {
  switch (sort) {
    case "hot":
    case "top":
    case "new":
    case "old":
    case "controversial":
      return sort;
    case "active":
    case "most_comments":
    case "new_comments":
    case "scaled":
      return "hot";
    default:
      assertType<never>(sort);
      return "hot";
  }
}

export function mixedToPostSortType(
  sort: PostSortType | CommentSortType,
): PostSortType {
  switch (sort) {
    case "active":
    case "hot":
    case "new":
    case "old":
    case "top":
    case "most_comments":
    case "new_comments":
    case "controversial":
    case "scaled":
      return sort;
    default:
      assertType<never>(sort);
      return "active";
  }
}

export function searchCommentTree<T extends CommentSlimView>(
  tree: CommentNodeI<T>[],
  id: number,
): CommentNodeI<T> | undefined {
  for (const node of tree) {
    if (node.comment_view.comment.id === id) {
      return node;
    }

    for (const child of node.children) {
      const res = searchCommentTree([child], id);

      if (res) {
        return res;
      }
    }
  }
  return undefined;
}

/**
 * This shows what language you can select
 *
 * Use showAll for the site form
 * Use showSite for the profile and community forms
 * Use false for both those to filter on your profile and site ones
 */
export function selectableLanguages(
  allLanguages: Language[] | undefined,
  siteLanguages: number[] | undefined,
  showAll: boolean | undefined,
  showSite: boolean | undefined,
  myUserInfo: MyUserInfo | undefined,
): Language[] {
  const allLangIds = allLanguages?.map(l => l.id);
  let myLangs = myUserInfo?.discussion_languages ?? allLangIds;
  myLangs = myLangs?.length === 0 ? allLangIds : myLangs;
  const siteLangs = siteLanguages?.length === 0 ? allLangIds : siteLanguages;

  const allLangs = allLanguages ?? [];

  if (showAll) {
    return allLangs;
  } else {
    if (showSite) {
      return allLangs.filter(x => siteLangs?.includes(x.id));
    } else {
      return allLangs
        .filter((x: { id: number }) => siteLangs?.includes(x.id))
        .filter((x: { id: number }) => myLangs?.includes(x.id));
    }
  }
}

export function setIsoData<T extends RouteData>(context: any): IsoData<T> {
  // If its the browser, you need to deserialize the data from the window
  if (isBrowser()) {
    return window.isoData as IsoData<T>; // This cast is wrong for things outside of <ErrorGuard />
  } else return context.router.staticContext;
}

export function updateMyUserInfo(myUserInfo: MyUserInfo | undefined) {
  if (isBrowser()) {
    if (window.isoData) {
      window.isoData.myUserInfo = myUserInfo;
      UnreadCounterService.Instance.configure(myUserInfo);
    }
  }
}

export function showAvatars(myUserInfo: MyUserInfo | undefined): boolean {
  return myUserInfo?.local_user_view.local_user.show_avatars ?? true;
}

export function showLocal(isoData: IsoData): boolean {
  return isoData.siteRes.site_view.local_site.federation_enabled;
}

export function siteBannerCss(banner: string): string {
  return ` \
      background-image: linear-gradient( rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8) ) ,url("${banner}"); \
      background-attachment: fixed; \
      background-position: top; \
      background-repeat: no-repeat; \
      background-size: 100% cover; \
  
      width: 100%; \
      max-height: 100vh; \
      `;
}

export function toast(text: string, background: ThemeColor = "success") {
  if (isBrowser()) {
    const backgroundColor = `var(--bs-${background})`;
    Toastify({
      text: text,
      style: { background: backgroundColor },
      gravity: "bottom",
      position: "left",
      duration: 5000,
    }).showToast();
  }
}

export async function pictrsDeleteToast(filename: string) {
  if (isBrowser()) {
    const clickToDeleteText = I18NextService.i18n.t("click_to_delete_picture", {
      filename,
    });
    const deletePictureText = I18NextService.i18n.t("picture_deleted", {
      filename,
    });
    const failedDeletePictureText = I18NextService.i18n.t(
      "failed_to_delete_picture",
      {
        filename,
      },
    );

    const backgroundColor = `var(--bs-light)`;

    const toast = Toastify({
      text: clickToDeleteText,
      backgroundColor: backgroundColor,
      gravity: "top",
      position: "right",
      duration: 10000,
      onClick: async () => {
        if (toast) {
          const res = await HttpService.client.deleteMedia({ filename });
          if (res.state === "success") {
            alert(deletePictureText);
          } else {
            alert(failedDeletePictureText);
          }
        }
      },
      close: true,
    });

    toast.showToast();
  }
}

export function updateCommunityBlock(
  data: CommunityResponse,
  blocked: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  if (myUserInfo) {
    if (blocked) {
      myUserInfo.community_blocks.push(data.community_view.community);
      toast(
        I18NextService.i18n.t("blocked_x", {
          item: data.community_view.community.name,
        }),
      );
    } else {
      myUserInfo.community_blocks = myUserInfo.community_blocks.filter(
        c => c.id !== data.community_view.community.id,
      );
      toast(
        I18NextService.i18n.t("unblocked_x", {
          item: data.community_view.community.name,
        }),
      );
    }
  }
}

export function updatePersonBlock(
  data: PersonResponse,
  blocked: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  if (myUserInfo) {
    if (blocked) {
      myUserInfo.person_blocks.push(data.person_view.person);
      toast(
        I18NextService.i18n.t("blocked_x", {
          item: data.person_view.person.name,
        }),
      );
    } else {
      myUserInfo.person_blocks = myUserInfo.person_blocks.filter(
        p => p.id !== data.person_view.person.id,
      );
      toast(
        I18NextService.i18n.t("unblocked_x", {
          item: data.person_view.person.name,
        }),
      );
    }
  }
}

export function updateInstanceCommunitiesBlock(
  blocked: boolean,
  id: number,
  linkedInstances: Instance[],
  myUserInfo: MyUserInfo,
) {
  const instance = linkedInstances.find(i => i.id === id)!;

  if (blocked) {
    myUserInfo.instance_communities_blocks.push(instance);
    toast(
      I18NextService.i18n.t("blocked_all_communities_from", {
        instance: instance.domain,
      }),
    );
  } else {
    myUserInfo.instance_communities_blocks =
      myUserInfo.instance_communities_blocks.filter(i => i.id !== id);
    toast(I18NextService.i18n.t("unblocked_x", { item: instance.domain }));
  }
}

export function updateInstancePersonsBlock(
  blocked: boolean,
  id: number,
  linkedInstances: Instance[],
  myUserInfo: MyUserInfo,
) {
  const instance = linkedInstances.find(i => i.id === id)!;

  if (blocked) {
    myUserInfo.instance_persons_blocks.push(instance);
    toast(
      I18NextService.i18n.t("blocked_all_users_from", {
        instance: instance.domain,
      }),
    );
  } else {
    myUserInfo.instance_persons_blocks =
      myUserInfo.instance_persons_blocks.filter(i => i.id !== id);
    toast(I18NextService.i18n.t("unblocked_x", { item: instance.domain }));
  }
}

export function instanceToChoice({ id, domain }: Instance): Choice {
  return {
    value: id.toString(),
    label: domain,
  };
}

export function isAnonymousPath(pathname: string) {
  return /^\/(login.*|signup|password_change.*|verify_email.*)\b/g.test(
    pathname,
  );
}

export function calculateUpvotePct(upvotes: number, downvotes: number): number {
  return (upvotes / (upvotes + downvotes)) * 100;
}

export function postViewToPersonContentCombinedView(
  pv: PostView,
): PostCommentCombinedView {
  return {
    type_: "post",
    ...pv,
  };
}

export function commentViewToPersonContentCombinedView(
  cv: CommentView,
): PostCommentCombinedView {
  return {
    type_: "comment",
    ...cv,
  };
}

export function userNotLoggedInOrBanned(user: MyUserInfo | undefined): boolean {
  return user === undefined || user.local_user_view.banned;
}

export function linkTarget(user: MyUserInfo | undefined): string {
  return user?.local_user_view.local_user.open_links_in_new_tab
    ? "_blank"
    : // _self is the default target on links when the field is not specified
      "_self";
}

export function postIsInteractable(
  postView: PostView,
  viewOnly: boolean,
): boolean {
  const bannedFromCommunity = postView.community_actions?.received_ban_at;

  return !(viewOnly || bannedFromCommunity);
}

export function canViewCommunity(cv: CommunityView): boolean {
  return (
    cv.community.visibility !== "private" ||
    cv.community_actions?.follow_state === "accepted"
  );
}

/**
 * Hide the image if its in the prop, or you have hide_media in your local user settings.
 **/
export function hideImages(
  hideImage: boolean,
  user: MyUserInfo | undefined,
): boolean {
  return hideImage || !!user?.local_user_view.local_user.hide_media;
}

/**
 * Hide the image if its an animated one, and you have them disabled.
 **/
export function hideAnimatedImage(
  url: string,
  user: MyUserInfo | undefined,
): boolean {
  return (
    isAnimatedImage(url) &&
    !user?.local_user_view.local_user.enable_animated_images
  );
}

/**
 * Sets the default post listing mode from either your user settings, or the site default.
 **/
export function defaultPostListingMode(isoData: IsoData): PostListingMode {
  return (
    isoData.myUserInfo?.local_user_view.local_user.post_listing_mode ??
    isoData.siteRes.site_view.local_site.default_post_listing_mode
  );
}

export function filterCommunitySelection(
  comms: CommunityView[],
  my_user?: MyUserInfo,
): CommunityView[] {
  const follows = my_user?.follows.map(c => c.community.id);
  return (
    comms
      // filter out comms where only mods can post, unless current user is mod
      .filter(c => !c.community.posting_restricted_to_mods || c.can_mod)
      // filter out private comms unless the current user follows it
      .filter(
        c =>
          c.community.visibility !== "private" ||
          follows?.includes(c.community.id),
      )
  );
}

export function mark_as_read_i18n(read: boolean): string {
  return read
    ? I18NextService.i18n.t("mark_as_unread")
    : I18NextService.i18n.t("mark_as_read");
}
