import { randomStr } from "@utils/helpers";
import { Component, FormEvent, InfernoMouseEvent } from "inferno";
import {
  CommunityId,
  CreateCommunityTag,
  DeleteCommunityTag,
  MyUserInfo,
  CommunityTag as CommunityTagI,
  CommunityTagId,
  EditCommunityTag,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Prompt } from "inferno-router";
import { Spinner } from "@components/common/icon";
import { validActorRegexPattern } from "@utils/config";
import { CommunityTag } from "./community-tag";

type CommunityTagGenericForm = {
  tag_id?: CommunityTagId;
  community_id?: CommunityId;
  name?: string;
  display_name?: string;
  summary?: string;
};

interface CommunityTagFormProps {
  tag?: CommunityTagI; // If an tag is given, this means its an edit.
  communityId?: CommunityId; // Required if its a create.
  createOrEditLoading: boolean;
  deleteOrRestoreLoading?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onCreate?(form: CreateCommunityTag): void;
  onEdit?(form: EditCommunityTag): void;
  onDeleteOrRestore?(form: DeleteCommunityTag): void;
}

interface CommunityTagFormState {
  form: CommunityTagGenericForm;
  bypassNavWarning: boolean;
}

function isEditForm(form: CommunityTagGenericForm): form is EditCommunityTag {
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
  };

  createFormFromProps(): CommunityTagGenericForm {
    const tag = this.props.tag;
    if (tag) {
      return {
        tag_id: tag.id,
        name: tag.name,
        display_name: tag.display_name,
        summary: tag.summary,
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
              this.state.form.summary
            ) && !this.state.bypassNavWarning
          }
        />
        <form
          className="row row-cols-md-auto g-3 mb-3 align-items-center"
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
              <CommunityTag tag={this.props.tag} useName />
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
            <label className="visually-hidden" htmlFor={`description-${id}`}>
              {I18NextService.i18n.t("summary")}
            </label>{" "}
            <input
              id={`summary-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("summary")}
              className="form-control"
              value={this.state.form.summary}
              maxLength={150}
              onInput={e => handleSummaryChange(this, e)}
            />
          </div>
          <div className="col-12">
            <button
              className="btn btn-light border-light-subtle me-2"
              type="submit"
              disabled={!this.enableForm}
            >
              {this.props.createOrEditLoading ? <Spinner /> : submitTitle}
            </button>
            {this.props.tag && (
              <button
                className={`btn ${this.props.tag.deleted ? "btn-success" : "btn-danger"}`}
                onClick={e => handleDeleteOrRestore(this, e)}
              >
                {this.props.deleteOrRestoreLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t(
                    this.props.tag.deleted ? "restore" : "delete",
                  )
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

function handleSummaryChange(
  i: CommunityTagForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    form: { ...i.state.form, summary: event.target.value },
    bypassNavWarning: false,
  });
}

function handleDeleteOrRestore(
  i: CommunityTagForm,
  event: InfernoMouseEvent<HTMLButtonElement>,
) {
  event.preventDefault();
  const tag_id = i.props.tag?.id;
  const delete_ = !i.props.tag?.deleted;
  if (tag_id) {
    i.setState({ bypassNavWarning: true });
    i.props.onDeleteOrRestore?.({ tag_id, delete: delete_ });
  }
}

function handleSubmit(i: CommunityTagForm, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  i.setState({ bypassNavWarning: true });

  const form = i.state.form;
  if (isEditForm(form)) {
    i.props.onEdit?.(form);
  } else if (isCreateForm(form)) {
    i.props.onCreate?.(form);
  }
}
