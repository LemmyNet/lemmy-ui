import { randomStr } from "@utils/helpers";
import { Component, FormEvent, InfernoMouseEvent } from "inferno";
import {
  CommunityId,
  CreateCommunityTag,
  DeleteCommunityTag,
  MyUserInfo,
  Tag,
  TagId,
  UpdateCommunityTag,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Prompt } from "inferno-router";
import { Spinner } from "@components/common/icon";
import { MarkdownTextArea } from "@components/common/markdown-textarea";
import { validActorRegexPattern } from "@utils/config";

type CommunityTagGenericForm = {
  tag_id?: TagId;
  community_id?: CommunityId;
  name?: string;
  display_name?: string;
  description?: string;
};

interface CommunityTagFormProps {
  tag?: Tag; // If an tag is given, this means its an edit.
  communityId?: CommunityId; // Required if its a create.
  createOrUpdateLoading: boolean;
  deleteLoading?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onCreate?(form: CreateCommunityTag): void;
  onUpdate?(form: UpdateCommunityTag): void;
  onDelete?(form: DeleteCommunityTag): void;
}

interface CommunityTagFormState {
  form: CommunityTagGenericForm;
  bypassNavWarning: boolean;
  // Necessary since markdown doesn't clear after a create submit
  clearMarkdown: boolean;
}

function isUpdateForm(
  form: CommunityTagGenericForm,
): form is UpdateCommunityTag {
  return form.tag_id !== undefined;
}

function isCreateForm(
  form: CommunityTagGenericForm,
): form is CreateCommunityTag {
  return form.tag_id === undefined;
}

@tippyMixin
export class CommunityTagForm extends Component<
  CommunityTagFormProps,
  CommunityTagFormState
> {
  state: CommunityTagFormState = {
    form: this.createFormFromProps(),
    bypassNavWarning: true,
    clearMarkdown: false,
  };

  createFormFromProps(): CommunityTagGenericForm {
    const tag = this.props.tag;
    if (tag) {
      return {
        tag_id: tag.id,
        name: tag.name,
        display_name: tag.display_name,
        description: tag.description,
      };
    } else {
      return { community_id: this.props.communityId };
    }
  }

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const submitTitle = I18NextService.i18n.t(
      this.props.tag ? "save" : "create",
    );

    const id = randomStr();

    return (
      <div className="tag-form col-12">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !!(
              this.state.form.name ||
              this.state.form.display_name ||
              this.state.form.description
            ) && !this.state.bypassNavWarning
          }
        />
        <form
          className="row row-cols-md-auto g-3 mb-3 align-items-top"
          onSubmit={e => handleSubmit(this, e)}
        >
          {/** Only show the name input if it hasn't been created **/}
          <div className="col-12">
            {!this.props.tag ? (
              <>
                <label className="visually-hidden" htmlFor={`name-${id}`}>
                  {I18NextService.i18n.t("name")}
                </label>
                <input
                  id={`name-${id}`}
                  type="text"
                  placeholder={I18NextService.i18n.t("name")}
                  className="form-control"
                  value={this.state.form.name}
                  required
                  minLength={3}
                  pattern={validActorRegexPattern}
                  onInput={e => handleNameChange(this, e)}
                />
              </>
            ) : (
              <div>{this.props.tag.name}</div>
            )}
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`display-name-${id}`}>
              {I18NextService.i18n.t("display_name")}
            </label>{" "}
            <input
              id={`display-name-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("display_name")}
              className="form-control"
              value={this.state.form.display_name}
              pattern="^(?!@)(.+)$"
              minLength={3}
              onInput={e => handleDisplayNameChange(this, e)}
            />
          </div>
          <div className="col-12">
            {!this.state.clearMarkdown && (
              <MarkdownTextArea
                initialContent={this.state.form.description}
                placeholder={I18NextService.i18n.t("description") ?? undefined}
                onContentChange={s => handleDescriptionChange(this, s)}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
                myUserInfo={this.props.myUserInfo}
              />
            )}
          </div>
          <div className="col-12">
            <button
              className="btn btn-secondary me-2"
              type="submit"
              disabled={!this.enableForm}
            >
              {this.props.createOrUpdateLoading ? <Spinner /> : submitTitle}
            </button>
            {this.props.tag && (
              <button
                className="btn btn-danger"
                onClick={e => handleDelete(this, e)}
              >
                {this.props.deleteLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("delete")
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  get enableForm() {
    return (this.state.form.name?.length ?? 0) > 0;
  }
}

function handleNameChange(
  i: CommunityTagForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    form: { ...i.state.form, name: event.target.value },
    bypassNavWarning: false,
  });
}

function handleDisplayNameChange(
  i: CommunityTagForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    form: { ...i.state.form, display_name: event.target.value },
    bypassNavWarning: false,
  });
}

function handleDescriptionChange(i: CommunityTagForm, description: string) {
  i.setState({
    form: { ...i.state.form, description },
    bypassNavWarning: false,
  });
}

function handleDelete(
  i: CommunityTagForm,
  event: InfernoMouseEvent<HTMLButtonElement>,
) {
  event.preventDefault();
  const tag_id = i.props.tag?.id;
  if (tag_id) {
    i.setState({ bypassNavWarning: true });
    i.props.onDelete?.({ tag_id });
  }
}

function handleSubmit(i: CommunityTagForm, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  i.setState({ bypassNavWarning: true });

  const form = i.state.form;
  if (isUpdateForm(form)) {
    i.props.onUpdate?.(form);
  } else if (isCreateForm(form)) {
    // Clear the markdown
    i.setState({ clearMarkdown: true });
    i.setState({
      clearMarkdown: false,
      form: {
        ...i.state.form,
        description: undefined,
        name: undefined,
        display_name: undefined,
      },
    });
    i.props.onCreate?.(form);
  }
}
