import { Component } from "inferno";
import { Link } from "inferno-router";
import { IsoDataOptionalSite } from "shared/interfaces";
import { ErrorPageData, setIsoData } from "../../utils";

export class ErrorPage extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const errorPageData = this.getErrorPageData();

    return (
      <div className="container-lg text-center">
        <h1>{errorPageData ? "Error!" : "Page Not Found"}</h1>
        <p>
          {errorPageData
            ? 'There was an error on the server. Try refreshing your browser. If that doesn\'t work, come back at a later time. If the problem persists, <a href="https://github.com/LemmyNet/lemmy/issues">consider opening an issue.</a>'
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
                {this.isoData.site_res?.site_view.site.name ?? "this instance"}
                &apos;s admins for support, try the following Matrix addresses:
              </div>
              <ul>
                {errorPageData.adminMatrixIds.map(matrixId => (
                  <li key={matrixId}>{matrixId}</li>
                ))}
              </ul>
            </div>
          )}
        {errorPageData?.error && (
          <code className="text-start">{errorPageData.error}</code>
        )}
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
