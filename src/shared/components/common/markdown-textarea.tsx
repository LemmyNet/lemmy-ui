import { isBrowser, platform } from "@utils/browser";
import { numToSI, randomStr } from "@utils/helpers";
import autosize from "autosize";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, InfernoNode, FormEvent } from "inferno";
import { createElement } from "inferno-create-element";
import { Prompt } from "inferno-router";
import { Language, LanguageId, MyUserInfo } from "lemmy-js-client";
import {
  concurrentImageUpload,
  indentationLevelBreak,
  markdownFieldCharacterLimit,
  markdownHelpUrl,
  maxUploadImages,
  relTags,
} from "@utils/config";
import {
  customEmojisLookup,
  EmojiEvent,
  mdToHtml,
  setupTribute,
} from "@utils/markdown";
import { HttpService, I18NextService } from "@services/index";
import { tippyMixin } from "../mixins/tippy-mixin";
import { userNotLoggedInOrBanned, pictrsDeleteToast, toast } from "@utils/app";
import { EmojiPicker } from "./emoji-picker";
import { Icon, Spinner } from "./icon";
import { LanguageSelect } from "./language-select";
import ProgressBar from "./progress-bar";
import { validURL } from "@utils/helpers";
import { createRef, RefObject } from "inferno";

const listIndentReg = /^(?<indent>[ ]*[-*+][ ]*)(?<rest>[^-*+][^$]*)?$/;
const numberListIndentReg =
  /^(?<indent>(?<head>[ ]*)(?<number>[0-9]+)(?<token>[.)])(?<tail>[ ]+))(?<rest>[^-*+][^$]*)?$/;
const quoteIndentReg = /^(?<indent>[> ]*>[ ]*)(?<rest>[^>][^$]*)?$/;
const spaceIndentReg = /^(?<indent>[ ]+)(?<rest>[^ ][^$]*)?$/;

type MarkdownTextAreaType =
  | "post"
  | "comment"
  | "community"
  | "site_sidebar"
  | "site_legal"
  | "site_content_warning"
  | "site_application_question"
  | "tagline"
  | "local_user_bio"
  | "private_message"
  | "registration_application"
  | "registration_application_deny";

type TypeAndId = {
  type_: MarkdownTextAreaType;
  id?: number;
};

interface MarkdownTextAreaProps {
  /**
   * A type and ID, necessary for saving / retrieving drafts
   */
  typeAndId: TypeAndId;
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
  imageUploadDisabled: boolean;
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
  lastAutoIndent: string;
}

@tippyMixin
export class MarkdownTextArea extends Component<
  MarkdownTextAreaProps,
  MarkdownTextAreaState
