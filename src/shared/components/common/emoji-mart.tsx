import { Component, RefObject, createRef } from "@/inferno";
import { getEmojiMart } from "../../markdown";

interface EmojiMartProps {
  onEmojiClick?(val: any): any;
  pickerOptions: any;
}

export class EmojiMart extends Component<EmojiMartProps> {
  div: RefObject<HTMLDivElement>;

  constructor(props: any, context: any) {
    super(props, context);

    this.div = createRef();

    this.handleEmojiClick = this.handleEmojiClick.bind(this);
  }

  componentDidMount() {
    this.div.current?.appendChild(
      getEmojiMart(this.handleEmojiClick, this.props.pickerOptions) as any,
    );
  }

  render() {
    return <div id="emoji-picker" ref={this.div} />;
  }

  handleEmojiClick(e: any) {
    this.props.onEmojiClick?.(e);
  }
}
