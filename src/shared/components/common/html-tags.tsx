import { httpFrontendUrl } from "@utils/env";
import { htmlToText } from "html-to-text";
import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { md } from "@utils/markdown";
import { I18NextService } from "../../services";
import { setIsoData } from "@utils/app";
import { RouterContext } from "inferno-router/dist/Router";

interface HtmlTagsProps {
  title: string;
  context: RouterContext;
  canonicalPath?: string;
  description?: string;
  image?: string;
}

/// Taken from https://metatags.io/
export class HtmlTags extends Component<HtmlTagsProps, never> {
  render() {
    const url = httpFrontendUrl(
      this.props.context.router.route.location.pathname,
      setIsoData(this.context),
    );
    const canonicalUrl = this.props.canonicalPath ?? url;
    const desc = this.props.description;
    const image = this.props.image;

    return (
      <Helmet title={this.props.title}>
        <html lang={I18NextService.i18n.resolvedLanguage} />

        {["title", "og:title", "twitter:title"].map(t => (
          <meta key={t} property={t} content={this.props.title} />
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
      </Helmet>
    );
  }
}
