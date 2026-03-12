import { Component, RefObject, createRef } from "inferno";
import { EmojiEvent, getEmojiMart } from "@utils/markdown";

interface EmojiMartProps {
  onEmojiClick?(val: EmojiEvent);
}

export class EmojiMart extends Component<EmojiMartProps> {
  div: RefObject<HTMLDivElement>;

  constructor(props: EmojiMartProps, context: object) {
    super(props, context);

    this.div = createRef();
  }

  componentDidMount() {
    this.div.current?.appendChild(
      getEmojiMart(e => handleEmojiClick(this, e)) as unknown as HTMLElement,
    );
  }

  render() {
    return <div id="emoji-picker" ref={this.div} />;
  }
}

function handleEmojiClick(i: EmojiMart, e: EmojiEvent) {
  i.props.onEmojiClick?.(e);
}
