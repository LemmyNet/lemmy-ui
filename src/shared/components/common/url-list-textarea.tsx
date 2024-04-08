import { linkEvent, Component } from "inferno";

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

function handleTextBlur(i: UrlListTextarea, event: any) {
  const inputValue: string = event.currentTarget?.value ?? "";

  const intermediateText = inputValue.replace(/\s+/g, "\n");
  const newUrls: string[] = [];

  for (const str of intermediateText.split("\n")) {
    let url: string;

    try {
      url = new URL(str).toString();
    } catch {
      try {
        url = new URL("https://" + str).toString();
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
    text: "",
  };

  render() {
    return (
      <div className="mb-3 row">
        <label
          className="col-12 col-form-label"
          htmlFor="create-site-block-urls"
        >
          Block URLs
        </label>

        <div className="col-12">
          <textarea
            id="create-site-block-urls"
            className="form-control"
            placeholder="Put your blocked URLs here, one URL per line."
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
