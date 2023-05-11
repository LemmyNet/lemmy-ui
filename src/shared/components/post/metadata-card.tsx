import { Component, linkEvent } from "inferno";
import { Post } from "lemmy-js-client";
import * as sanitizeHtml from "sanitize-html";
import { i18n } from "../../i18next";
import { relTags } from "../../utils";
import { Icon } from "../common/icon";

interface MetadataCardProps {
  post: Post;
}

interface MetadataCardState {
  expanded: boolean;
}

export class MetadataCard extends Component<
  MetadataCardProps,
  MetadataCardState
> {
  state: MetadataCardState = {
    expanded: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let post = this.props.post;
    return (
      <>
        {!this.state.expanded && post.embed_title && post.url && (
          <div className="card border-secondary mt-3 mb-2">
            <div className="row">
              <div className="col-12">
                <div className="card-body">
                  {post.name !== post.embed_title && (
                    <>
                      <h5 className="card-title d-inline">
                        <a className="text-body" href={post.url} rel={relTags}>
                          {post.embed_title}
                        </a>
                      </h5>
                      <span className="d-inline-block ml-2 mb-2 small text-muted">
                        <a
                          className="text-muted font-italic"
                          href={post.url}
                          rel={relTags}
                        >
                          {new URL(post.url).hostname}
                          <Icon icon="external-link" classes="ml-1" />
                        </a>
                      </span>
                    </>
                  )}
                  {post.embed_description && (
                    <div
                      className="card-text small text-muted md-div"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(post.embed_description),
                      }}
                    />
                  )}
                  {post.embed_video_url && (
                    <button
                      className="mt-2 btn btn-secondary text-monospace"
                      onClick={linkEvent(this, this.handleIframeExpand)}
                    >
                      {i18n.t("expand_here")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {this.state.expanded && post.embed_video_url && (
          <iframe src={post.embed_video_url}></iframe>
        )}
      </>
    );
  }

  handleIframeExpand(i: MetadataCard) {
    i.setState({ expanded: !i.state.expanded });
  }
}
