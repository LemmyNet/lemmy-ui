import { Component } from "inferno";

interface LoadingEllipsesState {
  ellipses: string;
}

export class LoadingEllipses extends Component<any, LoadingEllipsesState> {
  state: LoadingEllipsesState = {
    ellipses: "...",
  };
  #interval?: NodeJS.Timer;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return this.state.ellipses;
  }

  componentDidMount() {
    this.#interval = setInterval(this.#updateEllipses, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.#interval);
  }

  #updateEllipses = () => {
    this.setState(({ ellipses }) => ({
      ellipses: ellipses.length === 3 ? "" : ellipses + ".",
    }));
  };
}
