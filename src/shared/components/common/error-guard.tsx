import { Component } from "inferno";
import { ErrorPageData, setIsoData } from "../../utils";
import { ErrorPage } from "../app/error-page";

class ErrorGuard extends Component<any, any> {
  private isoData = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const errorPageData = this.isoData.routeData[0] as
      | ErrorPageData
      | undefined;
    const siteRes = this.isoData.site_res;

    if (errorPageData?.type === "error" || !siteRes) {
      return <ErrorPage />;
    } else {
      return this.props.children;
    }
  }
}

export default ErrorGuard;
