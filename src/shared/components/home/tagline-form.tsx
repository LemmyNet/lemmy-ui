import { Component, InfernoMouseEvent, linkEvent } from "inferno";
import { EditSite, GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, myAuthRequired } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface TaglineFormProps {
  siteRes: GetSiteResponse;
  onEditSite(form: EditSite): void;
}

interface TaglineFormState {
  siteRes: GetSiteResponse;
  siteForm: EditSite;
  loading: boolean;
  editingRow?: number;
}

export class TaglineForm extends Component<TaglineFormProps, TaglineFormState> {
  state: TaglineFormState = {
    loading: false,
    siteRes: this.props.siteRes,
    editingRow: undefined,
    siteForm: {
      taglines: this.props.siteRes.taglines?.map(x => x.content),
      auth: "TODO",
    },
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
              {this.state.siteForm.taglines?.map((cv, index) => (
                <tr key={index}>
                  <td>
                    {this.state.editingRow == index && (
                      <MarkdownTextArea
                        initialContent={cv}
                        onContentChange={s =>
                          this.handleTaglineChange(this, index, s)
                        }
                        hideNavigationWarnings
                        allLanguages={this.state.siteRes.all_languages}
                        siteLanguages={this.state.siteRes.discussion_languages}
                      />
                    )}
                    {this.state.editingRow != index && <div>{cv}</div>}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(
                        { form: this, index: index },
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
                        { form: this, index: index },
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
    let taglines = i.state.siteForm.taglines;
    if (taglines) {
      taglines[index] = val;
      i.setState(i.state);
    }
  }

  handleDeleteTaglineClick(
    props: { form: TaglineForm; index: number },
    event: any
  ) {
    event.preventDefault();
    let taglines = props.form.state.siteForm.taglines;
    if (taglines) {
      taglines.splice(props.index, 1);
      props.form.state.siteForm.taglines = undefined;
      props.form.setState(props.form.state);
      props.form.state.siteForm.taglines = taglines;
      props.form.setState({ ...props.form.state, editingRow: undefined });
    }
  }

  handleEditTaglineClick(
    props: { form: TaglineForm; index: number },
    event: any
  ) {
    event.preventDefault();
    if (this.state.editingRow == props.index) {
      props.form.setState({ editingRow: undefined });
    } else {
      props.form.setState({ editingRow: props.index });
    }
  }

  handleSaveClick(i: TaglineForm) {
    i.setState({ loading: true });
    let auth = myAuthRequired();
    i.setState(s => ((s.siteForm.auth = auth), s));
    i.props.onEditSite(i.state.siteForm);
    i.setState({ ...i.state, editingRow: undefined });
  }

  handleAddTaglineClick(
    i: TaglineForm,
    event: InfernoMouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    if (!i.state.siteForm.taglines) {
      i.state.siteForm.taglines = [];
    }
    i.state.siteForm.taglines.push("");
    i.setState({
      ...i.state,
      editingRow: i.state.siteForm.taglines.length - 1,
    });
  }
}
