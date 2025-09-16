import { Component, linkEvent } from "inferno";
import {
  CreateTagline,
  DeleteTagline,
  MyUserInfo,
  Tagline,
  UpdateTagline,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Prompt } from "inferno-router";

interface TaglineFormProps {
  tagline?: Tagline; // If a tagline is given, that means this is an edit
  myUserInfo: MyUserInfo | undefined;
  onCreate?(form: CreateTagline): void;
  onEdit?(form: UpdateTagline): void;
  onDelete?(form: DeleteTagline): void;
}

interface TaglineFormState {
  content?: string;
  clearMarkdown: boolean;
}

@tippyMixin
export class TaglineForm extends Component<TaglineFormProps, TaglineFormState> {
  state: TaglineFormState = {
    content: this.props.tagline ? this.props.tagline.content : undefined,
    clearMarkdown: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const submitTitle = I18NextService.i18n.t(
      this.props.tagline ? "save" : "create",
    );

    const isChanged =
      !this.props.tagline || this.props.tagline.content !== this.state.content;

    return (
      <div className="tagline-form">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={!!this.state.content}
        />
        <form className="row row-cols-lg-auto g-3 mb-3 align-items-center">
          <div className="col-12">
            {!this.state.clearMarkdown && (
              <MarkdownTextArea
                initialContent={this.state.content}
                focus={true}
                onContentChange={s => this.handleTaglineChange(this, s)}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
                myUserInfo={this.props.myUserInfo}
              />
            )}
          </div>
          <div className="col-12">
            {this.props.tagline && (
              <button
                className="btn btn-danger me-2"
                type="submit"
                onClick={linkEvent(this, this.handleDeleteTagline)}
              >
                {I18NextService.i18n.t("delete")}
              </button>
            )}
            {isChanged && (
              <button
                className="btn btn-secondary"
                type="submit"
                onClick={linkEvent(this, this.handleSubmitTagline)}
              >
                {submitTitle}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  handleTaglineChange(i: TaglineForm, content: string) {
    i.setState({ content });
  }

  handleDeleteTagline(i: TaglineForm, event: any) {
    event.preventDefault();
    const id = i.props.tagline?.id;
    if (id) {
      i.props.onDelete?.({ id });
    }
  }

  handleSubmitTagline(i: TaglineForm, event: any) {
    event.preventDefault();

    const content = i.state.content ?? "";

    if (i.props.tagline) {
      i.props.onEdit?.({
        id: i.props.tagline.id,
        content,
      });
    } else {
      // Clear the markdown
      i.setState({ clearMarkdown: true });
      i.setState({ clearMarkdown: false, content: undefined });
      i.props.onCreate?.({ content });
    }
  }
}
