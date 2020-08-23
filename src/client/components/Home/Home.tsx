import { Component } from "inferno";
interface IState {}
interface IProps {}
export default class Home extends Component<IProps, IState> {
   constructor(props) {
      super(props);
   }
   protected click() {
      /**
       * Try to debug next line
       */
      console.log("hi");
   }
   public render() {
      return (
         <div>
            Home page
            <button onClick={this.click}>Click me</button>
         </div>
      );
   }
}
