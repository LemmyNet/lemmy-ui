import { Component } from "inferno";

interface LoadingEllipsesState {
  ellipses: string;
}

// TODO get rid
export class LoadingEllipses extends Component<any, LoadingEllipsesState> {
  state: LoadingEllipsesState = {
    ellipses: "...",
  };
  #interval?: NodeJS.Timeout;

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
