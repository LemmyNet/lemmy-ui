import { Component } from 'inferno';

export class NoMatch extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="container">
        <h1>404</h1>
      </div>
    );
  }
}
