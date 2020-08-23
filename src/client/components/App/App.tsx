import { Component, render } from 'inferno';
import { Link, Route, StaticRouter, Switch } from 'inferno-router';
import About from '../About/About';
import Home from '../Home/Home';
interface IState {}
interface IProps {
  name: string;
}
export default class App extends Component<IProps, IState> {
  constructor(props) {
    super(props);
  }
  public render() {
    return (
      <div>
        <div>
          <h3>{this.props.name}</h3>
          <div>
            <Link to="/Home">
              <p>Home</p>
            </Link>
          </div>
          <div>
            <Link to="/About" className="link">
              <p>About</p>
            </Link>
          </div>
        </div>
        <div>
          <Switch>
            <Route exact path="/Home" component={Home} />
            <Route exact path="/About" component={About} />
          </Switch>
        </div>
      </div>
    );
  }
}
