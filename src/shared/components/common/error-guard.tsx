import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { ErrorPage } from "../app/error-page";

class ErrorGuard extends Component<any, any> {
  private isoData = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillUnmount(): void {
    const { errorPageData, siteRes } = this.isoData;
    if (errorPageData || !siteRes) {
      // Without reload the error data is still present at the new route
      window.location.reload();
    }
  }

  render() {
    const errorPageData = this.isoData.errorPageData;
    const siteRes = this.isoData.siteRes;

    if (errorPageData || !siteRes) {
      return <ErrorPage />;
    } else {
      return this.props.children;
    }
  }
}

export default ErrorGuard;
