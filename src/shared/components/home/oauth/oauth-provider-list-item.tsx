import { OAuthProvider } from "lemmy-js-client";
import { I18NextService } from "../../../services/I18NextService";
import { Icon } from "../../common/icon";
import { MouseEventHandler } from "inferno";

type OAuthProviderListItemProps = {
  provider: OAuthProvider;
  onEdit: MouseEventHandler<HTMLButtonElement>;
};

type TextInfoFieldProps = {
  i18nKey: string;
  data: string;
};

function TextInfoField({ i18nKey, data }: TextInfoFieldProps) {
  return (
    <div className="col">
      <dt>{I18NextService.i18n.t(i18nKey)}</dt>
      <dd>{data}</dd>
    </div>
  );
}

function boolToYesNo(value?: boolean) {
  return I18NextService.i18n.t(value ? "yes" : "no");
}

export default function OAuthProviderListItem({
  provider,
  onEdit,
}: OAuthProviderListItemProps) {
  return (
    <li className="oauth-item list-group-item">
      <details>
        <summary className="d-flex justify-content-between align-items-center">
          <div className="fw-semibold">
            <Icon icon="caret-right" classes="oauth-item-caret me-1" />
            {provider.display_name}
          </div>
          <div>
            <button
              className="d-inline-block btn btn-outline-secondary me-2"
              onClick={onEdit}
            >
              <Icon icon="edit" classes="me-1" />
              {I18NextService.i18n.t("edit")}
            </button>
            <button className="d-inline-block btn btn-outline-danger">
              <Icon icon="trash" classes="me-1" />
              {I18NextService.i18n.t("delete")}
            </button>
          </div>
        </summary>
        <div className="container">
          <dl className="row row-cols-1 row-cols-sm-2 row-cols-md-3">
            <TextInfoField i18nKey="oauth_issuer" data={provider.issuer} />
            <TextInfoField
              i18nKey="oauth_authorization_endpoint"
              data={provider.authorization_endpoint}
            />
            <TextInfoField
              i18nKey="oauth_token_endpoint"
              data={provider.token_endpoint}
            />
            <TextInfoField
              i18nKey="oauth_userinfo_endpoint"
              data={provider.userinfo_endpoint}
            />
            <TextInfoField i18nKey="oauth_id_claim" data={provider.id_claim} />
            <TextInfoField
              i18nKey="oauth_client_id"
              data={provider.client_id}
            />
            <TextInfoField i18nKey="oauth_scopes" data={provider.scopes} />
            <TextInfoField
              i18nKey="oauth_auto_verify_email"
              data={boolToYesNo(provider.auto_verify_email)}
            />
            <TextInfoField
              i18nKey="oauth_account_linking_enabled"
              data={boolToYesNo(provider.account_linking_enabled)}
            />
            <TextInfoField
              i18nKey="oauth_enabled"
              data={boolToYesNo(provider.enabled)}
            />
          </dl>
        </div>
      </details>
    </li>
  );
}
