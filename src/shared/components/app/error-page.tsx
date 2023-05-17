import { Component } from "inferno";
import { Link } from "inferno-router";
import { IsoDataOptionalSite } from "shared/interfaces";
import { setIsoData } from "../../utils";

export class ErrorPage extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { errorPageData } = this.isoData;

    return (
      <div className="container-lg text-center">
        <h1>{errorPageData ? "Error!" : "Page Not Found"}</h1>
        <p className="p-4">
          {errorPageData ? (
            <>
              <span>
                There was an error on the server. Try refreshing your browser.
                If that doesn&apos;t work, come back at a later time. If the
                problem persists,
              </span>{" "}
              <a href="https://github.com/LemmyNet/lemmy/issues">
                consider opening an issue.
              </a>
            </>
          ) : (
            "The page you are looking for does not exist."
          )}
        </p>
        {!errorPageData && (
          <Link to="/" replace>
            Click here to return to your home page.
          </Link>
        )}
        {errorPageData?.adminMatrixIds &&
          errorPageData.adminMatrixIds.length > 0 && (
            <>
              <div>
                If you would like to reach out to one of{" "}
                {this.isoData.site_res?.site_view.site.name ?? "this instance"}
                &apos;s admins for support, try the following Matrix addresses:
              </div>
              <ul className="mx-auto mt-2" style={{ width: "fit-content" }}>
                {errorPageData.adminMatrixIds.map(matrixId => (
                  <li key={matrixId} className="text-info">
                    {matrixId}
                  </li>
                ))}
              </ul>
            </>
          )}
        {errorPageData?.error && (
          <code
            style={{ "text-align": "start" }}
            className="d-block bg-dark text-light p-2 mt-4"
          >
            {errorPageData.error}
          </code>
        )}
      </div>
    );
  }
}
