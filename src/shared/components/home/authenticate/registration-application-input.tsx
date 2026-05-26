import { Icon } from "@components/common/icon";
import { MarkdownTextArea } from "@components/common/markdown-textarea";
import { I18NextService } from "@services/I18NextService";
import { secondsDurationToAlertClass, secondsDurationToStr } from "@utils/date";
import { mdToHtml } from "@utils/markdown";
import { GetSiteResponse } from "lemmy-js-client";

type RegistrationApplicationInputProps = {
  getSiteRes: GetSiteResponse;
  onAnswerChange: (answer: string) => void;
};

export function RegistrationApplicationInput({
  getSiteRes,
  onAnswerChange,
}: RegistrationApplicationInputProps) {
  const siteView = getSiteRes.site_view;
  const lastApplicationDurationSeconds =
    getSiteRes.last_application_duration_seconds;
  return (
    siteView?.local_site.registration_mode === "require_application" && (
      <>
        <div className="mb-3 row">
          <div className="offset-sm-2 col-sm-10">
            <div className="mt-2 alert alert-warning" role="alert">
              <Icon icon="alert-triangle" classes="icon-inline me-2" />
              {I18NextService.i18n.t("fill_out_application")}
            </div>
            {siteView.local_site.application_question && (
              <div
                className="md-div"
                dangerouslySetInnerHTML={mdToHtml(
                  siteView.local_site.application_question,
                  // TODO: how?
                  () => this.forceUpdate(),
                )}
              />
            )}
          </div>
        </div>

        <div className="mb-3 row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="application_answer"
          >
            {I18NextService.i18n.t("answer")}
          </label>
          <div className="col-sm-10">
            <MarkdownTextArea
              initialContent=""
              onContentChange={answer => onAnswerChange(answer)}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              renderAsDiv
              myUserInfo={undefined}
              imageUploadDisabled
            />
          </div>
        </div>
        {lastApplicationDurationSeconds && (
          <div className="mb-3 row">
            <div className="offset-sm-2 col-sm-10">
              <div
                className={secondsDurationToAlertClass(
                  lastApplicationDurationSeconds,
                )}
                role="alert"
              >
                {I18NextService.i18n.t("estimated_approval_time", {
                  time: secondsDurationToStr(lastApplicationDurationSeconds),
                })}
              </div>
            </div>
          </div>
        )}
      </>
    )
  );
}
