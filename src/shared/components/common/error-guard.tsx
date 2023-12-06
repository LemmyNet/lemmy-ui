import { Component } from "inferno";
import { ErrorPage } from "../app/error-page";
import { IsoDataOptionalSite } from "../../interfaces";

class ErrorGuard extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const reduxState: IsoDataOptionalSite = this.context.store.getState().value;
    const errorPageData = reduxState.errorPageData;
    const siteRes = reduxState.site_res;
    console.log(`error guard data: ${reduxState.path}`);

    if (errorPageData || !siteRes) {
      return <ErrorPage />;
    } else {
      return this.props.children;
    }
  }
}

export default ErrorGuard;
