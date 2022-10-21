import { Option } from "@sniptt/monads";
import { htmlToText } from "html-to-text";
import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { httpExternalPath } from "../../env";
import { md } from "../../utils";

interface HtmlTagsProps {
  title: string;
  path: string;
  description: Option<string>;
  image: Option<string>;
}

/// Taken from https://metatags.io/
export class HtmlTags extends Component<HtmlTagsProps, any> {
  render() {
    let url = httpExternalPath(this.props.path);

    return (
      <Helmet title={this.props.title}>
        {["title", "og:title", "twitter:title"].map(t => (
          <meta key={t} property={t} content={this.props.title} />
        ))}
        {["og:url", "twitter:url"].map(u => (
          <meta key={u} property={u} content={url} />
        ))}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />

        {/* Optional desc and images */}
        {this.props.description.isSome() &&
          ["description", "og:description", "twitter:description"].map(n => (
            <meta
              key={n}
              name={n}
              content={htmlToText(
                md.renderInline(this.props.description.unwrap())
              )}
            />
          ))}

        {this.props.image.isSome() &&
          ["og:image", "twitter:image"].map(p => (
            <meta key={p} property={p} content={this.props.image.unwrap()} />
          ))}
      </Helmet>
    );
  }
}
