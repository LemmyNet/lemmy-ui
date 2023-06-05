import { Component } from "inferno";
import { getEmojiMart } from "../../utils";

interface EmojiMartProps {
  onEmojiClick?(val: any): any;
  pickerOptions: any;
}

export class EmojiMart extends Component<EmojiMartProps> {
  constructor(props: any, context: any) {
    super(props, context);
    this.handleEmojiClick = this.handleEmojiClick.bind(this);
  }
  componentDidMount() {
    const div: any = document.getElementById("emoji-picker");
    if (div) {
      div.appendChild(
        getEmojiMart(this.handleEmojiClick, this.props.pickerOptions)
      );
    }
  }

  render() {
    return <div id="emoji-picker"></div>;
  }

  handleEmojiClick(e: any) {
    this.props.onEmojiClick?.(e);
  }
}
