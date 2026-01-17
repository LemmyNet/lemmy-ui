import { Component, RefObject, createRef } from "inferno";
import { getEmojiMart } from "@utils/markdown";

interface EmojiMartProps {
  onEmojiClick?(val: any): any;
  pickerOptions: any;
}

export class EmojiMart extends Component<EmojiMartProps> {
  div: RefObject<HTMLDivElement>;

  constructor(props: any, context: any) {
    super(props, context);

    this.div = createRef();
  }

  componentDidMount() {
    this.div.current?.appendChild(
      getEmojiMart(
        e => handleEmojiClick(this, e),
        this.props.pickerOptions,
      ) as any,
    );
  }

  render() {
    return <div id="emoji-picker" ref={this.div} />;
  }
}

function handleEmojiClick(i: EmojiMart, e: any) {
  i.props.onEmojiClick?.(e);
}
