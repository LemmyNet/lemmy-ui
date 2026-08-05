import { getHttpBaseInternal, getStaticDir } from "@utils/env";
import type { Request, Response } from "express";
import { LemmyHttp, PostView } from "lemmy-js-client";
import { mdNoImages } from "@utils/markdown";
import { renderToString } from "inferno-server";
import { Icon } from "../../shared/components/common/icon";
import { I18NextService } from "../../shared/services";
import { loadLanguageInstances } from "@services/I18NextService";

interface EmbedProps {
  post: PostView["post"];
  community: PostView["community"];
  creator: PostView["creator"];
  origin: string;
}

function EmbedPage({ post, community, creator, origin }: EmbedProps) {
  const postUrl = `${origin}/post/${post.id}`;
  const communityUrl = `${origin}/c/${community.name}`;
  const thumbnail =
    post.thumbnail_url ||
    (post.url && post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? post.url : "");

  return (
    <html lang="en" data-bs-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base target="_blank" rel="noopener noreferrer" />
        <link rel="stylesheet" href={`${getStaticDir()}/styles/styles.css`} />
        <link
          rel="stylesheet"
          href={`${getStaticDir()}/assets/css/themes/darkly.css`}
        />
      </head>
      <body className="bg-body-tertiary">
        <div className="post-listing my-2 p-3">
          <div className="small mb-1">
            <a href={communityUrl} className="text-info text-decoration-none">
              {community.name}
            </a>
            <span className="mx-1 small text-muted">
              {I18NextService.i18n.t("by")}
            </span>
            <a
              href={`${origin}/u/${creator.name}`}
              className="text-info text-decoration-none"
            >
              {creator.name}
            </a>
            {post.nsfw && <span className="badge bg-danger ms-2">NSFW</span>}
          </div>
          <h5 className="post-name d-inline text-break mb-2">
            <a href={postUrl} className="text-body text-decoration-none">
              {post.name}
            </a>
          </h5>
          {thumbnail && (
            <div className="my-2">
              <img
                className="rounded w-100"
                style={{ "max-height": "400px", "object-fit": "cover" }}
                src={thumbnail}
                alt=""
                loading="lazy"
              />
            </div>
          )}
          {post.body && (
            <div className="card card-body my-2">
              <div
                className="md-div small"
                style={{ "max-height": "300px", overflow: "hidden" }}
                dangerouslySetInnerHTML={{
                  __html: mdNoImages.render(post.body),
                }}
              />
            </div>
          )}
          <div className="d-flex align-items-center gap-3 small text-muted pt-2 border-top border-secondary">
            <span className="d-flex align-items-center gap-1">
              <Icon icon="arrow-up" inline />
              {post.score}
            </span>
            <span className="d-flex align-items-center gap-1">
              <Icon icon="message-square" inline />
              {post.comments}
            </span>
            <a
              className="text-success text-decoration-none ms-auto"
              href={postUrl}
            >
              {I18NextService.i18n.t("view_on_instance", {
                instance: origin.replace(/^https?:\/\//, ""),
              })}
              {" →"}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

export default async (req: Request, res: Response) => {
  try {
    const client = new LemmyHttp(getHttpBaseInternal(), {});
    const postRes = await client.getPost({ id: Number(req.params.post_id) });

    if (postRes.state !== "success") {
      res.status(404).send("Post not found");
      return;
    }

    // Initialize i18n for SSR
    const [, i18n] = await loadLanguageInstances([], undefined);
    I18NextService.i18n = i18n;

    const { post, community, creator } = postRes.data.post_view;
    const origin = `${req.protocol}://${req.get("host")}`;

    const html = `<!DOCTYPE html>${renderToString(
      <EmbedPage
        post={post}
        community={community}
        creator={creator}
        origin={origin}
      />,
    )}`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Frame-Options", "ALLOWALL");
    res.send(html);
  } catch (err) {
    console.error("Embed handler error:", err);
    res.status(500).send("Error rendering embed");
  }
};
