import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { ErrorPage } from "../app/error-page";

class ErrorGuard extends Component<any, any> {
  private isoData = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const errorPageData = this.isoData.errorPageData;
    const siteRes = this.isoData.site_res;

    if (errorPageData || !siteRes) {
      return <ErrorPage />;
    } else {
      return this.props.children;
    }
  }
}

export default ErrorGuard;
