import { Component } from "inferno";
import { Post } from "lemmy-js-client";
import * as sanitizeHtml from "sanitize-html";
import { unescapeHTML } from "@utils/helpers";
import { relTags } from "../../config";
import { Icon } from "../common/icon";

interface MetadataCardProps {
  post: Post;
}

export class MetadataCard extends Component<MetadataCardProps> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const post = this.props.post;

    if (post.embed_title && post.url) {
      return (
        <div className="post-metadata-card card border-secondary mt-3 mb-2">
          <div className="row">
            <div className="col-12">
              <div className="card-body">
                {post.name !== post.embed_title && (
                  <>
                    <h5 className="card-title d-inline">
                      <a
                        className="text-body"
                        href={unescapeHTML(post.url)}
                        rel={relTags}
                      >
                        {unescapeHTML(post.embed_title)}
                      </a>
                    </h5>
                    <span className="d-inline-block ms-2 mb-2 small text-muted">
                      <a
                        className="text-muted fst-italic"
                        href={unescapeHTML(post.url)}
                        rel={relTags}
                      >
                        {new URL(unescapeHTML(post.url)).hostname}
                        <Icon icon="external-link" classes="ms-1" />
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
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return <></>;
    }
  }
}
