import { OAuthProvider } from "lemmy-js-client";
import { I18NextService } from "../../../services/I18NextService";
import { Icon } from "../../common/icon";

type OAuthProviderListItemProps = {
  provider: OAuthProvider;
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

export default function OAuthProviderListItem({
  provider,
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
            <button className="d-inline-block btn btn-outline-secondary me-2">
              Edit
            </button>
            <button className="d-inline-block btn btn-outline-danger">
              Delete
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
          </dl>
        </div>
      </details>
    </li>
  );
}
