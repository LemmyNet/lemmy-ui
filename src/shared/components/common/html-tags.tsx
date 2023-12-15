import { httpExternalPath } from "@utils/env";
import { htmlToText } from "html-to-text";
import Head from "next/head";
import { md } from "../../markdown";
import { I18NextService } from "../../services";

interface HtmlTagsProps {
  title: string;
  path: string;
  canonicalPath?: string;
  description?: string;
  image?: string;
}

/// Taken from https://metatags.io/
export function HtmlTags(props: HtmlTagsProps) {
  const url = httpExternalPath(props.path);
  const canonicalUrl = props.canonicalPath ?? httpExternalPath(props.path);
  const desc = props.description;
  const image = props.image;

  return (
    <Head>
      <title>{props.title}</title>
      <html lang={I18NextService.i18n.resolvedLanguage} />
      {["title", "og:title", "twitter:title"].map(t => (
        <meta key={t} property={t} content={props.title} />
      ))}
      {["og:url", "twitter:url"].map(u => (
        <meta key={u} property={u} content={url} />
      ))}
      <link rel="canonical" href={canonicalUrl} />
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      {/* Optional desc and images */}
      {["description", "og:description", "twitter:description"].map(
        n =>
          desc && (
            <meta
              key={n}
              name={n}
              content={htmlToText(md.renderInline(desc))}
            />
          ),
      )}
      {["og:image", "twitter:image"].map(
        p => image && <meta key={p} property={p} content={image} />,
      )}
      ti
    </Head>
  );
}
