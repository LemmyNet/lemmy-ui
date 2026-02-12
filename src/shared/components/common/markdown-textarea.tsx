import { isBrowser, platform } from "@utils/browser";
import { numToSI, randomStr } from "@utils/helpers";
import autosize from "autosize";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, FormEvent } from "inferno";
import { createElement } from "inferno-create-element";
import { Prompt } from "inferno-router";
import { Language, LanguageId, MyUserInfo } from "lemmy-js-client";
import {
  concurrentImageUpload,
  markdownFieldCharacterLimit,
  markdownHelpUrl,
  maxUploadImages,
  relTags,
} from "@utils/config";
import { customEmojisLookup, mdToHtml, setupTribute } from "@utils/markdown";
import { HttpService, I18NextService } from "@services/index";
import { tippyMixin } from "../mixins/tippy-mixin";
import { userNotLoggedInOrBanned, pictrsDeleteToast, toast } from "@utils/app";
import { EmojiPicker } from "./emoji-picker";
import { Icon, Spinner } from "./icon";
import { LanguageSelect } from "./language-select";
import ProgressBar from "./progress-bar";
import { validURL } from "@utils/helpers";
interface MarkdownTextAreaProps {
  /**
   * Initial content inside the textarea
   */
  initialContent?: string;
  /**
   * Numerical ID of the language to select in dropdown
   */
  initialLanguageId?: number;
  placeholder?: string;
  buttonTitle?: string;
  maxLength?: number;
  /**
   * Whether this form is for a reply to a Private Message.
   * If true, a "Cancel" button is shown that will close the reply.
   */
  replyType?: boolean;
  focus?: boolean;
  disabled?: boolean;
  /**
   * Whether to show the language selector
   */
  showLanguage?: boolean;
  hideNavigationWarnings?: boolean;
  onContentChange?: (val: string) => void;
  onContentBlur?: (val: string) => void;
  onReplyCancel?: () => void;
  onSubmit?: (content: string, languageId?: number) => void;
  allLanguages?: Language[];
  siteLanguages?: LanguageId[];
  renderAsDiv?: boolean;
  myUserInfo: MyUserInfo | undefined;
  loading?: boolean;
}

interface ImageUploadStatus {
  total: number;
  uploaded: number;
}

interface MarkdownTextAreaState {
  id: string;
  formId: string;
  content?: string;
  languageId?: number;
  previewMode: boolean;
  imageUploadStatus?: ImageUploadStatus;
}

@tippyMixin
export class MarkdownTextArea extends Component<
  MarkdownTextAreaProps,
  MarkdownTextAreaState
