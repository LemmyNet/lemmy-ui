import { linkEvent, Component } from "inferno";
import { I18NextService } from "../../services/I18NextService";

interface Props {
  keywords: string[];
  onUpdate(keywords: string[]): void;
}

interface State {
  text: string;
}

function handleTextChange(i: BlockingKeywordsTextArea, event: any) {
  i.setState({ text: event.target.value });
}

function handleTextBlur(i: BlockingKeywordsTextArea, _event: any) {
  const keywords = fromText(i.state.text);
  i.props.onUpdate(keywords);
}

function toText(keywords: string[]): string {
  return keywords.join("\n");
}

function fromText(text: string): string[] {
  // Split lines
  const intermediateText = text.replace(/\s+/g, "\n");

  // Split by newlines, and filter out empty strings
  // Note: an empty array is a Some(None) / erase
  const keywords = intermediateText.split("\n").filter(k => k.trim());
  return keywords;
}

export default class BlockingKeywordsTextArea extends Component<Props, State> {
  state: State = {
    text: toText(this.props.keywords),
  };

  render() {
    return (
      <div className="mb-3 row">
        <label className="col-sm-3 col-form-label" htmlFor="blocking-keywords">
          {I18NextService.i18n.t("keyword_blocks")}
        </label>
        <div className="col-sm-9">
          <textarea
            id="blocking-keywords"
            className="form-control"
            placeholder={I18NextService.i18n.t("keyword_blocks_placeholder")}
            value={this.state.text}
            onInput={linkEvent(this, handleTextChange)}
            onBlur={linkEvent(this, handleTextBlur)}
            rows={4}
          />
        </div>
      </div>
    );
  }
}
