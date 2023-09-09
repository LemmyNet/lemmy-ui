import { myAuthRequired } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, InfernoMouseEvent, linkEvent } from "inferno";
import { EditSite, Tagline } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface TaglineFormProps {
  taglines: Array<Tagline>;
  onSaveSite(form: EditSite): void;
  loading: boolean;
}

interface TaglineFormState {
  taglines: Array<string>;
  editingRow?: number;
}

export class TaglineForm extends Component<TaglineFormProps, TaglineFormState> {
  state: TaglineFormState = {
    editingRow: undefined,
    taglines: this.props.taglines.map(x => x.content),
  };
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div className="tagline-form col-12">
        <h1 className="h4 mb-4">{I18NextService.i18n.t("taglines")}</h1>
        <div className="table-responsive col-12">
          <table id="taglines_table" className="table table-sm table-hover">
            <thead className="pointer">
              <th></th>
              <th style="width:121px"></th>
            </thead>
            <tbody>
              {this.state.taglines.map((cv, index) => (
                <tr key={index}>
                  <td>
                    {this.state.editingRow === index && (
                      <MarkdownTextArea
                        initialContent={cv}
                        onContentChange={s =>
                          this.handleTaglineChange(this, index, s)
                        }
                        hideNavigationWarnings
                        allLanguages={[]}
                        siteLanguages={[]}
                      />
                    )}
                    {this.state.editingRow !== index && <div>{cv}</div>}
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
                disabled={this.props.loading}
              >
                {this.props.loading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(I18NextService.i18n.t("save"))
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  handleTaglineChange(i: TaglineForm, index: number, val: string) {
    if (i.state.taglines) {
      i.setState(prev => ({
        ...prev,
        taglines: prev.taglines.map((tl, i) => (i === index ? val : tl)),
      }));
    }
  }

  handleDeleteTaglineClick(d: { i: TaglineForm; index: number }, event: any) {
    event.preventDefault();
    d.i.setState(prev => ({
      ...prev,
      taglines: prev.taglines.filter((_, i) => i !== d.index),
      editingRow: undefined,
    }));
  }

  handleEditTaglineClick(d: { i: TaglineForm; index: number }, event: any) {
    event.preventDefault();
    if (d.i.state.editingRow === d.index) {
      d.i.setState({ editingRow: undefined });
    } else {
      d.i.setState({ editingRow: d.index });
    }
  }

  async handleSaveClick(i: TaglineForm) {
    i.props.onSaveSite({
      taglines: i.state.taglines,
      auth: myAuthRequired(),
    });
  }

  handleAddTaglineClick(
    i: TaglineForm,
    event: InfernoMouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    const newTaglines = [...i.state.taglines];
    newTaglines.push("");

    i.setState({
      taglines: newTaglines,
      editingRow: newTaglines.length - 1,
    });
  }
}
