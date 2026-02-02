import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, FormEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreateMultiCommunity,
  MultiCommunityView,
  MyUserInfo,
  EditMultiCommunity,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { tippyMixin } from "../mixins/tippy-mixin";
import { validActorRegexPattern } from "@utils/config";

interface Props {
  multiCommunityView?: MultiCommunityView; // If a multi-community is given, that means this is an edit
  onCreate?(form: CreateMultiCommunity): void;
  onEdit?(form: EditMultiCommunity): void;
  onDelete?(deleted: boolean): void;
  createOrEditLoading?: boolean;
  deleteLoading?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

interface State {
  form: {
    name?: string;
    title?: string;
    summary?: string;
    deleted?: boolean;
  };
  submitted: boolean;
}

@tippyMixin
export class MultiCommunityForm extends Component<Props, State> {
  state: State = {
    form: this.initForm(),
    submitted: false,
  };

  initForm() {
    const mv = this.props.multiCommunityView;
    return mv
      ? {
          name: mv.multi.name,
          title: mv.multi.title,
          summary: mv.multi.summary,
          deleted: mv.multi.deleted,
        }
      : {};
  }

  render() {
    const mv = this.props.multiCommunityView;

    return (
      <form
        className="multi-community-form"
        onSubmit={e => handleSubmit(this, e)}
      >
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !mv &&
            (!this.props.createOrEditLoading || !this.props.deleteLoading) &&
            !!(this.state.form.name || this.state.form.title) &&
            !this.state.submitted
          }
        />
        {!mv && (
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
          <div className="col-12 col-sm-10">
            <input
              type="text"
              id="multi-community-summary"
              value={this.state.form.summary}
              onInput={e => handleSummaryChange(this, e)}
              className="form-control"
              maxLength={150}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-light border-light-subtle me-2"
              disabled={this.props.createOrEditLoading}
            >
              {this.props.createOrEditLoading ? (
                <Spinner />
              ) : mv ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
            {mv && (
              <button
                type="button"
                className={`me-2 btn btn-${
                  !mv.multi.deleted ? "danger" : "success"
                }`}
                onClick={() => handleDelete(this, !mv.multi.deleted)}
                data-tippy-content={
                  !mv.multi.deleted
                    ? I18NextService.i18n.t("delete")
                    : I18NextService.i18n.t("restore")
                }
                aria-label={
                  !mv.multi.deleted
                    ? I18NextService.i18n.t("delete")
                    : I18NextService.i18n.t("restore")
                }
              >
                {this.props.deleteLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t(
                    !mv.multi.deleted ? "delete" : "restore",
                  )
                )}
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
      summary: cForm.summary,
    });
  } else {
    if (cForm.name) {
      i.props.onCreate?.({
        name: cForm.name,
        title: cForm.title,
        summary: cForm.summary,
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

function handleSummaryChange(
  i: MultiCommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.summary = event.target.value), s));
}

function handleDelete(i: MultiCommunityForm, deleted: boolean) {
  i.props.onDelete?.(deleted);
}
