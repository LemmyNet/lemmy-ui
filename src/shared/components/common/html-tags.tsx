import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { httpExternalPath } from "../../env";
import { md } from "../../utils";

interface HtmlTagsProps {
  title: string;
  path: string;
  description?: string;
  image?: string;
}

/// Taken from https://metatags.io/
export class HtmlTags extends Component<HtmlTagsProps, any> {
  render() {
    let url = httpExternalPath(this.props.path);

    return (
      <Helmet title={this.props.title}>
        {["title", "og:title", "twitter:title"].map(t => (
          <meta property={t} content={this.props.title} />
        ))}
        {["og:url", "twitter:url"].map(u => (
          <meta property={u} content={url} />
        ))}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />

        {/* Optional desc and images */}
        {this.props.description &&
          ["description", "og:description", "twitter:description"].map(n => (
            <meta name={n} content={md.renderInline(this.props.description)} />
          ))}

        {this.props.image &&
          ["og:image", "twitter:image"].map(p => (
            <meta property={p} content={this.props.image} />
          ))}
      </Helmet>
    );
  }
}
