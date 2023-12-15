import {
  getIsoData,
  getLemmyServerClient,
} from "@/server/handlers/catch-all-handler";
import { Post, PostData } from "@/shared/components/post/post";
import { commentTreeMaxDepth } from "@/shared/config";
import { InitialFetchRequest } from "@/shared/interfaces";
import { GetComments, GetPost } from "lemmy-js-client";

export default async function Page(props: {
  searchParams: Record<string, string>;
  params: { post_id: string };
}) {
  console.log("props", props);
  const path = `/post/${props.params.post_id}`;
  const isoData1 = await getIsoData(path);
  const isoData = {
    ...isoData1,
    routeData: await fetchInitialData({
      path,
      query: props.searchParams,
      site: isoData1.site_res,
      headers: {},
    }),
  };
  return (
    <>
      {/*TODO<HtmlTags
        title={this.documentTitle}
        path={this.props.path}
        canonicalPath={res.post_view.post.ap_id}
        image={this.imageTag}
        description={res.post_view.post.body}
  />*/}
      <Post
        isoData={isoData}
        postId={+props.params.post_id}
        searchParams={props.searchParams}
      />
    </>
  );
}

async function fetchInitialData({
  path,
}: InitialFetchRequest): Promise<PostData> {
  const client = getLemmyServerClient();

  const pathSplit = path.split("/");

  const pathType = pathSplit.at(1);
  const id = pathSplit.at(2) ? Number(pathSplit.at(2)) : undefined;

  const postForm: GetPost = {};

  const commentsForm: GetComments = {
    max_depth: commentTreeMaxDepth,
    sort: "Hot",
    type_: "All",
    saved_only: false,
  };

  // Set the correct id based on the path type
  if (pathType === "post") {
    postForm.id = id;
    commentsForm.post_id = id;
  } else {
    postForm.comment_id = id;
    commentsForm.parent_id = id;
  }

  const [postRes, commentsRes] = await Promise.all([
    client.getPost(postForm),
    client.getComments(commentsForm),
  ]);

  return {
    postRes,
    commentsRes,
  };
}
