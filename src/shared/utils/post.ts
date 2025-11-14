import { Post } from "lemmy-js-client";
import { CrossPostParams } from "./types";
import { I18NextService } from "@services/index";

/**
 * Generate cross-post parameters from a post
 * Used when creating a cross-post to another community
 */
export function getCrossPostParams(post: Post): CrossPostParams {
  const { name, url, alt_text, nsfw, language_id, thumbnail_url } = post;
  const params: CrossPostParams = { name };

  if (url) {
    params.url = url;
  }

  const body = getCrossPostBody(post);
  if (body) {
    params.body = body;
  }

  if (alt_text) {
    params.altText = alt_text;
  }

  if (nsfw) {
    params.nsfw = nsfw ? "true" : "false";
  }

  if (language_id !== undefined) {
    params.languageId = language_id;
  }

  if (thumbnail_url) {
    params.customThumbnailUrl = thumbnail_url;
  }

  return params;
}

/**
 * Format post body for cross-posting with attribution
 */
function getCrossPostBody(post: Post): string | undefined {
  const body = post.body;

  return body
    ? `${I18NextService.i18n.t("cross_posted_from_url", { ap_id: post.ap_id })}
      \n\n${body.replace(/^/gm, "> ")}`
    : undefined;
}
