import { I18NextService } from "@services/I18NextService";
import { mdToHtml } from "@utils/markdown";
import { SiteView } from "lemmy-js-client";

type RegistrationLegalInfoProps = {
  siteView: SiteView;
};

export function RegistrationLegalInfo({
  siteView,
}: RegistrationLegalInfoProps) {
  return (
    siteView.local_site.legal_information && (
      <div className="mb-3 card card-body ">
        <div
          className="mb-2 legal-info-box overflow-y-scroll md-div"
          dangerouslySetInnerHTML={mdToHtml(
            siteView.local_site.legal_information,
            // TODO
            () => this.forceUpdate(),
          )}
        />
        <div className="form-check">
          <input
            className="form-check-input"
            id="register-accept-legal"
            type="checkbox"
            required
          />
          <label className="form-check-label" htmlFor="register-accept-legal">
            {I18NextService.i18n.t("read_terms_and_conditions")}
          </label>
        </div>
      </div>
    )
  );
}