> {
  state: MarkdownTextAreaState = {
    id: `markdown-textarea-${randomStr()}`,
    formId: `markdown-form-${randomStr()}`,
    content: this.props.initialContent,
    languageId: this.props.initialLanguageId,
    previewMode: false,
  };

  async componentDidMount() {
    if (isBrowser()) {
      const tribute = await setupTribute();
      const textarea: any = document.getElementById(this.state.id);
      if (textarea) {
        autosize(textarea);
        tribute.attach(textarea);
        textarea.addEventListener("tribute-replaced", () => {
          this.setState({ content: textarea.value });
          autosize.update(textarea);
        });

        handleQuoteInsert(this);

        if (this.props.focus) {
          textarea.focus();
        }
      }
    }
  }

  render() {
    const languageId = this.state.languageId;
    return createElement(
      this.props.renderAsDiv ? "div" : "form",
      {
        className: "markdown-textarea",
        id: this.state.formId,
        onSubmit: (e: any) =>
          this.props.renderAsDiv ? undefined : handleSubmit(this, e),
      },
      <>
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.hideNavigationWarnings &&
            (!!this.state.content || this.props.loading)
          }
        />
        <div className="row mb-2">
          <div className="col-12">
            <div className="rounded bg-light border">
              {!this.state.previewMode && (
                <div
                  className={classNames("d-flex flex-wrap border-bottom", {
                    "no-click": this.isDisabled,
                  })}
                >
                  {this.getFormatButton("bold", () => handleInsertBold(this))}
                  {this.getFormatButton("italic", () =>
                    handleInsertItalic(this),
                  )}
                  {this.getFormatButton("link", () => handleInsertLink(this))}
                  <EmojiPicker
                    onEmojiClick={emoji => handleEmoji(this, emoji)}
                  ></EmojiPicker>
                  <label
                    htmlFor={`file-upload-${this.state.id}`}
                    className={classNames("mb-0", {
                      pointer: this.props.myUserInfo,
                    })}
                    data-tippy-content={I18NextService.i18n.t("upload_image")}
                  >
                    {this.state.imageUploadStatus ? (
                      <Spinner />
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-link rounded-0 text-muted mb-0"
                        onClick={() => {
                          document
                            .getElementById(`file-upload-${this.state.id}`)
                            ?.click();
                        }}
                      >
                        <Icon icon="image" classes="icon-inline" />
                      </button>
                    )}
                  </label>
                  <input
                    id={`file-upload-${this.state.id}`}
                    type="file"
                    accept="image/*,video/*"
                    name="file"
                    className="d-none"
                    multiple
                    disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
                    onChange={e => handleImageUpload(this, e)}
                  />
                  {this.getFormatButton("header", () =>
                    handleInsertHeader(this),
                  )}
                  {this.getFormatButton("strikethrough", () =>
                    handleInsertStrikethrough(this),
                  )}
                  {this.getFormatButton("quote", () => handleInsertQuote(this))}
                  {this.getFormatButton("list", () => handleInsertList(this))}
                  {this.getFormatButton("code", () => handleInsertCode(this))}
                  {this.getFormatButton("subscript", () =>
                    handleInsertSubscript(this),
                  )}
                  {this.getFormatButton("superscript", () =>
                    handleInsertSuperscript(this),
                  )}
                  {this.getFormatButton("spoiler", () =>
                    handleInsertSpoiler(this),
                  )}
                  <a
                    href={markdownHelpUrl}
                    className="btn btn-sm btn-link rounded-0 text-muted fw-bold"
                    title={I18NextService.i18n.t("formatting_help")}
                    rel={relTags}
                    target="_blank"
                  >
                    <Icon icon="help-circle" classes="icon-inline" />
                  </a>
                </div>
              )}
              <div>
                <textarea
                  id={this.state.id}
                  className={classNames(
                    "form-control border-0 rounded-top-0 rounded-bottom",
                    {
                      "d-none": this.state.previewMode,
                    },
                  )}
                  value={this.state.content}
                  onInput={e => handleContentChange(this, e)}
                  onBlur={e => handleContentBlur(this, e)}
                  onPaste={e => handlePaste(this, e)}
                  onKeyDown={e => handleKeyBinds(this, e)}
                  required
                  disabled={this.isDisabled}
                  rows={2}
                  maxLength={
                    this.props.maxLength ?? markdownFieldCharacterLimit
                  }
                  placeholder={this.props.placeholder}
                  spellCheck
                />
                {this.state.previewMode && this.state.content && (
                  <div
                    className="card card-body md-div"
                    dangerouslySetInnerHTML={mdToHtml(this.state.content, () =>
                      this.forceUpdate(),
                    )}
                  />
                )}
                {this.state.imageUploadStatus &&
                  this.state.imageUploadStatus.total > 1 && (
                    <ProgressBar
                      className="mt-2"
                      striped
                      animated
                      value={this.state.imageUploadStatus.uploaded}
                      max={this.state.imageUploadStatus.total}
                      text={
                        I18NextService.i18n.t("pictures_uploaded_progess", {
                          uploaded: this.state.imageUploadStatus.uploaded,
                          total: this.state.imageUploadStatus.total,
                        }) ?? undefined
                      }
                    />
                  )}
              </div>
              <label className="visually-hidden" htmlFor={this.state.id}>
                {I18NextService.i18n.t("body")}
              </label>
            </div>
          </div>
        </div>

        <div className="row row-cols-auto align-items-center g-2 g-sm-3 mb-2 mb-sm-2">
          {this.props.buttonTitle && (
            <div className="col">
              <button
                type="submit"
                className="btn btn-sm btn-light border-light-subtle"
                disabled={this.isDisabled || !this.state.content}
              >
                {this.props.loading && <Spinner className="me-1" />}
                {this.props.buttonTitle}
              </button>
            </div>
          )}
          <div className="col">
            <button
              type="button"
              disabled={!this.state.content}
              className={classNames(
                "btn btn-sm btn-light border-light-subtle",
                {
                  active: this.state.previewMode,
                },
              )}
              onClick={() => handlePreviewToggle(this)}
            >
              {this.state.previewMode
                ? I18NextService.i18n.t("edit")
                : I18NextService.i18n.t("preview")}
            </button>
          </div>
          {this.props.replyType && (
            <div className="col">
              <button
                type="button"
                className="btn btn-sm btn-light border-light-subtle"
                onClick={() => handleReplyCancel(this)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </div>
          )}

          {this.props.showLanguage && (
            <div className="col ms-auto">
              <LanguageSelect
                iconVersion
                allLanguages={this.props.allLanguages}
                selectedLanguageIds={
                  languageId ? Array.of(languageId) : undefined
                }
                siteLanguages={this.props.siteLanguages}
                onChange={val => handleLanguageChange(this, val)}
                disabled={this.isDisabled}
                myUserInfo={this.props.myUserInfo}
              />
            </div>
          )}
        </div>
      </>,
    );
  }

  getFormatButton(
    type: NoOptionI18nKeys,
    handleClick: (i: MarkdownTextArea) => void,
  ) {
    let iconType: string;

    switch (type) {
      case "spoiler": {
        iconType = "alert-triangle";
        break;
      }
      case "quote": {
        iconType = "format_quote";
        break;
      }
      default: {
        iconType = type;
      }
    }

    return (
      <button
        className="btn btn-sm btn-link rounded-0 text-muted"
        data-tippy-content={I18NextService.i18n.t(type)}
        aria-label={I18NextService.i18n.t(type)}
        onClick={() => handleClick(this)}
      >
        <Icon icon={iconType} classes="icon-inline" />
      </button>
    );
  }

  getSelectedText(): string {
    const { selectionStart: start, selectionEnd: end } =
      document.getElementById(this.state.id) as any;
    return start !== end
      ? (this.state.content?.substring(start, end) ?? "")
      : "";
  }

  get isDisabled() {
    return (
      this.props.loading ||
      this.props.disabled ||
      !!this.state.imageUploadStatus
    );
  }
}

