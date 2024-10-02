import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, InfernoMouseEvent, linkEvent } from "inferno";
import { Tagline } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Paginator } from "../common/paginator";
import classNames from "classnames";
import { isBrowser } from "@utils/browser";
import { Prompt } from "inferno-router";

interface EditableTagline {
  change?: "update" | "delete" | "create";
  editMode?: boolean;
  tagline: Tagline;
}

function markForUpdate(editable: EditableTagline) {
  if (editable.change !== "create") {
    editable.change = "update";
  }
}

interface TaglineFormState {
  taglines: Array<EditableTagline>;
  page: number;
  loading: boolean;
}

@tippyMixin
export class TaglineForm extends Component<
  Record<never, never>,
  TaglineFormState
> {
  state: TaglineFormState = {
    taglines: [],
    page: 1,
    loading: false,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
  }

  componentWillMount(): void {
    if (isBrowser()) {
      this.handlePageChange(1);
    }
  }

  hasPendingChanges(): boolean {
    return this.state.taglines.some(x => x.change);
  }

  render() {
    return (
      <div className="tagline-form col-12">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={this.hasPendingChanges()}
        />
        <h1 className="h4 mb-4">{I18NextService.i18n.t("taglines")}</h1>
        <div className="table-responsive col-12">
          <table
            id="taglines_table"
            className="table table-sm table-hover align-middle"
          >
            <thead className="pointer">
              <th></th>
              <th style="width:60px"></th>
              <th style="width:121px"></th>
            </thead>
            <tbody>
              {this.state.taglines.map((cv, index) => (
                <tr key={index}>
                  <td>
                    {cv.editMode ? (
                      <MarkdownTextArea
                        initialContent={cv.tagline.content}
                        focus={true}
                        onContentChange={s =>
                          this.handleTaglineChange(this, index, s)
                        }
                        hideNavigationWarnings
                        allLanguages={[]}
                        siteLanguages={[]}
                      />
                    ) : (
                      <div>{cv.tagline.content}</div>
                    )}
                  </td>
                  <td
                    className={classNames("text-center", {
                      "border-info": cv.change === "update",
                      "border-danger": cv.change === "delete",
                      "border-warning": cv.change === "create",
                    })}
                  >
                    {cv.change === "update" && (
                      <span>
                        <Icon icon="transfer" />
                      </span>
                    )}
                    {cv.change === "delete" && (
                      <span>
                        <Icon icon="trash" />
                      </span>
                    )}
                    {cv.change === "create" && (
                      <span>
                        <Icon icon="add" inline />
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(
                        { i: this, index: index },
                        this.handleEditTaglineClick,
                      )}
                      data-tippy-content={I18NextService.i18n.t("edit")}
                      aria-label={I18NextService.i18n.t("edit")}
                    >
                      <Icon icon="edit" classes="icon-inline" />
                    </button>

                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(
                        { i: this, index: index },
                        this.handleDeleteTaglineClick,
                      )}
                      data-tippy-content={I18NextService.i18n.t("delete")}
                      aria-label={I18NextService.i18n.t("delete")}
                    >
                      <Icon icon="trash" classes="icon-inline text-danger" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-3 row">
            <div className="col-12">
              <button
                className="btn btn-sm btn-secondary me-2"
                onClick={linkEvent(this, this.handleAddTaglineClick)}
              >
                {I18NextService.i18n.t("add_tagline")}
              </button>
            </div>
          </div>

          <div className="mb-3 row">
            <div className="col-12">
              <button
                onClick={linkEvent(this, this.handleSaveClick)}
                className="btn btn-secondary me-2"
                disabled={this.state.loading || !this.hasPendingChanges()}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(I18NextService.i18n.t("save"))
                )}
              </button>
              {this.hasPendingChanges() && (
                <button
                  onClick={linkEvent(this, this.handleCancelClick)}
                  className="btn btn-secondary me-2"
                >
                  {I18NextService.i18n.t("cancel")}
                </button>
              )}
            </div>
          </div>
          <div>
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
              nextDisabled={false}
              disabled={this.hasPendingChanges()}
            />
          </div>
        </div>
      </div>
    );
  }

  handleTaglineChange(i: TaglineForm, index: number, val: string) {
    const editable = i.state.taglines[index];
    i.setState(() => {
      markForUpdate(editable);
      const tagline: Tagline = editable.tagline;
      tagline.content = val;
    });
  }

  async handleDeleteTaglineClick(
    d: { i: TaglineForm; index: number },
    event: any,
  ) {
    event.preventDefault();
    const editable = d.i.state.taglines[d.index];
    if (editable.change === "create") {
      // This drops the entry immediately, other deletes have to be saved.
      d.i.setState(prev => {
        return { taglines: prev.taglines.filter(x => x !== editable) };
      });
    } else {
      d.i.setState(() => {
        editable.change = "delete";
        editable.editMode = false;
      });
    }
  }

  handleEditTaglineClick(d: { i: TaglineForm; index: number }, event: any) {
    event.preventDefault();
    const editable = d.i.state.taglines[d.index];
    d.i.setState(prev => {
      prev.taglines
        .filter(x => x !== editable)
        .forEach(x => {
          x.editMode = false;
        });
      editable.editMode = !editable.editMode;
    });
  }

  async handleSaveClick(i: TaglineForm) {
    const promises: Promise<any>[] = [];
    for (const editable of i.state.taglines) {
      if (editable.change === "update") {
        promises.push(
          HttpService.client.editTagline(editable.tagline).then(res => {
            if (res.state === "success") {
              i.setState(() => {
                editable.change = undefined;
                editable.tagline = res.data.tagline;
              });
            }
          }),
        );
      } else if (editable.change === "delete") {
        promises.push(
          HttpService.client.deleteTagline(editable.tagline).then(res => {
            if (res.state === "success") {
              i.setState(() => {
                editable.change = undefined;
                return {
                  taglines: this.state.taglines.filter(x => x !== editable),
                };
              });
            }
          }),
        );
      } else if (editable.change === "create") {
        promises.push(
          HttpService.client.createTagline(editable.tagline).then(res => {
            if (res.state === "success") {
              i.setState(() => {
                editable.change = undefined;
                editable.tagline = res.data.tagline;
              });
            }
          }),
        );
      }
    }
    await Promise.all(promises);
  }

  async handleCancelClick(i: TaglineForm) {
    i.handlePageChange(i.state.page);
  }

  async handleAddTaglineClick(
    i: TaglineForm,
    event: InfernoMouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    i.setState(prev => {
      prev.taglines.forEach(x => {
        x.editMode = false;
      });
      prev.taglines.push({
        tagline: { id: -1, content: "", published: "" },
        change: "create",
        editMode: true,
      });
    });
  }

  async handlePageChange(val: number) {
    this.setState({ loading: true });
    const taglineRes = await HttpService.client.listTaglines({ page: val });
    if (taglineRes.state === "success") {
      this.setState({
        page: val,
        loading: false,
        taglines: taglineRes.data.taglines.map(t => ({ tagline: t })),
      });
    } else {
      this.setState({ loading: false });
    }
  }
}