> {
  textAreaRef: RefObject<HTMLTextAreaElement> = createRef();
  state: MarkdownTextAreaState = {
    // These two must be random for html purposes
    id: `markdown-textarea-${randomStr()}`,
    formId: `markdown-form-${randomStr()}`,
    content: undefined,
    languageId: this.props.initialLanguageId,
    previewMode: false,
    lastAutoIndent: "",
  };

  async componentDidMount() {
    if (isBrowser()) {
      const tribute = await setupTribute();
      const textarea = this.textAreaRef.current;
      if (textarea) {
        const content: string | undefined =
          this.props.initialContent ??
          localStorage.getItem(localStorageKey(this.props.typeAndId)) ??
          undefined;
        this.setState({ content });
        autosize(textarea);
        tribute.attach(textarea);
        textarea.addEventListener("tribute-replaced", () => {
          this.setState({ content: textarea.value });
          autosize.update(textarea);
        });

        handleInsertInitialQuote(this);

        if (this.props.focus) {
          textarea.focus();
        }
      }
    }
  }

  componentWillUnmount() {
    const textarea = this.textAreaRef.current;
    if (textarea) {
      autosize.destroy(textarea);
    }
  }

  componentDidUpdate(
    _: MarkdownTextAreaProps & { children?: InfernoNode },
    prevState: Readonly<MarkdownTextAreaState>,
  ) {
    if (this.state.content !== prevState.content && this.textAreaRef.current) {
      autosize.update(this.textAreaRef.current);
    }
  }

  render() {
    const languageId = this.state.languageId;
    const fileUploadRef = createRef<HTMLInputElement>();
    return createElement(
      this.props.renderAsDiv ? "div" : "form",
      {
        className: "markdown-textarea",
        id: this.state.formId,
        onSubmit: (e: KeyboardEvent) =>
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
                  {!this.props.imageUploadDisabled && (
                    <>
                      <label
                        htmlFor={`file-upload-${this.state.id}`}
                        className={classNames("mb-0", {
                          pointer: this.props.myUserInfo,
                        })}
                        data-tippy-content={I18NextService.i18n.t(
                          "upload_image",
                        )}
                      >
                        {this.state.imageUploadStatus ? (
                          <Spinner />
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-link rounded-0 text-muted mb-0"
                            aria-label={I18NextService.i18n.t("upload_image")}
                            onClick={() => {
                              fileUploadRef.current?.click();
                            }}
                          >
                            <Icon icon="image" classes="icon-inline" />
                          </button>
                        )}
                      </label>
                      <input
                        id={`file-upload-${this.state.id}`}
                        ref={fileUploadRef}
                        type="file"
                        accept="image/*,video/*"
                        name="file"
                        className="d-none"
                        multiple
                        disabled={userNotLoggedInOrBanned(
                          this.props.myUserInfo,
                        )}
                        onChange={e => handleImageUpload(this, e)}
                      />
                    </>
                  )}
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
                  ref={this.textAreaRef}
                  className={classNames(
                    "form-control border-0 rounded-top-0 rounded-bottom",
                    {
                      "d-none": this.state.previewMode,
                    },
                  )}
                  value={this.state.content}
                  onInput={e => handleContentChange(this, e)}
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
                        I18NextService.i18n.t("pictures_uploaded_progress", {
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
                multiple={false}
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
        onClick={e => {
          e.preventDefault();
          handleClick(this);
        }}
      >
        <Icon icon={iconType} classes="icon-inline" />
      </button>
    );
  }

  getSelectedText(): string {
    const textarea = this.textAreaRef.current;
    return (
      textarea?.value.substring(
        textarea.selectionStart,
        textarea.selectionEnd,
      ) ?? ""
    );
  }

  beforeSelectionEndsWith(chars: string): boolean {
    const { selectionStart = 0, value = "" } = this.textAreaRef.current ?? {};
    return value.endsWith(chars, selectionStart);
  }

  afterSelectionStartsWith(chars: string): boolean {
    const { selectionEnd = 0, value = "" } = this.textAreaRef.current ?? {};
    return value.startsWith(chars, selectionEnd);
  }

  startOfSelectedLines(): number {
    const { selectionStart = 0, value = "" } = this.textAreaRef.current ?? {};
    return value.lastIndexOf("\n", selectionStart - 1) + 1;
  }

  endOfSelectedLines(): number {
    const { selectionEnd = 0, value = "" } = this.textAreaRef.current ?? {};
    const end = value.indexOf("\n", selectionEnd);
    return end < 0 ? value.length : end;
  }

  get isDisabled() {
    return (
      this.props.loading ||
      this.props.disabled ||
      !!this.state.imageUploadStatus
    );
  }
}

function handleEmoji(i: MarkdownTextArea, e: EmojiEvent) {
  let value = e.native;
  if (!value) {
    const emoji = customEmojisLookup.get(e.id)?.custom_emoji;
    if (emoji) {
      value = `![${emoji.alt_text}](${emoji.image_url} "emoji ${emoji.shortcode}")`;
    }
  }
  handleInsertText(i, value);
}

async function handlePaste(i: MarkdownTextArea, event: ClipboardEvent) {
  if (!event.clipboardData || i.props.imageUploadDisabled) return;

  // check clipboard files
  const image = event.clipboardData.files[0];
  if (image) {
    await handleImageUpload(i, image);
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
  // if no selection, just insert url
  if (i.getSelectedText() !== "") {
    event.preventDefault();
    handleSimpleSurroundBeforeAfter(i, "[", `](${url})`);
  }
}

async function handleImageUpload(
  i: MarkdownTextArea,
  event: File | FormEvent<HTMLInputElement>,
) {
  const files: File[] = [];
  if (event instanceof Event && event.target) {
    event.preventDefault();
    const target = event.target;
    const f = target.files;
    if (f) {
      files.push(...Array.from(f));
    }
  } else if (event instanceof File) {
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

    await handleUploadImages(i, files).then(() => {
      i.setState({ imageUploadStatus: undefined });
    });
  }
}

async function handleUploadImages(i: MarkdownTextArea, files: File[]) {
  let errorOccurred = false;
  const filesCopy = [...files];
  while (filesCopy.length > 0 && !errorOccurred) {
    try {
      const uploadSingleImageResults = await Promise.all(
        filesCopy.splice(0, concurrentImageUpload).map(async file => {
          return await handleUploadSingleImage(file);
        }),
      );

      uploadSingleImageResults.forEach(result => {
        if (typeof result === "undefined") {
          return;
        }

        handleInsertImage(i, result.image_url);
        pictrsDeleteToast(result.filename);
      });

      i.setState(({ imageUploadStatus }) => ({
        imageUploadStatus: {
          ...(imageUploadStatus as Required<ImageUploadStatus>),
          uploaded:
            (imageUploadStatus?.uploaded ?? 0) +
            uploadSingleImageResults.length,
        },
      }));

      // Save after each batch of images uploaded
      handleSubmitContentChange(i);
    } catch {
      i.setState({ imageUploadStatus: undefined });
      errorOccurred = true;
    }
  }
}

async function handleUploadSingleImage(image: File) {
  const res = await HttpService.client.uploadImage({ image });
  if (res.state === "success") {
    return res.data;
  } else if (res.state === "failed") {
    console.error(res.err.name);
    toast(res.err.name, "danger");

    throw res.err;
  }
  return undefined;
}

function handleInsertImage(i: MarkdownTextArea, url: string) {
  handleMoveForwardToLineBreak(i);
  const imageMarkdown = `\n![](${url})`;
  const move = -imageMarkdown.length + 3;
  handleInsertText(i, imageMarkdown, move, move);
  // Wait for textarea to be enabled
  setTimeout(() => {
    i.textAreaRef.current?.focus();
  });
}

/**
 * Inserts text at cursor position, replaces selected text. The cursor moves to
 * the end of the inserted text. `moveStart` and `moveEnd` move the selection
 * relative to the new cursor position.
 */
function handleInsertText(
  i: MarkdownTextArea,
  text: string,
  moveStart = 0,
  moveEnd = 0,
) {
  const textarea = i.textAreaRef.current;
  if (textarea) {
    textarea.focus();
    const head = textarea.value.substring(0, textarea.selectionStart);
    const tail = textarea.value.substring(textarea.selectionEnd);
    i.setState({ content: head + text + tail });
    const pos = head.length + text.length;
    // Note: When end is lower than start, start becomes equal to end.
    textarea.setSelectionRange(
      pos + moveStart,
      pos + moveEnd,
      textarea.selectionDirection,
    );
  }
}

function handleSubmitContentChange(i: MarkdownTextArea) {
  // Coerces the undefineds to empty strings, for replacing in the DB
  const content = i.state.content ?? "";
  localStorage.setItem(localStorageKey(i.props.typeAndId), content);
  i.props.onContentChange?.(content);
}

function handleContentChange(
  i: MarkdownTextArea,
  event: FormEvent<HTMLTextAreaElement>,
) {
  i.setState({ content: event.target.value });
  handleSubmitContentChange(i);
  if (
    event instanceof InputEvent &&
    (event.inputType === "insertLineBreak" ||
      /* chromium does this instead of insertLineBreak in some cases */
      (event.inputType === "insertText" && event.data === null))
  ) {
    handleAutoIndent(i);
  }
}

// Keybind handler
// Keybinds inspired by github comment area
function handleKeyBinds(i: MarkdownTextArea, event: KeyboardEvent) {
  if (platform.isMac() ? event.metaKey : event.ctrlKey) {
    switch (event.key) {
      case "k": {
        handleInsertLink(i);
        event.preventDefault();
        break;
      }
      case "Enter": {
        if (!i.isDisabled) {
          handleSubmit(i, event);
        }
        event.preventDefault();
        break;
      }
      case "b": {
        handleInsertBold(i);
        event.preventDefault();
        break;
      }
      case "i": {
        handleInsertItalic(i);
        event.preventDefault();
        break;
      }
      case "e": {
        handleInsertCode(i);
        event.preventDefault();
        break;
      }
      case "8": {
        handleInsertList(i);
        event.preventDefault();
        break;
      }
      case "s": {
        handleInsertSpoiler(i);
        event.preventDefault();
        break;
      }
      case "p": {
        if (i.state.content) handlePreviewToggle(i);
        event.preventDefault();
        break;
      }
      case ".": {
        handleInsertQuote(i);
        event.preventDefault();
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

function handleSubmit(i: MarkdownTextArea, event: KeyboardEvent) {
  event.preventDefault();
  if (i.state.content) {
    i.props.onSubmit?.(i.state.content, i.state.languageId);
  }
}

function handleReplyCancel(i: MarkdownTextArea) {
  localStorage.removeItem(localStorageKey(i.props.typeAndId));
  i.props.onReplyCancel?.();
}

function handleInsertLink(i: MarkdownTextArea) {
  if (i.getSelectedText()) {
    handleSimpleSurroundBeforeAfter(i, "[", "]()");
  } else {
    handleSimpleSurroundBeforeAfter(i, "[](", ")", "");
  }
}

function handleSimpleSurround(
  i: MarkdownTextArea,
  chars: string,
  emptyChars = "___",
) {
  handleSimpleSurroundBeforeAfter(i, chars, chars, emptyChars);
}

function handleSimpleSurroundEscapeWords(
  i: MarkdownTextArea,
  chars: string,
  emptyChars = "___",
) {
  handleSimpleSurroundBeforeAfter(i, chars, chars, emptyChars, true);
}

function handleSimpleSurroundBeforeAfter(
  i: MarkdownTextArea,
  beforeChars: string,
  afterChars: string,
  emptyChars = "___",
  escapeWords = false,
) {
  let selected = i.getSelectedText();
  if (
    i.beforeSelectionEndsWith(beforeChars) &&
    i.afterSelectionStartsWith(afterChars)
  ) {
    const textarea = i.textAreaRef.current;
    if (textarea) {
      textarea.setSelectionRange(
        textarea.selectionStart - beforeChars.length,
        textarea.selectionEnd + afterChars.length,
        textarea.selectionDirection,
      );
      if (selected === emptyChars) {
        handleInsertText(i, "");
      } else {
        if (escapeWords && selected) {
          selected = selected.replaceAll("\\ ", " ");
        }
        handleInsertText(i, selected, -selected.length);
      }
    }
  } else {
    if (escapeWords && selected) {
      selected = selected.replaceAll(" ", "\\ ");
    }
    const newContent = beforeChars + (selected || emptyChars) + afterChars;
    handleInsertText(
      i,
      newContent,
      -(selected || emptyChars).length - afterChars.length,
      -afterChars.length,
    );
  }
}

function handleSimpleIndentLines(
  i: MarkdownTextArea,
  prefixForLine: (line: string) => { indent: string; skip: number },
) {
  const textarea = i.textAreaRef.current;
  if (textarea) {
    const { selectionStart, selectionEnd, selectionDirection } = textarea;

    // Expand selection to full lines.
    const start = i.startOfSelectedLines();
    const end = i.endOfSelectedLines();
    textarea.setSelectionRange(start, end, selectionDirection);

    // Add/remove prefixes
    const lines = i.getSelectedText().split("\n");
    const newLines = lines.map(line => {
      const { indent, skip } = prefixForLine(line);
      return indent + line.substring(skip);
    });

    // Replace selected text and restore original selection start/end.
    const newContent = newLines.join("\n");
    const firstLineOffset = newLines[0].length - lines[0].length;
    const startOffset = Math.max(0, firstLineOffset + selectionStart - start);
    const endOffset = Math.min(0, selectionEnd - end);
    handleInsertText(
      i,
      newContent,
      -newContent.length + startOffset,
      endOffset,
    );
  }
}

function handleInsertInitialQuote(i: MarkdownTextArea) {
  const selectedText = window.getSelection()?.toString();
  if (selectedText) {
    handleInsertText(i, selectedText, -selectedText.length);
    // Not using handleInsertQuote here to avoid undoing indentation levels.
    handleSimpleIndentLines(i, () => ({ indent: "> ", skip: 0 }));
  }
}

function handleMoveForwardToLineBreak(i: MarkdownTextArea) {
  const textarea = i.textAreaRef.current;
  if (textarea) {
    const end = i.endOfSelectedLines();
    textarea.setSelectionRange(end, end, textarea.selectionDirection);
  }
}

function handleInsertBold(i: MarkdownTextArea) {
  handleSimpleSurround(i, "**");
}

function handleInsertItalic(i: MarkdownTextArea) {
  handleSimpleSurround(i, "_", "---");
}

function handleInsertCode(i: MarkdownTextArea) {
  if (i.getSelectedText().split(/\r*\n/).length > 1) {
    handleSimpleSurround(i, "\n```\n");
  } else {
    handleSimpleSurround(i, "`");
  }
}

function handleInsertStrikethrough(i: MarkdownTextArea) {
  handleSimpleSurround(i, "~~");
}

function handleInsertList(i: MarkdownTextArea) {
  const ignoreEmptyLines =
    i.getSelectedText().includes("\n") && i.getSelectedText().trim();
  handleSimpleIndentLines(i, (line: string) => {
    const match = line.match(/^[ ]*[-*+][ ]?/);
    if (match && line.startsWith(" ".repeat(indentationLevelBreak * 2 - 1))) {
      return { indent: "", skip: match[0].length };
    }
    if (ignoreEmptyLines && !line.trim()) return { indent: "", skip: 0 };
    // Extend indentation
    if (match) return { indent: "  ", skip: 0 };
    // Start new indentation
    return { indent: " - ", skip: 0 };
  });
}

function handleInsertHeader(i: MarkdownTextArea) {
  const ignoreEmptyLines =
    i.getSelectedText().includes("\n") && i.getSelectedText().trim();
  handleSimpleIndentLines(i, (line: string) => {
    const match = line.match(/^[#]*#[ ]?/);
    if (match && match[0].length > indentationLevelBreak) {
      return { indent: "", skip: match[0].length };
    }
    if (ignoreEmptyLines && !line.trim()) return { indent: "", skip: 0 };
    // Extend indentation
    if (match) return { indent: "#", skip: 0 };
    // Start indentation
    return { indent: "# ", skip: 0 };
  });
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

function handleInsertQuote(i: MarkdownTextArea) {
  handleSimpleIndentLines(i, (line: string) => {
    const match = line.match(/^[> ]*[>][ ]?/);
    if (match && match[0].split(">").length > indentationLevelBreak) {
      return { indent: "", skip: match[0].length };
    }
    // Start or extend indentation
    return { indent: "> ", skip: 0 };
  });
}

function handleAutoIndent(i: MarkdownTextArea) {
  const textarea = i.textAreaRef.current;
  if (!textarea) {
    return;
  }

  const { value, selectionStart } = textarea;
  // Expects to be called immediately after inserting a linebreak.
  if (value[selectionStart - 1] !== "\n") {
    return;
  }
  const lastLineBreak = value.lastIndexOf("\n", selectionStart - 2);
  const lastLine = value.substring(lastLineBreak + 1, selectionStart - 1);

  const match =
    lastLine.match(listIndentReg) ??
    lastLine.match(numberListIndentReg) ??
    lastLine.match(quoteIndentReg) ??
    lastLine.match(spaceIndentReg);

  if (!match) {
    i.setState({ lastAutoIndent: "" });
  } else {
    const {
      rest = "",
      head = "",
      number = "",
      token = "",
      tail = "",
    } = match.groups ?? {};
    let { indent = "" } = match.groups ?? {};
    if (rest) {
      if (number && token) {
        indent = `${head}${Number(number) + 1}${token}${tail}`;
      }
      handleInsertText(i, indent);
      i.setState({ lastAutoIndent: indent });
    } else {
      // Only an indentation. If it matches the last auto indent, remove it.
      if (i.state.lastAutoIndent === indent) {
        textarea.selectionStart -= lastLine.length + 1;
        handleInsertText(i, "\n");
        i.setState({ lastAutoIndent: "" });
      }
    }
  }
}

function localStorageKey(typeAndId: TypeAndId): string {
  return `lemmy-markdown-${typeAndId.type_}-${typeAndId.id ?? "unknown"}`;
}

export function removeLocalStorageMarkdown() {
  localStorage.clear();
}
