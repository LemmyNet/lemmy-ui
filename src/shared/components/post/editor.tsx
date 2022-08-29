import EditorJS from "@editorjs/editorjs";
import { Component } from "inferno";
import { isBrowser } from "../../utils";

export default class Editor extends Component {
  componentDidMount(): void {
    console.log("componentDidMount");

    if (isBrowser()) {
      const editor = new EditorJS({
        /**
         * Id of Element that should contain Editor instance
         */
        holder: "editorjs",
      });
    }
  }

  render() {
    return <div id="editorjs" style={{ border: "1px solid red" }} />;
  }
}
