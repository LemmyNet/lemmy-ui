"use server";
import { DataType, InitialFetchRequest, IsoData } from "@/shared/interfaces";
import { HomeWrap, HomeData, HomeProps } from "../shared/components/home/home";
import { getSortTypeFromQuery } from "@/shared/components/home/home-util";
import { getListingTypeFromQuery } from "@/shared/components/home/home-util";
import { getDataTypeFromQuery } from "@/shared/components/home/home-util";
import {
  getIsoData,
  getLemmyServerClient,
} from "@/server/handlers/catch-all-handler";
import { QueryParams } from "@/shared/utils/types";
import { EMPTY_REQUEST, RequestState } from "@/shared/services/HttpService";
import {
  GetComments,
  GetCommentsResponse,
  GetPosts,
  GetPostsResponse,
  ListCommunities,
} from "lemmy-js-client";
import { fetchLimit, trendingFetchLimit } from "@/shared/config";
import { postToCommentSortType } from "@/shared/utils/app";
import { HtmlTags } from "@/shared/components/common/html-tags";

function documentTitle(isoData: IsoData): string {
  const { name, description } = isoData.site_res.site_view.site;

  return description ? `${name} - ${description}` : name;
}
const path = "/";

/**
 * nextjs will wrap this with the stuff from layout.tsx and render it purely server side
 */
export default async function Page(props: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const mainIsoData = await getIsoData(path);
  const isoData = {
    ...mainIsoData,
    routeData: await fetchInitialData({
      path,
      query: props.searchParams,
      site: mainIsoData.site_res,
      headers: {},
    }),
  };
  return (
    <>
      <HtmlTags title={documentTitle(isoData)} path={path} />
      <HomeWrap isoData={isoData} />
    </>
  );
}

/** mostly unchanged but moved from /src/components/home */
async function fetchInitialData({
  query: { dataType: urlDataType, listingType, pageCursor, sort: urlSort },
  site,
}: InitialFetchRequest<QueryParams<HomeProps>>): Promise<HomeData> {
  const client = getLemmyServerClient();

  const dataType = getDataTypeFromQuery(urlDataType);
  const type_ =
    getListingTypeFromQuery(listingType, site.my_user) ??
    site.site_view.local_site.default_post_listing_type;
  const sort = getSortTypeFromQuery(urlSort, site.my_user);

  let postsFetch: Promise<RequestState<GetPostsResponse>> =
    Promise.resolve(EMPTY_REQUEST);
  let commentsFetch: Promise<RequestState<GetCommentsResponse>> =
    Promise.resolve(EMPTY_REQUEST);

  if (dataType === DataType.Post) {
    const getPostsForm: GetPosts = {
      type_,
      page_cursor: pageCursor,
      limit: fetchLimit,
      sort,
      saved_only: false,
    };

    postsFetch = client.getPosts(getPostsForm);
  } else {
    const getCommentsForm: GetComments = {
      limit: fetchLimit,
      sort: postToCommentSortType(sort),
      type_,
      saved_only: false,
    };

    commentsFetch = client.getComments(getCommentsForm);
  }

  const trendingCommunitiesForm: ListCommunities = {
    type_: "Local",
    sort: "Hot",
    limit: trendingFetchLimit,
  };

  const trendingCommunitiesFetch = client.listCommunities(
    trendingCommunitiesForm,
  );

  const [postsRes, commentsRes, trendingCommunitiesRes] = await Promise.all([
    postsFetch,
    commentsFetch,
    trendingCommunitiesFetch,
  ]);

  return {
    trendingCommunitiesRes,
    commentsRes,
    postsRes,
  };
}
