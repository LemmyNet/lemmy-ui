import { Component } from "inferno";
import { setIsoData } from "../../utils";
import { ErrorPage } from "../app/error-page";

class ErrorGuard extends Component<any, any> {
  private isoData = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const errorPageData = this.isoData.errorPageData;
    const siteRes = this.isoData.site_res;
    console.log("In error guard");
    console.log(errorPageData);

    if (errorPageData || !siteRes) {
      console.log("triggered error page");
      return <ErrorPage />;
    } else {
      return this.props.children;
    }
  }
}

export default ErrorGuard;
