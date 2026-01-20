import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import { Component, FormEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreateMultiCommunity,
  MultiCommunityView,
  MyUserInfo,
  UpdateMultiCommunity,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";
import { validActorRegexPattern } from "@utils/config";

interface Props {
  multiCommunityView?: MultiCommunityView; // If a multi-community is given, that means this is an edit
  onCancel?(): any;
  onCreate?(form: CreateMultiCommunity): void;
  onEdit?(form: UpdateMultiCommunity): void;
  loading?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

interface State {
  form: {
    name?: string;
    title?: string;
    description?: string;
    deleted?: boolean;
  };
  submitted: boolean;
}

@tippyMixin
export class MultiCommunityForm extends Component<Props, State> {
  private id = `multi-community-form-${randomStr()}`;

  state: State = {
    form: this.initForm(),
    submitted: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  initForm() {
    const mv = this.props.multiCommunityView;
    return mv
      ? {
          name: mv.multi.name,
          title: mv.multi.title,
          description: mv.multi.description,
          deleted: mv.multi.deleted,
        }
      : {};
  }

  render() {
    return (
      <form
        className="multi-community-form"
        onSubmit={e => handleSubmit(this, e)}
      >
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.loading &&
            !!(
              this.state.form.name ||
              this.state.form.title ||
              this.state.form.description
            ) &&
            !this.state.submitted
          }
        />
        {!this.props.multiCommunityView && (
          <div className="mb-3 row">
            <label
              className="col-12 col-sm-2 col-form-label"
              htmlFor="multi-community-name"
            >
              {I18NextService.i18n.t("name")}
              <span
                className="position-absolute pointer unselectable ms-2 text-muted"
                data-tippy-content={I18NextService.i18n.t("name_explain")}
              >
                <Icon icon="help-circle" classes="icon-inline" />
              </span>
            </label>
            <div className="col-12 col-sm-10">
              <input
                type="text"
                id="multi-community-name"
                className="form-control"
                value={this.state.form.name}
                onInput={e => handleNameChange(this, e)}
                required
                minLength={3}
                pattern={validActorRegexPattern}
                title={I18NextService.i18n.t("community_reqs")}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <label
            className="col-12 col-sm-2 col-form-label"
            htmlFor="multi-community-title"
          >
            {I18NextService.i18n.t("display_name")}
            <span
              className="position-absolute pointer unselectable ms-2 text-muted"
              data-tippy-content={I18NextService.i18n.t("display_name_explain")}
            >
              <Icon icon="help-circle" classes="icon-inline" />
            </span>
          </label>
          <div className="col-12 col-sm-10">
            <input
              type="text"
              id="multi-community-title"
              value={this.state.form.title}
              onInput={e => handleTitleChange(this, e)}
              className="form-control"
              required
              minLength={3}
              maxLength={100}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label" htmlFor={this.id}>
            {I18NextService.i18n.t("description")}
          </label>
          <div className="col-12 col-sm-10">
            <MarkdownTextArea
              initialContent={this.state.form.description}
              placeholder={I18NextService.i18n.t("description") ?? undefined}
              onContentChange={val => handleDescriptionChange(this, val)}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              myUserInfo={this.props.myUserInfo}
            />
          </div>
        </div>
        {/* TODO add a delete /restore button for the creator */}

        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-secondary me-2"
              disabled={this.props.loading}
            >
              {this.props.loading ? (
                <Spinner />
              ) : this.props.multiCommunityView ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
            {this.props.multiCommunityView && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCancel(this)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }
}

function handleSubmit(
  i: MultiCommunityForm,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  i.setState({ submitted: true });
  const cForm = i.state.form;

  const mv = i.props.multiCommunityView;

  if (mv) {
    i.props.onEdit?.({
      id: mv.multi.id,
      title: cForm.title,
      description: cForm.description,
    });
  } else {
    if (cForm.name) {
      i.props.onCreate?.({
        name: cForm.name,
        title: cForm.title,
        description: cForm.description,
      });
    }
  }
}

function handleNameChange(
  i: MultiCommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.name = event.target.value), s));
}

function handleTitleChange(
  i: MultiCommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.title = event.target.value), s));
}

function handleDescriptionChange(i: MultiCommunityForm, val: string) {
  i.setState(s => ((s.form.description = val), s));
}

function handleCancel(i: MultiCommunityForm) {
  i.props.onCancel?.();
}
