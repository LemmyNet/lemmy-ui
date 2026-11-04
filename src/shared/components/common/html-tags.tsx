import { httpFrontendUrl } from "@utils/env";
import { htmlToText } from "html-to-text";
import { md, stripSpoilers } from "@utils/markdown";
import { I18NextService } from "../../services";
import { setIsoData } from "@utils/app";
import { RouterContext } from "inferno-router";
import { Unhead } from "unhead/client";
import { useHead, useSeoMeta } from "unhead";
import { ResolvableLink } from "unhead/types";

type HtmlTagsProps = {
  head: Unhead;
  title: string;
  context: RouterContext;
  canonicalPath?: string;
  description?: string;
  image?: string;
};

/// Taken from https://metatags.io/
export function htmlTags(props: HtmlTagsProps) {
  const { head, title, description, image, canonicalPath, context } = props;

  const url = httpFrontendUrl(
    context.router.route.location.pathname,
    setIsoData(context),
  );

  const desc =
    description &&
    htmlToText(
      md.renderInline(
        stripSpoilers(description, I18NextService.i18n.t("spoiler")),
      ),
    );

  const canonicalUrl = canonicalPath ?? url;

  const link: ResolvableLink[] = [{ rel: "canonical", href: canonicalUrl }];

  const lang = I18NextService.i18n.resolvedLanguage;

  useHead(head, {
    link,
    htmlAttrs: { lang },
  });

  useSeoMeta(head, {
    title,
    description: desc,
    ogType: "website",
    ogTitle: title,
    ogUrl: canonicalUrl,
    ogLocale: lang,
    ogDescription: desc,
    ogImage: image,
    twitterTitle: title,
    twitterCard: "summary_large_image",
    twitterDescription: desc,
    twitterImage: image,
  });
}
