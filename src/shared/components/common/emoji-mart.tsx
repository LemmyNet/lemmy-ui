import { Component, RefObject, createRef } from "inferno";
import { getEmojiMart } from "@utils/markdown";

interface EmojiMartProps {
  onEmojiClick?(val: unknown): unknown;
  pickerOptions: unknown;
}

export class EmojiMart extends Component<EmojiMartProps> {
  div: RefObject<HTMLDivElement>;

  constructor(props: EmojiMartProps, context: object) {
    super(props, context);

    this.div = createRef();
  }

  componentDidMount() {
    this.div.current?.appendChild(
      getEmojiMart(
        e => handleEmojiClick(this, e),
        this.props.pickerOptions,
      ) as unknown,
    );
  }

  render() {
    return <div id="emoji-picker" ref={this.div} />;
  }
}

function handleEmojiClick(i: EmojiMart, e: unknown) {
  i.props.onEmojiClick?.(e);
}
