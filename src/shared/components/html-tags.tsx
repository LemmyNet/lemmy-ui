import { Component } from 'inferno';
import { Helmet } from 'inferno-helmet';
import { httpExternalPath } from '../env';
import { md } from '../utils';

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
        {/* Primary Meta Tags */}
        <meta name="title" content={this.props.title} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={this.props.title} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={url} />
        <meta property="twitter:title" content={this.props.title} />

        {/* Optional desc and images */}
        {this.props.description && [
          <meta
            name="description"
            content={md.renderInline(this.props.description)}
          />,
          <meta
            property="og:description"
            content={md.renderInline(this.props.description)}
          />,
          <meta
            property="twitter:description"
            content={md.renderInline(this.props.description)}
          />,
        ]}

        {this.props.image && [
          <meta property="og:image" content={this.props.image} />,
          <meta property="twitter:image" content={this.props.image} />,
        ]}
      </Helmet>
    );
  }
}
