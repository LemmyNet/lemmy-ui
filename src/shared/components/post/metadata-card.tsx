import { Component, linkEvent } from "inferno";
import { Post } from "lemmy-js-client";
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
  private emptyState: MetadataCardState = {
    expanded: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  render() {
    let post = this.props.post;
    return (
      <>
        {!this.state.expanded &&
          post.embed_title.match({
            some: embedTitle =>
              post.url.match({
                some: url => (
                  <div class="card border-secondary mt-3 mb-2">
                    <div class="row">
                      <div class="col-12">
                        <div class="card-body">
                          {post.name !== embedTitle && [
                            <h5 class="card-title d-inline">
                              <a class="text-body" href={url} rel={relTags}>
                                {embedTitle}
                              </a>
                            </h5>,
                            <span class="d-inline-block ml-2 mb-2 small text-muted">
                              <a
                                class="text-muted font-italic"
                                href={url}
                                rel={relTags}
                              >
                                {new URL(url).hostname}
                                <Icon icon="external-link" classes="ml-1" />
                              </a>
                            </span>,
                          ]}
                          {post.embed_description.match({
                            some: desc => (
                              <div
                                className="card-text small text-muted md-div"
                                dangerouslySetInnerHTML={{
                                  __html: desc,
                                }}
                              />
                            ),
                            none: <></>,
                          })}
                          {post.embed_video_url.isSome() && (
                            <button
                              class="mt-2 btn btn-secondary text-monospace"
                              onClick={linkEvent(this, this.handleIframeExpand)}
                              data-tippy-content={i18n.t("expand_here")}
                            >
                              {this.state.expanded ? "-" : "+"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ),
                none: <></>,
              }),
            none: <></>,
          })}
        {this.state.expanded &&
          post.embed_video_url.match({
            some: html => (
              <div
                class="mt-3 mb-2"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ),
            none: <></>,
          })}
      </>
    );
  }

  handleIframeExpand(i: MetadataCard) {
    i.state.expanded = !i.state.expanded;
    i.setState(i.state);
  }
}