function handleEmoji(i: MarkdownTextArea, e: any) {
  let value = e.native;
  if (!value) {
    const emoji = customEmojisLookup.get(e.id)?.custom_emoji;
    if (emoji) {
      value = `![${emoji.alt_text}](${emoji.image_url} "emoji ${emoji.shortcode}")`;
    }
  }
  handleInsertAtCursor(i, value);
}

function handlePaste(i: MarkdownTextArea, event: ClipboardEvent) {
  if (!event.clipboardData) return;

  // check clipboard files
  const image = event.clipboardData.files[0];
  if (image) {
    handleImageUpload(i, image);
    return;
  }

  // check clipboard url
  const url = event.clipboardData.getData("text");
  if (validURL(url)) {
    handleUrlPaste(i, url, event);
  }
}

function handleUrlPaste(
  i: MarkdownTextArea,
  url: string,
  event: ClipboardEvent,
) {
  // query textarea element
  const textarea = document.getElementById(i.state.id);

  if (textarea instanceof HTMLTextAreaElement) {
    const { selectionStart, selectionEnd } = textarea;

    // if no selection, just insert url
    if (selectionStart === selectionEnd) return;

    event.preventDefault();
    const selectedText = i.getSelectedText();

    // update textarea content
    i.setState(({ content }) => ({
      content: `${
        content?.substring(0, selectionStart) ?? ""
      }[${selectedText}](${url})${content?.substring(selectionEnd) ?? ""}`,
    }));
    handleSubmitContentChange(i);

    // shift selection 1 to the right
    textarea.setSelectionRange(
      selectionStart + 1,
      selectionStart + 1 + selectedText.length,
    );
  }
}

function handleImageUpload(i: MarkdownTextArea, event: any) {
  const files: File[] = [];
  if (event.target) {
    event.preventDefault();
    files.push(...event.target.files);
  } else {
    files.push(event);
  }

  if (files.length > maxUploadImages) {
    toast(
      I18NextService.i18n.t("too_many_images_upload", {
        count: Number(maxUploadImages),
        formattedCount: numToSI(maxUploadImages),
      }),
      "danger",
    );
  } else {
    i.setState({
      imageUploadStatus: { total: files.length, uploaded: 0 },
    });

    handleUploadImages(i, files).then(() => {
      i.setState({ imageUploadStatus: undefined });
    });
  }
}

