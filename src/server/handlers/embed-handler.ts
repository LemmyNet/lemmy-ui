import { getHttpBaseInternal } from "@utils/env";
import type { Request, Response } from "express";
import { LemmyHttp } from "lemmy-js-client";
import { mdNoImages } from "@utils/markdown";

export default async (req: Request, res: Response) => {
  try {
    const client = new LemmyHttp(getHttpBaseInternal(), {});
    const postRes = await client.getPost({ id: Number(req.params.post_id) });

    if (postRes.state !== "success") {
      res.status(404).send("Post not found");
      return;
    }

    const { post, community, creator } = postRes.data.post_view;
    const escape = mdNoImages.utils.escapeHtml;
    const origin = `${req.protocol}://${req.get("host")}`;
    const postUrl = `${origin}/post/${post.id}`;
    const communityUrl = `${origin}/c/${community.name}`;
    const thumbnail =
      post.thumbnail_url ||
      (post.url && post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ? post.url
        : "");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" rel="noopener noreferrer" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #222;
    color: #ebebeb;
    padding: 12px;
    max-width: 640px;
    margin: 0 auto;
    overflow-x: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #888;
    margin-bottom: 8px;
  }
  .header a { color: #888; text-decoration: none; }
  .header a:hover { color: #00bc8c; text-decoration: underline; }
  .header .dot { opacity: 0.5; }
  .title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  .title a { color: #ebebeb; text-decoration: none; }
  .title a:hover { color: #00bc8c; text-decoration: underline; }
  .thumbnail {
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .body {
    font-size: 14px;
    line-height: 1.5;
    color: #ebebeb;
    max-height: 300px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .body p { margin-bottom: 8px; }
  .body img { max-width: 100%; border-radius: 4px; }
  .body a { color: #00bc8c; text-decoration: none; }
  .body a:hover { text-decoration: underline; }
  .body code {
    background: #303030;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 13px;
  }
  .body pre {
    background: #303030;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 8px;
  }
  .body blockquote {
    border-left: 3px solid #444;
    padding-left: 12px;
    margin-bottom: 8px;
    opacity: 0.8;
  }
  .body details {
    margin-bottom: 8px;
    padding: 8px;
    background: #303030;
    border-radius: 4px;
  }
  .body details summary { cursor: pointer; font-weight: 500; }
  .footer {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    color: #888;
    padding-top: 8px;
    border-top: 1px solid rgba(235, 235, 235, 0.25);
  }
  .footer .stat { display: flex; align-items: center; gap: 4px; }
  .footer .view-link {
    margin-left: auto;
    color: #00bc8c;
    text-decoration: none;
    font-weight: 500;
  }
  .footer .view-link:hover { text-decoration: underline; }
  .nsfw-badge {
    background: #e74c3c;
    color: #fff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
  }
</style>
</head>
<body>
  <div class="header">
    <a href="${escape(communityUrl)}">${escape(community.name)}</a>
    <span class="dot">·</span>
    <span>by ${escape(creator.name)}</span>
    ${post.nsfw ? '<span class="nsfw-badge">NSFW</span>' : ""}
  </div>
  <div class="title"><a href="${escape(postUrl)}">${escape(post.name)}</a></div>
  ${thumbnail ? `<img class="thumbnail" src="${escape(thumbnail)}" alt="" loading="lazy" />` : ""}
  ${post.body ? `<div class="body">${mdNoImages.render(post.body)}</div>` : ""}
  <div class="footer">
    <span class="stat">▲ ${post.score}</span>
    <span class="stat">💬 ${post.comments}</span>
    <a class="view-link" href="${escape(postUrl)}">View on Lemmy →</a>
  </div>
</body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Frame-Options", "ALLOWALL");
    res.send(html);
  } catch (err) {
    console.error("Embed handler error:", err);
    res.status(500).send("Error rendering embed");
  }
};
