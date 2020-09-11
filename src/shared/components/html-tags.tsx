import { Component } from 'inferno';
import { Helmet } from 'inferno-helmet';
import { httpExternalPath } from '../env';

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
        {this.props.description && (
          <meta name="description" content={this.props.description} />
        )}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={this.props.title} />
        {this.props.description && (
          <meta property="og:description" content={this.props.description} />
        )}
        {this.props.image && (
          <meta property="og:image" content={this.props.image} />
        )}

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={url} />
        <meta property="twitter:title" content={this.props.title} />
        {this.props.description && (
          <meta
            property="twitter:description"
            content={this.props.description}
          />
        )}
        {this.props.image && (
          <meta property="twitter:image" content={this.props.image} />
        )}
      </Helmet>
    );
  }
}
