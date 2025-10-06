import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
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
  multi_community_view?: MultiCommunityView; // If a multi-community is given, that means this is an edit
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

    this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
  }

  initForm() {
    const mv = this.props.multi_community_view;
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
        onSubmit={linkEvent(this, this.handleSubmit)}
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
        {!this.props.multi_community_view && (
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
                onInput={linkEvent(this, this.handleNameChange)}
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
              onInput={linkEvent(this, this.handleTitleChange)}
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
              onContentChange={this.handleDescriptionChange}
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
              ) : this.props.multi_community_view ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
            {this.props.multi_community_view && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, this.handleCancel)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  handleSubmit(i: MultiCommunityForm, event: any) {
    event.preventDefault();
    i.setState({ submitted: true });
    const cForm = i.state.form;

    const mv = i.props.multi_community_view;

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

  handleNameChange(i: MultiCommunityForm, event: any) {
    i.setState(s => ((s.form.name = event.target.value), s));
  }

  handleTitleChange(i: MultiCommunityForm, event: any) {
    i.setState(s => ((s.form.title = event.target.value), s));
  }

  handleDescriptionChange(val: string) {
    this.setState(s => ((s.form.description = val), s));
  }

  handleCancel(i: MultiCommunityForm) {
    i.props.onCancel?.();
  }
}
