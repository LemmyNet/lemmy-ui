import { Component } from "inferno";
import {
  CreateTagline,
  DeleteTagline,
  MyUserInfo,
  Tagline,
  EditTagline,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Prompt } from "inferno-router";

interface TaglineFormProps {
  tagline?: Tagline; // If a tagline is given, that means this is an edit
  myUserInfo: MyUserInfo | undefined;
  onCreate?: (form: CreateTagline) => void;
  onEdit?: (form: EditTagline) => void;
  onDelete?: (form: DeleteTagline) => void;
}

interface TaglineFormState {
  content?: string;
  // Necessary since markdown doesn't clear after a create submit
  clearMarkdown: boolean;
  bypassNavWarning: boolean;
}

@tippyMixin
export class TaglineForm extends Component<TaglineFormProps, TaglineFormState> {
  state: TaglineFormState = {
    content: this.props.tagline ? this.props.tagline.content : undefined,
    clearMarkdown: false,
    bypassNavWarning: true,
  };

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
          when={!!this.state.content && !this.state.bypassNavWarning}
        />
        <form className="row row-cols-md-auto g-3 mb-3 align-items-center">
          <div className="col-12">
            {!this.state.clearMarkdown && (
              <MarkdownTextArea
                initialContent={this.state.content}
                focus
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
                onClick={event => this.handleDeleteTagline(this, event)}
              >
                {I18NextService.i18n.t("delete")}
              </button>
            )}
            {isChanged && (
              <button
                className="btn btn-light border-light-subtle"
                type="submit"
                onClick={event => this.handleSubmitTagline(this, event)}
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
    i.setState({ content, bypassNavWarning: false });
  }

  handleDeleteTagline(i: TaglineForm, event: any) {
    event.preventDefault();
    const id = i.props.tagline?.id;
    if (id) {
      i.setState({ bypassNavWarning: true });
      i.props.onDelete?.({ id });
    }
  }

  handleSubmitTagline(i: TaglineForm, event: any) {
    event.preventDefault();

    const content = i.state.content ?? "";

    if (i.props.tagline) {
      i.setState({ bypassNavWarning: true });
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
