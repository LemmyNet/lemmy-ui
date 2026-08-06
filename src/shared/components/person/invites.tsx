import { Component } from "inferno";
import {
  GetSiteResponse,
  LocalUserInvite,
  PagedResponse,
} from "lemmy-js-client";
import { isBrowser } from "@utils/browser";
import { toast } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "@services/HttpService";
import { I18NextService } from "@services/I18NextService";
import { Icon, Spinner } from "@components/common/icon";
import { MomentTime } from "@components/common/moment-time";
import { fetchLimit } from "@utils/config";

interface InvitesProps {
  siteRes: GetSiteResponse;
}

interface InvitesState {
  invitesRes: RequestState<PagedResponse<LocalUserInvite>>;
  createRes: RequestState<{ invite: LocalUserInvite }>;
  revokeRes: RequestState<unknown>;
  form: {
    max_uses?: number;
    expires_at?: number;
  };
}

export class Invites extends Component<InvitesProps, InvitesState> {
  state: InvitesState = {
    invitesRes: EMPTY_REQUEST,
    createRes: EMPTY_REQUEST,
    revokeRes: EMPTY_REQUEST,
    form: {
      max_uses: 1,
      expires_at: 24,
    },
  };

  async componentDidMount() {
    await this.fetchInvites();
  }

  async fetchInvites() {
    this.setState({ invitesRes: LOADING_REQUEST });
    const res = await HttpService.client.listRegistrationInvitations({
      limit: fetchLimit,
    });
    this.setState({ invitesRes: res });
  }

  get inviteUrlBase(): string {
    const origin = isBrowser() ? window.location.origin : "";
    return `${origin}/signup?token=`;
  }

  render() {
    const maxAllowed =
      this.props.siteRes.site_view.local_site.max_invites_per_user_allowed;

    return (
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title mb-3">
            {I18NextService.i18n.t("invites")}
          </h5>
          {this.createForm(maxAllowed)}
          <hr className="my-4" />
          {this.invitesList()}
        </div>
      </div>
    );
  }

