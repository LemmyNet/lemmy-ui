import { Component } from "inferno";
import { Link } from "inferno-router";
import { ErrorPageData, setIsoData } from "../../utils";

export class ErrorPage extends Component<any, any> {
  private isoData = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const errorPageData = this.getErrorPageData();

    return (
      <div className="container-lg">
        <h1>{errorPageData ? "Error!" : "Page Not Found"}</h1>
        <p>
          {errorPageData
            ? "There was an error on the server. Try refreshing your browser of coming back at a later time"
            : "The page you are looking for does not exist"}
        </p>
        {!errorPageData && (
          <Link to="/">Click here to return to your home page</Link>
        )}
        {errorPageData?.adminMatrixIds &&
          errorPageData.adminMatrixIds.length > 0 && (
            <div>
              <div>
                If you would like to reach out to one of{" "}
                {this.isoData.site_res.site_view.site.name}&apos;s admins for
                support, try the following Matrix addresses:
              </div>
              <ul>
                {errorPageData.adminMatrixIds.map(matrixId => (
                  <li key={matrixId}>{matrixId}</li>
                ))}
              </ul>
            </div>
          )}
        {errorPageData?.error && <code>{errorPageData.error.message}</code>}
      </div>
    );
  }

  private getErrorPageData() {
    const errorPageData = this.isoData.routeData[0] as
      | ErrorPageData
      | undefined;
    if (errorPageData?.type === "error") {
      return errorPageData;
    }

    return undefined;
  }
}