async function handleUploadImages(i: MarkdownTextArea, files: File[]) {
  let errorOccurred = false;
  const filesCopy = [...files];
  while (filesCopy.length > 0 && !errorOccurred) {
    try {
      await Promise.all(
        filesCopy.splice(0, concurrentImageUpload).map(async file => {
          await handleUploadSingleImage(i, file);

          i.setState(({ imageUploadStatus }) => ({
            imageUploadStatus: {
              ...(imageUploadStatus as Required<ImageUploadStatus>),
              uploaded: (imageUploadStatus?.uploaded ?? 0) + 1,
            },
          }));
        }),
      );
    } catch {
      errorOccurred = true;
    }
  }
}

async function handleUploadSingleImage(i: MarkdownTextArea, image: File) {
  const res = await HttpService.client.uploadImage({ image });
  if (res.state === "success") {
    const imageMarkdown = `![](${res.data.image_url})`;
    handleInsertAtCursor(i, imageMarkdown);

    pictrsDeleteToast(res.data.filename);
  } else if (res.state === "failed") {
    i.setState({ imageUploadStatus: undefined });
    console.error(res.err.name);
    toast(res.err.name, "danger");

    throw res.err;
  }
}

// Insert the given string at the current cursor position. By default the cursor is
// placed right after the newly inserted text, but this can be changed with
// `cursorOffset`.
function handleInsertAtCursor(
  i: MarkdownTextArea,
  text: string,
  cursorOffset: number = 0,
) {
  const textarea: HTMLTextAreaElement = document.getElementById(
    i.state.id,
  ) as HTMLTextAreaElement;
  const cursorPosition = textarea.selectionStart;

  i.setState(({ content }) => {
    const currentContent = content ?? "";
    return {
      content:
        currentContent.slice(0, cursorPosition) +
        text +
        currentContent.slice(cursorPosition),
    };
  });
  handleSubmitContentChange(i);
  // Update cursor position to after the inserted image link
  setTimeout(() => {
    textarea.selectionStart = cursorPosition + text.length + cursorOffset;
    textarea.selectionEnd = cursorPosition + text.length + cursorOffset;
    textarea.focus();
    autosize.update(textarea);
  }, 10);
}

function handleSubmitContentChange(i: MarkdownTextArea) {
  // Coerces the undefineds to empty strings, for replacing in the DB
  const content = i.state.content ?? "";
  i.props.onContentChange?.(content);
}

function handleContentChange(
  i: MarkdownTextArea,
  event: FormEvent<HTMLTextAreaElement>,
) {
  i.setState({ content: event.target.value });
  handleSubmitContentChange(i);
}

function handleContentBlur(i: MarkdownTextArea, event: any) {
  i.props.onContentBlur?.(event.target.value);
}

// Keybind handler
// Keybinds inspired by github comment area
function handleKeyBinds(i: MarkdownTextArea, event: KeyboardEvent) {
  if (platform.isMac() ? event.metaKey : event.ctrlKey) {
    switch (event.key) {
      case "k": {
        handleInsertLink(i);
        break;
      }
      case "Enter": {
        if (!i.isDisabled) {
          handleSubmit(i, event);
        }

        break;
      }
      case "b": {
        handleInsertBold(i);
        break;
      }
      case "i": {
        handleInsertItalic(i);
        break;
      }
      case "e": {
        handleInsertCode(i);
        break;
      }
      case "8": {
        handleInsertList(i);
        break;
      }
      case "s": {
        handleInsertSpoiler(i);
        break;
      }
      case "p": {
        if (i.state.content) handlePreviewToggle(i);
        break;
      }
      case ".": {
        handleInsertQuote(i);
        break;
      }
    }
  }
}

function handlePreviewToggle(i: MarkdownTextArea) {
  i.setState({ previewMode: !i.state.previewMode });
}

function handleLanguageChange(i: MarkdownTextArea, val: number[]) {
  i.setState({ languageId: val[0] });
}

function handleSubmit(i: MarkdownTextArea, event: any) {
  event.preventDefault();
  if (i.state.content) {
    i.props.onSubmit?.(i.state.content, i.state.languageId);
  }
}

function handleReplyCancel(i: MarkdownTextArea) {
  i.props.onReplyCancel?.();
}

function handleInsertLink(i: MarkdownTextArea) {
  const textarea: any = document.getElementById(i.state.id);
  const start: number = textarea.selectionStart;
  const end: number = textarea.selectionEnd;

  const content = i.state.content ?? "";

  if (!i.state.content) {
    i.setState({ content: "" });
  }

  if (start !== end) {
    const selectedText = content?.substring(start, end);
    i.setState({
      content: `${content?.substring(
        0,
        start,
      )}[${selectedText}]()${content?.substring(end)}`,
    });
    textarea.focus();
    setTimeout(() => (textarea.selectionEnd = end + 3), 10);
  } else {
    handleInsertAtCursor(i, "[]()", -3);
  }
  handleSubmitContentChange(i);
}

