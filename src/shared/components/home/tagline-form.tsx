import { Component, InfernoMouseEvent, linkEvent } from "inferno";
import { EditSite, Tagline } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, myAuthRequired } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface TaglineFormProps {
  taglines: Array<Tagline>;
  onSaveSite(form: EditSite): void;
}

interface TaglineFormState {
  taglines: Array<string>;
  loading: boolean;
  editingRow?: number;
}

export class TaglineForm extends Component<TaglineFormProps, TaglineFormState> {
  state: TaglineFormState = {
    loading: false,
    editingRow: undefined,
    taglines: this.props.taglines.map(x => x.content),
  };
  constructor(props: any, context: any) {
    super(props, context);
  }
  get documentTitle(): string {
    return i18n.t("taglines");
  }

  componentWillReceiveProps() {
    this.setState({ loading: false });
  }

  render() {
    return (
      <div className="col-12">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <h5 className="col-12">{i18n.t("taglines")}</h5>
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
                    {this.state.editingRow == index && (
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
                    {this.state.editingRow != index && <div>{cv}</div>}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(
                        { i: this, index: index },
                        this.handleEditTaglineClick
                      )}
                      data-tippy-content={i18n.t("edit")}
                      aria-label={i18n.t("edit")}
                    >
                      <Icon icon="edit" classes={`icon-inline`} />
                    </button>

                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(
                        { i: this, index: index },
                        this.handleDeleteTaglineClick
                      )}
                      data-tippy-content={i18n.t("delete")}
                      aria-label={i18n.t("delete")}
                    >
                      <Icon icon="trash" classes={`icon-inline text-danger`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-group row">
            <div className="col-12">
              <button
                className="btn btn-sm btn-secondary mr-2"
                onClick={linkEvent(this, this.handleAddTaglineClick)}
              >
                {i18n.t("add_tagline")}
              </button>
            </div>
          </div>

          <div className="form-group row">
            <div className="col-12">
              <button
                onClick={linkEvent(this, this.handleSaveClick)}
                className="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("save"))
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
    if (this.state.editingRow == d.index) {
      d.i.setState({ editingRow: undefined });
    } else {
      d.i.setState({ editingRow: d.index });
    }
  }

  async handleSaveClick(i: TaglineForm) {
    i.setState({ loading: true });
    i.props.onSaveSite({
      taglines: i.state.taglines,
      auth: myAuthRequired(),
    });
  }

  handleAddTaglineClick(
    i: TaglineForm,
    event: InfernoMouseEvent<HTMLButtonElement>
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
