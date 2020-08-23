import { Component } from 'inferno';
import './About.css';
interface IState {
  clickCount: number;
}
interface IProps {}
export default class About extends Component<IProps, IState> {
  constructor(props) {
    super(props);
    this.state = {
      clickCount: 0,
    };
    this.increment = this.increment.bind(this);
  }
  protected increment() {
    this.setState({
      clickCount: this.state.clickCount + 1,
    });
  }
  public render() {
    return (
      <div>
        Simple Inferno SSR template
        <p className="text">Hello, world!</p>
        <button onClick={this.increment} className="button">
          Increment
        </button>
        <p className="count">{this.state.clickCount}</p>
      </div>
    );
  }
}