function handleSimpleSurround(i: MarkdownTextArea, chars: string) {
  handleSimpleSurroundBeforeAfter(i, chars, chars);
}

function handleSimpleBeginningofLine(i: MarkdownTextArea, chars: string) {
  handleSimpleSurroundBeforeAfter(i, `${chars}`, "", "");
}

function handleSimpleSurroundEscapeWords(i: MarkdownTextArea, chars: string) {
  handleSimpleSurroundBeforeAfter(i, chars, chars, "", true);
}

function handleSimpleSurroundBeforeAfter(
  i: MarkdownTextArea,
  beforeChars: string,
  afterChars: string,
  emptyChars = "___",
  escapeWords = false,
) {
  const content = i.state.content ?? "";
  if (!i.state.content) {
    i.setState({ content: "" });
  }

  const textarea: any = document.getElementById(i.state.id);
  const start: number = textarea.selectionStart;
  const end: number = textarea.selectionEnd;

  let escapeSpaces = 0;

  if (start !== end) {
    let selectedText = content?.substring(start, end);

    if (escapeWords) {
      escapeSpaces = (selectedText.match(/ /g) || []).length;
      selectedText = selectedText.replaceAll(" ", "\\ ");
    }

    i.setState({
      content: `${content?.substring(
        0,
        start,
      )}${beforeChars}${selectedText}${afterChars}${content?.substring(end)}`,
    });
  } else {
    i.setState({
      content: `${content}${beforeChars}${emptyChars}${afterChars}`,
    });
  }
  handleSubmitContentChange(i);

  textarea.focus();

  if (start !== end) {
    textarea.setSelectionRange(
      start + beforeChars.length,
      end + afterChars.length + escapeSpaces,
    );
  } else {
    textarea.setSelectionRange(
      start + beforeChars.length,
      end + emptyChars.length + afterChars.length + escapeSpaces,
    );
  }

  setTimeout(() => {
    autosize.update(textarea);
  }, 10);
}

function handleInsertBold(i: MarkdownTextArea) {
  handleSimpleSurround(i, "**");
}

function handleInsertItalic(i: MarkdownTextArea) {
  handleSimpleSurround(i, "*");
}

function handleInsertCode(i: MarkdownTextArea) {
  if (i.getSelectedText().split(/\r*\n/).length > 1) {
    handleSimpleSurroundBeforeAfter(i, "```\n", "\n```");
  } else {
    handleSimpleSurround(i, "`");
  }
}

function handleInsertStrikethrough(i: MarkdownTextArea) {
  handleSimpleSurround(i, "~~");
}

function handleInsertList(i: MarkdownTextArea) {
  handleSimpleBeginningofLine(i, `-${i.getSelectedText() ? " " : ""}`);
}

function handleInsertQuote(i: MarkdownTextArea) {
  handleSimpleBeginningofLine(i, ">");
}

function handleInsertHeader(i: MarkdownTextArea) {
  handleSimpleBeginningofLine(i, "#");
}

function handleInsertSubscript(i: MarkdownTextArea) {
  handleSimpleSurroundEscapeWords(i, "~");
}

function handleInsertSuperscript(i: MarkdownTextArea) {
  handleSimpleSurroundEscapeWords(i, "^");
}

function handleInsertSpoiler(i: MarkdownTextArea) {
  const beforeChars = `\n::: spoiler ${I18NextService.i18n.t("spoiler")}\n`;
  const afterChars = "\n:::\n";
  handleSimpleSurroundBeforeAfter(i, beforeChars, afterChars);
}

function handleQuoteInsert(i: MarkdownTextArea) {
  const textarea: any = document.getElementById(i.state.id);
  const selectedText = window.getSelection()?.toString();
  let { content } = i.state;
  if (selectedText) {
    const quotedText =
      selectedText
        .split("\n")
        .map(t => `> ${t}`)
        .join("\n") + "\n\n";

    if (!content) {
      content = "";
    } else {
      content = `${content}\n\n`;
    }

    i.setState({
      content: `${content}${quotedText}`,
    });
    handleSubmitContentChange(i);
    // Not sure why this needs a delay
    setTimeout(() => autosize.update(textarea), 10);
  }
}
