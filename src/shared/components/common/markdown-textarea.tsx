import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import {
  isBrowser,
  markdownHelpUrl,
  mdToHtml,
  pictrsDeleteToast,
  randomStr,
  setupTippy,
  setupTribute,
  toast,
} from "../../utils";
import { Icon, Spinner } from "./icon";

interface MarkdownTextAreaProps {
  initialContent?: string;
  finished?: boolean;
  buttonTitle?: string;
  replyType?: boolean;
  focus?: boolean;
  disabled?: boolean;
  maxLength?: number;
  onSubmit?(msg: { val: string; formId: string }): any;
  onContentChange?(val: string): any;
  onReplyCancel?(): any;
  hideNavigationWarnings?: boolean;
  placeholder?: string;
}

interface MarkdownTextAreaState {
  content: string;
  previewMode: boolean;
  loading: boolean;
  imageLoading: boolean;
}

export class MarkdownTextArea extends Component<
  MarkdownTextAreaProps,
  MarkdownTextAreaState
> {
  private id = `comment-textarea-${randomStr()}`;
  private formId = `comment-form-${randomStr()}`;
  private tribute: any;
  private emptyState: MarkdownTextAreaState = {
    content: this.props.initialContent,
    previewMode: false,
    loading: false,
    imageLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (isBrowser()) {
      this.tribute = setupTribute();
    }
    this.state = this.emptyState;
  }

  componentDidMount() {
    let textarea: any = document.getElementById(this.id);
    if (textarea) {
      autosize(textarea);
      this.tribute.attach(textarea);
      textarea.addEventListener("tribute-replaced", () => {
        this.state.content = textarea.value;
        this.setState(this.state);
        autosize.update(textarea);
      });

      this.quoteInsert();

      if (this.props.focus) {
        textarea.focus();
      }

      // TODO this is slow for some reason
      setupTippy();
    }
  }

  componentDidUpdate() {
    if (!this.props.hideNavigationWarnings && this.state.content) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillReceiveProps(nextProps: MarkdownTextAreaProps) {
    if (nextProps.finished) {
      this.state.previewMode = false;
      this.state.loading = false;
      this.state.content = "";
      this.setState(this.state);
      if (this.props.replyType) {
        this.props.onReplyCancel();
      }

      let textarea: any = document.getElementById(this.id);
      let form: any = document.getElementById(this.formId);
      form.reset();
      setTimeout(() => autosize.update(textarea), 10);
      this.setState(this.state);
    }
  }

  componentWillUnmount() {
    window.onbeforeunload = null;
  }

  render() {
    return (
      <form id={this.formId} onSubmit={linkEvent(this, this.handleSubmit)}>
        <Prompt
          when={!this.props.hideNavigationWarnings && this.state.content}
          message={i18n.t("block_leaving")}
        />
        <div class="form-group row">
          <div className={`col-sm-12`}>
            <textarea
              id={this.id}
              className={`form-control ${this.state.previewMode && "d-none"}`}
              value={this.state.content}
              onInput={linkEvent(this, this.handleContentChange)}
              onPaste={linkEvent(this, this.handleImageUploadPaste)}
              required
              disabled={this.props.disabled}
              rows={2}
              maxLength={this.props.maxLength || 10000}
              placeholder={this.props.placeholder}
            />
            {this.state.previewMode && (
              <div
                className="card border-secondary card-body md-div"
                dangerouslySetInnerHTML={mdToHtml(this.state.content)}
              />
            )}
          </div>
          <label class="sr-only" htmlFor={this.id}>
            {i18n.t("body")}
          </label>
        </div>
        <div class="row">
          <div class="col-sm-12 d-flex flex-wrap">
            {this.props.buttonTitle && (
              <button
                type="submit"
                class="btn btn-sm btn-secondary mr-2"
                disabled={this.props.disabled || this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : (
                  <span>{this.props.buttonTitle}</span>
                )}
              </button>
            )}
            {this.props.replyType && (
              <button
                type="button"
                class="btn btn-sm btn-secondary mr-2"
                onClick={linkEvent(this, this.handleReplyCancel)}
              >
                {i18n.t("cancel")}
              </button>
            )}
            {this.state.content && (
              <button
                className={`btn btn-sm btn-secondary mr-2 ${
                  this.state.previewMode && "active"
                }`}
                onClick={linkEvent(this, this.handlePreviewToggle)}
              >
                {i18n.t("preview")}
              </button>
            )}
            {/* A flex expander */}
            <div class="flex-grow-1"></div>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("bold")}
              aria-label={i18n.t("bold")}
              onClick={linkEvent(this, this.handleInsertBold)}
            >
              <Icon icon="bold" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("italic")}
              aria-label={i18n.t("italic")}
              onClick={linkEvent(this, this.handleInsertItalic)}
            >
              <Icon icon="italic" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("link")}
              aria-label={i18n.t("link")}
              onClick={linkEvent(this, this.handleInsertLink)}
            >
              <Icon icon="link" classes="icon-inline" />
            </button>
            <form class="btn btn-sm text-muted font-weight-bold">
              <label
                htmlFor={`file-upload-${this.id}`}
                className={`mb-0 ${
                  UserService.Instance.myUserInfo && "pointer"
                }`}
                data-tippy-content={i18n.t("upload_image")}
              >
                {this.state.imageLoading ? (
                  <Spinner />
                ) : (
                  <Icon icon="image" classes="icon-inline" />
                )}
              </label>
              <input
                id={`file-upload-${this.id}`}
                type="file"
                accept="image/*,video/*"
                name="file"
                class="d-none"
                disabled={!UserService.Instance.myUserInfo}
                onChange={linkEvent(this, this.handleImageUpload)}
              />
            </form>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("header")}
              aria-label={i18n.t("header")}
              onClick={linkEvent(this, this.handleInsertHeader)}
            >
              <Icon icon="header" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("strikethrough")}
              aria-label={i18n.t("strikethrough")}
              onClick={linkEvent(this, this.handleInsertStrikethrough)}
            >
              <Icon icon="strikethrough" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("quote")}
              aria-label={i18n.t("quote")}
              onClick={linkEvent(this, this.handleInsertQuote)}
            >
              <Icon icon="format_quote" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("list")}
              aria-label={i18n.t("list")}
              onClick={linkEvent(this, this.handleInsertList)}
            >
              <Icon icon="list" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("code")}
              aria-label={i18n.t("code")}
              onClick={linkEvent(this, this.handleInsertCode)}
            >
              <Icon icon="code" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("subscript")}
              aria-label={i18n.t("subscript")}
              onClick={linkEvent(this, this.handleInsertSubscript)}
            >
              <Icon icon="subscript" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("superscript")}
              aria-label={i18n.t("superscript")}
              onClick={linkEvent(this, this.handleInsertSuperscript)}
            >
              <Icon icon="superscript" classes="icon-inline" />
            </button>
            <button
              class="btn btn-sm text-muted"
              data-tippy-content={i18n.t("spoiler")}
              aria-label={i18n.t("spoiler")}
              onClick={linkEvent(this, this.handleInsertSpoiler)}
            >
              <Icon icon="alert-triangle" classes="icon-inline" />
            </button>
            <a
              href={markdownHelpUrl}
              class="btn btn-sm text-muted font-weight-bold"
              title={i18n.t("formatting_help")}
              rel="noopener"
            >
              <Icon icon="help-circle" classes="icon-inline" />
            </a>
          </div>
        </div>
      </form>
    );
  }

  handleImageUploadPaste(i: MarkdownTextArea, event: any) {
    let image = event.clipboardData.files[0];
    if (image) {
      i.handleImageUpload(i, image);
    }
  }

  handleImageUpload(i: MarkdownTextArea, event: any) {
    let file: any;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    const formData = new FormData();
    formData.append("images[]", file);

    i.state.imageLoading = true;
    i.setState(i.state);

    fetch(pictrsUri, {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(res => {
        console.log("pictrs upload:");
        console.log(res);
        if (res.msg == "ok") {
          let hash = res.files[0].file;
          let url = `${pictrsUri}/${hash}`;
          let deleteToken = res.files[0].delete_token;
          let deleteUrl = `${pictrsUri}/delete/${deleteToken}/${hash}`;
          let imageMarkdown = `![](${url})`;
          let content = i.state.content;
          content = content ? `${content}\n${imageMarkdown}` : imageMarkdown;
          i.state.content = content;
          i.state.imageLoading = false;
          i.contentChange();
          i.setState(i.state);
          let textarea: any = document.getElementById(i.id);
          autosize.update(textarea);
          pictrsDeleteToast(
            i18n.t("click_to_delete_picture"),
            i18n.t("picture_deleted"),
            deleteUrl
          );
        } else {
          i.state.imageLoading = false;
          i.setState(i.state);
          toast(JSON.stringify(res), "danger");
        }
      })
      .catch(error => {
        i.state.imageLoading = false;
        i.setState(i.state);
        console.error(error);
        toast(error, "danger");
      });
  }

  contentChange() {
    if (this.props.onContentChange) {
      this.props.onContentChange(this.state.content);
    }
  }

  handleContentChange(i: MarkdownTextArea, event: any) {
    i.state.content = event.target.value;
    i.contentChange();
    i.setState(i.state);
  }

  handlePreviewToggle(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.state.previewMode = !i.state.previewMode;
    i.setState(i.state);
  }

  handleSubmit(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.state.loading = true;
    i.setState(i.state);
    let msg = { val: i.state.content, formId: i.formId };
    i.props.onSubmit(msg);
  }

  handleReplyCancel(i: MarkdownTextArea) {
    i.props.onReplyCancel();
  }

  handleInsertLink(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    if (!i.state.content) {
      i.state.content = "";
    }
    let textarea: any = document.getElementById(i.id);
    let start: number = textarea.selectionStart;
    let end: number = textarea.selectionEnd;

    if (start !== end) {
      let selectedText = i.state.content.substring(start, end);
      i.state.content = `${i.state.content.substring(
        0,
        start
      )}[${selectedText}]()${i.state.content.substring(end)}`;
      textarea.focus();
      setTimeout(() => (textarea.selectionEnd = end + 3), 10);
    } else {
      i.state.content += "[]()";
      textarea.focus();
      setTimeout(() => (textarea.selectionEnd -= 1), 10);
    }
    i.contentChange();
    i.setState(i.state);
  }

  simpleSurround(chars: string) {
    this.simpleSurroundBeforeAfter(chars, chars);
  }

  simpleBeginningofLine(chars: string) {
    this.simpleSurroundBeforeAfter(`${chars} `, "", "");
  }

  simpleSurroundBeforeAfter(
    beforeChars: string,
    afterChars: string,
    emptyChars = "___"
  ) {
    if (!this.state.content) {
      this.state.content = "";
    }
    let textarea: any = document.getElementById(this.id);
    let start: number = textarea.selectionStart;
    let end: number = textarea.selectionEnd;

    if (start !== end) {
      let selectedText = this.state.content.substring(start, end);
      this.state.content = `${this.state.content.substring(
        0,
        start
      )}${beforeChars}${selectedText}${afterChars}${this.state.content.substring(
        end
      )}`;
    } else {
      this.state.content += `${beforeChars}${emptyChars}${afterChars}`;
    }
    this.contentChange();
    this.setState(this.state);
    setTimeout(() => {
      autosize.update(textarea);
    }, 10);
  }

  handleInsertBold(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("**");
  }

  handleInsertItalic(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("*");
  }

  handleInsertCode(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    if (i.getSelectedText().split(/\r*\n/).length > 1) {
      i.simpleSurroundBeforeAfter("```\n", "\n```");
    } else {
      i.simpleSurround("`");
    }
  }

  handleInsertStrikethrough(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("~~");
  }

  handleInsertList(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine("-");
  }

  handleInsertQuote(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine(">");
  }

  handleInsertHeader(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine("#");
  }

  handleInsertSubscript(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("~");
  }

  handleInsertSuperscript(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("^");
  }

  simpleInsert(chars: string) {
    if (!this.state.content) {
      this.state.content = `${chars} `;
    } else {
      this.state.content += `\n${chars} `;
    }

    let textarea: any = document.getElementById(this.id);
    textarea.focus();
    setTimeout(() => {
      autosize.update(textarea);
    }, 10);
    this.contentChange();
    this.setState(this.state);
  }

  handleInsertSpoiler(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    let beforeChars = `\n::: spoiler ${i18n.t("spoiler")}\n`;
    let afterChars = "\n:::\n";
    i.simpleSurroundBeforeAfter(beforeChars, afterChars);
  }

  quoteInsert() {
    let textarea: any = document.getElementById(this.id);
    let selectedText = window.getSelection().toString();
    if (selectedText) {
      let quotedText =
        selectedText
          .split("\n")
          .map(t => `> ${t}`)
          .join("\n") + "\n\n";
      if (this.state.content == null) {
        this.state.content = "";
      } else {
        this.state.content += "\n";
      }
      this.state.content += quotedText;
      this.contentChange();
      this.setState(this.state);
      // Not sure why this needs a delay
      setTimeout(() => autosize.update(textarea), 10);
    }
  }

  getSelectedText(): string {
    let textarea: any = document.getElementById(this.id);
    let start: number = textarea.selectionStart;
    let end: number = textarea.selectionEnd;
    return start !== end ? this.state.content.substring(start, end) : "";
  }
}
