import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { i18n } from "../../i18next";
import { IsoDataOptionalSite } from "../../interfaces";
import { setIsoData } from "../../utils";

export class ErrorPage extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { errorPageData } = this.isoData;

    return (
      <div className="app-error__root container-lg text-center">
        <h1>
          {errorPageData
            ? i18n.t("error_page_title")
            : i18n.t("not_found_page_title")}
        </h1>
        {errorPageData ? (
          <T i18nKey="error_page_paragraph" className="p-4" parent="p">
            #<a href="https://lemmy.ml/c/lemmy_support">#</a>#
            <a href="https://matrix.to/#/#lemmy-space:matrix.org">#</a>#
          </T>
        ) : (
          <p>{i18n.t("not_found_page_message")}</p>
        )}
        {!errorPageData && (
          <Link to="/" replace>
            {i18n.t("not_found_return_home_button")}
          </Link>
        )}
        {errorPageData?.adminMatrixIds &&
          errorPageData.adminMatrixIds.length > 0 && (
            <>
              <div>
                {i18n.t("error_page_admin_matrix", {
                  instance:
                    this.isoData.site_res?.site_view.site.name ??
                    "this instance",
                })}
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
          <T
            i18nKey="error_code_message"
            parent="p"
            interpolation={{ error: errorPageData.error }}
          >
            #<strong className="text-danger">#</strong>#
          </T>
        )}
      </div>
    );
  }
}
