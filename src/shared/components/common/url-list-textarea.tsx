import { linkEvent, Component } from "inferno";
import { I18NextService } from "../../services/I18NextService";

interface UrlListTextareaProps {
  urls: string[];
  onUpdate(urls: string[]): void;
}

interface UrlListTextareaState {
  text: string;
}

function handleTextChange(i: UrlListTextarea, event: any) {
  i.setState({ text: event.target.value });
}

const URL_SCHEME = "https://";

function processUrl(str: string) {
  return new URL(str).toString().replace(URL_SCHEME, "");
}

function handleTextBlur(i: UrlListTextarea, event: any) {
  const inputValue: string = event.currentTarget?.value ?? "";

  const intermediateText = inputValue.replace(/\s+/g, "\n");
  const newUrls: string[] = [];

  for (const str of intermediateText.split("\n")) {
    let url: string;

    try {
      url = processUrl(str);
    } catch {
      try {
        url = processUrl(URL_SCHEME + str);
      } catch {
        continue;
      }
    }

    if (newUrls.every(u => u !== url)) {
      newUrls.push(url);
    }
  }

  i.setState({ text: newUrls.join("\n") });
  i.props.onUpdate(newUrls);
}

export default class UrlListTextarea extends Component<
  UrlListTextareaProps,
  UrlListTextareaState
> {
  state: UrlListTextareaState = {
    text: this.props.urls.join("\n"),
  };

  render() {
    return (
      <div className="mb-3 row">
        <label
          className="col-12 col-form-label"
          htmlFor="create-site-block-urls"
        >
          {I18NextService.i18n.t("block_urls")}
        </label>

        <div className="col-12">
          <textarea
            id="create-site-block-urls"
            className="form-control"
            placeholder={I18NextService.i18n.t("block_urls_placeholder")}
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