  createForm(maxAllowed: number) {
    return (
      <form onSubmit={e => this.handleCreate(e)}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-5">
            <label
              className="form-label small fw-semibold text-body-secondary"
              htmlFor="invite-max-uses"
            >
              {I18NextService.i18n.t("max_uses")}
            </label>
            <select
              id="invite-max-uses"
              className="form-select"
              value={this.state.form.max_uses ?? "unlimited"}
              onChange={e =>
                this.setState(s => ({
                  ...s,
                  form: {
                    ...s.form,
                    max_uses:
                      e.target.value === "unlimited"
                        ? undefined
                        : Number(e.target.value),
                  },
                }))
              }
            >
              <option value="1">1 use</option>
              <option value="5">5 uses</option>
              <option value="10">10 uses</option>
              <option value="25">25 uses</option>
              <option value="unlimited">
                {I18NextService.i18n.t("unlimited")}
              </option>
            </select>
          </div>

          <div className="col-12 col-md-5">
            <label
              className="form-label small fw-semibold text-body-secondary"
              htmlFor="invite-expires"
            >
              {I18NextService.i18n.t("expires_in_hours")}
            </label>
            <select
              id="invite-expires"
              className="form-select"
              value={this.state.form.expires_at ?? "never"}
              onChange={e =>
                this.setState(s => ({
                  ...s,
                  form: {
                    ...s.form,
                    expires_at:
                      e.target.value === "never"
                        ? undefined
                        : Number(e.target.value),
                  },
                }))
              }
            >
              <option value="0.5">30 minutes</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">1 day (24 hours)</option>
              <option value="168">7 days</option>
              <option value="never">{I18NextService.i18n.t("never")}</option>
            </select>
          </div>

          <div className="col-12 col-md-2">
            <button
              type="submit"
              className="btn btn-secondary w-100 d-inline-flex align-items-center justify-content-center"
              disabled={this.state.createRes.state === "loading"}
            >
              {this.state.createRes.state === "loading" ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("create_invite")
              )}
            </button>
          </div>
        </div>

        {maxAllowed > 0 && (
          <div className="form-text text-body-secondary mt-2 small">
            {I18NextService.i18n.t("max_invites_allowed", {
              count: maxAllowed,
              formattedCount: maxAllowed,
            })}
          </div>
        )}
      </form>
    );
  }

  invitesList() {
    switch (this.state.invitesRes.state) {
      case "loading":
        return (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 text-body-secondary w-100 text-center">
            <Spinner large />
          </div>
        );
      case "failed":
        return (
          <div className="alert alert-danger mb-0">
            {I18NextService.i18n.t("couldnt_fetch_invites")}
          </div>
        );
      case "success": {
        const invites = this.state.invitesRes.data.items;
        if (!invites.length) {
          return (
            <p className="text-body-secondary mb-0">
              {I18NextService.i18n.t("no_invites")}
            </p>
          );
        }
        return (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-body-secondary">
                  <th
                    scope="col"
                    className="py-3"
                    style={{ "min-width": "260px" }}
                  >
                    {I18NextService.i18n.t("invite_token")}
                  </th>
                  <th scope="col" className="py-3 text-center">
                    {I18NextService.i18n.t("uses")}
                  </th>
                  <th scope="col" className="py-3">
                    {I18NextService.i18n.t("expires")}
                  </th>
                  <th scope="col" className="py-3">
                    {I18NextService.i18n.t("created")}
                  </th>
                  <th scope="col" className="py-3 text-end">
                    {I18NextService.i18n.t("action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map(invite => {
                  const fullUrl = `${this.inviteUrlBase}${invite.token}`;
                  return (
                    <tr key={invite.id}>
                      <td className="py-3">
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control font-monospace form-control-sm"
                            value={fullUrl}
                            readOnly
                            onClick={e => e.target.select()}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                            onClick={() => this.copyLink(invite.token)}
                            title={I18NextService.i18n.t("copy_link")}
                          >
                            <Icon icon="copy" inline />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="badge text-bg-light border font-monospace px-2 py-1">
                          {invite.uses_count}
                          {invite.max_uses ? ` / ${invite.max_uses}` : " / ∞"}
                        </span>
                      </td>
                      <td className="py-3 small text-body-secondary">
                        {invite.expires_at ? (
                          <MomentTime published={invite.expires_at} />
                        ) : (
                          I18NextService.i18n.t("never")
                        )}
                      </td>
                      <td className="py-3 small text-body-secondary">
                        <MomentTime published={invite.published_at} />
                      </td>
                      <td className="py-3 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
                          onClick={() => this.handleRevoke(invite.token)}
                          disabled={this.state.revokeRes.state === "loading"}
                          title={I18NextService.i18n.t("revoke")}
                        >
                          {I18NextService.i18n.t("revoke")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      default:
        return null;
    }
  }

  async handleCreate(e: Event) {
    e.preventDefault();
    this.setState({ createRes: LOADING_REQUEST });

    const { max_uses, expires_at } = this.state.form;
    const expiresAtIso = expires_at
      ? new Date(Date.now() + expires_at * 3600_000).toISOString()
      : undefined;

    const res = await HttpService.client.createRegistrationInvitation({
      max_uses,
      expires_at: expiresAtIso,
    });

    switch (res.state) {
      case "failed":
        toast(
          I18NextService.i18n.t(res.err.name as NoOptionI18nKeys),
          "danger",
        );
        this.setState({ createRes: EMPTY_REQUEST });
        break;
      case "success":
        toast(I18NextService.i18n.t("invite_created"));
        this.setState({
          createRes: EMPTY_REQUEST,
          form: { max_uses: 1, expires_at: 24 },
        });
        await this.fetchInvites();
        break;
    }
  }

  async handleRevoke(token: string) {
    this.setState({ revokeRes: LOADING_REQUEST });
    const res = await HttpService.client.revokeRegistrationInvitation({
      token,
    });
    switch (res.state) {
      case "failed":
        toast(
          I18NextService.i18n.t(res.err.name as NoOptionI18nKeys),
          "danger",
        );
        this.setState({ revokeRes: EMPTY_REQUEST });
        break;
      case "success":
        toast(I18NextService.i18n.t("invite_revoked"));
        this.setState({ revokeRes: EMPTY_REQUEST });
        await this.fetchInvites();
        break;
    }
  }

  copyLink(token: string) {
    const link = `${this.inviteUrlBase}${token}`;
    if (isBrowser()) {
      void navigator.clipboard
        .writeText(link)
        .then(() => toast(I18NextService.i18n.t("copied_to_clipboard")));
    }
  }
}
