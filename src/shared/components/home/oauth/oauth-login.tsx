import { I18NextService } from "@services/I18NextService";
import { Component } from "inferno";
import { PublicOAuthProvider } from "lemmy-js-client";
import { v4 as uuidv4 } from "uuid";

type OAuthLoginProps = { oauth_providers: PublicOAuthProvider[] };

export class OAuthLogin extends Component<OAuthLoginProps, object> {
  render() {
    return (
      (this.props.oauth_providers?.length || 0) > 0 && (
        <>
          <div className="row mt-3 mb-2"></div>
          <div className="row">
            <div className="col col-12 col-lg-6 offset-lg-3">
              <h2 className="h4 mb-3">
                {I18NextService.i18n.t("oauth_use_external_provider")}
              </h2>
              {(this.props.oauth_providers ?? []).map(
                (provider: PublicOAuthProvider) => (
                  <button
                    className="btn btn-primary my-2 d-block"
                    onClick={() => handleLoginWithProvider(provider)}
                  >
                    {provider.display_name}
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )
    );
  }
}

function handleLoginWithProvider(
  oauth_provider: PublicOAuthProvider,
  prev?: string,
  username?: string,
  answer?: string,
  show_nsfw?: boolean,
) {
  const redirectUri = `${window.location.origin}/oauth/callback`;
  const state = uuidv4();
  const requestUri =
    oauth_provider.authorization_endpoint +
    "?" +
    [
      `client_id=${encodeURIComponent(oauth_provider.client_id)}`,
      `response_type=code`,
      `scope=${encodeURIComponent(oauth_provider.scopes)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `state=${state}`,
    ].join("&");

  // store state in local storage
  localStorage.setItem(
    "oauth_state",
    JSON.stringify({
      state,
      oauth_provider_id: oauth_provider.id,
      redirect_uri: redirectUri,
      prev: prev ?? "/",
      username: username,
      answer: answer,
      show_nsfw: show_nsfw,
      expires_at: Date.now() + 5 * 60_000,
    }),
  );

  window.location.assign(requestUri);
}
