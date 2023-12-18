import { Component } from "@/inferno";

export class CodeTheme extends Component {
  render() {
    return (
      <>
        <link
          rel="stylesheet"
          type="text/css"
          href={`/css/code-themes/atom-one-light.css`}
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href={`/css/code-themes/atom-one-dark.css`}
          media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
        />
      </>
    );
  }
}
