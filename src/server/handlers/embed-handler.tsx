import { Icon } from "@components/common/icon";
import {
  I18NextService,
  loadLanguageInstances,
} from "@services/I18NextService";
import { getHttpBaseInternal, getStaticDir } from "@utils/env";
import { hostname } from "@utils/helpers";
import { mdNoImages } from "@utils/markdown";
import type { Request, Response } from "express";
import { renderToString } from "inferno-server";
import { LemmyHttp, PostView } from "lemmy-js-client";

interface EmbedProps {
  postView: PostView;
}

function EmbedPage({ postView }: EmbedProps) {
  const { post, community, creator } = postView;

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
            <a
              href={community.ap_id}
              className="text-info text-decoration-none"
            >
              {community.name}
            </a>
            <span className="mx-1 small text-muted">
              {I18NextService.i18n.t("by")}
            </span>
            <a href={creator.ap_id} className="text-info text-decoration-none">
              {creator.name}
            </a>
            {post.nsfw && (
              <span className="badge bg-danger ms-2">
                {I18NextService.i18n.t("nsfw")}
              </span>
            )}
          </div>
          <h5 className="post-name d-inline text-break mb-2">
            <a href={post.ap_id} className="text-body text-decoration-none">
              {post.name}
            </a>
          </h5>
          {post.thumbnail_url && (
            <div className="my-2">
              <img
                className="rounded w-100 object-fit-cover"
                src={post.thumbnail_url}
                alt=""
                loading="lazy"
              />
            </div>
          )}
          {post.body && (
            <div className="card card-body my-2">
              <div
                className="md-div small overflow-hidden"
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
              className="text-success text-decoration-none ms-auto d-inline-flex align-items-center gap-1"
              href={post.ap_id}
            >
              {I18NextService.i18n.t("view_on", {
                instance: hostname(post.ap_id),
              })}
              <Icon icon="external-link" inline />
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

export default async (req: Request, res: Response) => {
  try {
    // Initialize i18n for SSR
    const [, i18n] = await loadLanguageInstances([], undefined);
    I18NextService.i18n = i18n;

    const client = new LemmyHttp(getHttpBaseInternal(), {});
    const postRes = await client.getPost({ id: Number(req.params.post_id) });

    if (postRes.state !== "success") {
      res.status(404).send(I18NextService.i18n.t("not_found"));
      return;
    }

    const html = `<!DOCTYPE html>${renderToString(
      <EmbedPage postView={postRes.data.post_view} />,
    )}`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Frame-Options", "ALLOWALL");
    res.send(html);
  } catch (err) {
    console.error("Embed handler error:", err);
    res.status(500).send(I18NextService.i18n.t("error_rendering_embed"));
  }
};
