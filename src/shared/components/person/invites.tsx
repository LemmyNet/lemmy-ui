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
import { ResponsiveTableRowHeader, TableHr } from "@components/common/tables";
import { fetchLimit } from "@utils/config";

const UNLIMITED = "unlimited";
const NEVER = "never";

interface MaxUsesOption {
  value: string;
  labelKey: NoOptionI18nKeys;
  count?: number;
}

const MAX_USES_OPTIONS: MaxUsesOption[] = [
  { value: UNLIMITED, labelKey: "unlimited" },
  { value: "1", labelKey: "uses", count: 1 },
  { value: "5", labelKey: "uses", count: 5 },
  { value: "10", labelKey: "uses", count: 10 },
  { value: "25", labelKey: "uses", count: 25 },
];

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
      max_uses: undefined,
      expires_at: undefined,
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
      <form onSubmit={e => handleCreate(this, e)}>
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
              value={this.state.form.max_uses?.toString() ?? UNLIMITED}
              onChange={e => handleMaxUsesChange(this, e.target.value)}
            >
              {MAX_USES_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.count !== undefined
                    ? `${opt.count} ${I18NextService.i18n.t(opt.labelKey as NoOptionI18nKeys)}`
                    : I18NextService.i18n.t(opt.labelKey as NoOptionI18nKeys)}
                </option>
              ))}
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
              value={this.state.form.expires_at?.toString() ?? NEVER}
              onChange={e => handleExpiresAtChange(this, e.target.value)}
            >
              <option value={NEVER}>{I18NextService.i18n.t("never")}</option>
              <option value="0.5">
                {I18NextService.i18n.t("n_minutes", {
                  count: 30,
                  formattedCount: 30,
                })}
              </option>
              <option value="1">
                {I18NextService.i18n.t("n_hours", {
                  count: 1,
                  formattedCount: 1,
                })}
              </option>
              <option value="6">
                {I18NextService.i18n.t("n_hours", {
                  count: 6,
                  formattedCount: 6,
                })}
              </option>
              <option value="24">
                {I18NextService.i18n.t("n_days", {
                  count: 1,
                  formattedCount: 1,
                })}
              </option>
              <option value="168">
                {I18NextService.i18n.t("n_days", {
                  count: 7,
                  formattedCount: 7,
                })}
              </option>
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
        return <Spinner large centered />;
      case "failed":
        return (
          <div className="alert alert-danger mb-0">
            {I18NextService.i18n.t("couldnt_fetch_invites")}
          </div>
        );
      case "success": {
        const invites = this.state.invitesRes.data.items;
        return !invites.length ? (
          <p className="text-body-secondary mb-0">
            {I18NextService.i18n.t("no_invites")}
          </p>
        ) : (
          <div id="invites_table">
            <div className="d-none d-md-block">
              <div className="row fw-bold text-body-secondary small mb-2">
                <div className="col-md-5">
                  {I18NextService.i18n.t("invite_token")}
                </div>
                <div className="col-md-2 text-center">
                  {I18NextService.i18n.t("uses")}
                </div>
                <div className="col-md-2">
                  {I18NextService.i18n.t("expires")}
                </div>
                <div className="col-md-2">
                  {I18NextService.i18n.t("created")}
                </div>
                <div className="col-md-1 text-end">
                  {I18NextService.i18n.t("action")}
                </div>
              </div>
              <TableHr />
            </div>
            {invites.map(invite => {
              const fullUrl = `${this.inviteUrlBase}${invite.token}`;
              return (
                <div key={invite.id}>
                  <div className="row align-items-center g-2">
                    <div className="d-md-none col-12">
                      <div className="fw-bold">
                        {I18NextService.i18n.t("invite_token")}
                      </div>
                    </div>
                    <div className="col-12 col-md-5">
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={fullUrl}
                          readOnly
                          onClick={e => e.target.select()}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                          onClick={() => copyLink(this, invite.token)}
                          title={I18NextService.i18n.t("copy_link")}
                        >
                          <Icon icon="copy" inline />
                        </button>
                      </div>
                    </div>

                    <ResponsiveTableRowHeader title="uses" />
                    <div className="col-6 col-md-2 text-md-center">
                      <span className="badge text-bg-light border font-monospace px-2 py-1">
                        {invite.uses_count}
                        {invite.max_uses ? ` / ${invite.max_uses}` : " / ∞"}
                      </span>
                    </div>

                    <ResponsiveTableRowHeader title="expires" />
                    <div className="col-6 col-md-2 small text-body-secondary">
                      {invite.expires_at ? (
                        <MomentTime published={invite.expires_at} />
                      ) : (
                        I18NextService.i18n.t("never")
                      )}
                    </div>

                    <ResponsiveTableRowHeader title="created" />
                    <div className="col-6 col-md-2 small text-body-secondary">
                      <MomentTime published={invite.published_at} />
                    </div>

                    <ResponsiveTableRowHeader title="action" />
                    <div className="col-6 col-md-1 text-md-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
                        onClick={() => handleRevoke(this, invite.token)}
                        disabled={this.state.revokeRes.state === "loading"}
                        title={I18NextService.i18n.t("revoke")}
                      >
                        {I18NextService.i18n.t("revoke")}
                      </button>
                    </div>
                  </div>
                  <hr className="my-3" />
                </div>
              );
            })}
          </div>
        );
      }
      default:
        return null;
    }
  }
}

function handleMaxUsesChange(i: Invites, val: string) {
  i.setState(s => ({
    ...s,
    form: {
      ...s.form,
      max_uses: val === UNLIMITED ? undefined : Number(val),
    },
  }));
}

function handleExpiresAtChange(i: Invites, val: string) {
  i.setState(s => ({
    ...s,
    form: {
      ...s.form,
      expires_at: val === NEVER ? undefined : Number(val),
    },
  }));
}

async function handleCreate(i: Invites, e: Event) {
  e.preventDefault();
  i.setState({ createRes: LOADING_REQUEST });

  const { max_uses, expires_at } = i.state.form;
  const expiresAtIso = expires_at
    ? new Date(Date.now() + expires_at * 3600_000).toISOString()
    : undefined;

  const res = await HttpService.client.createRegistrationInvitation({
    max_uses,
    expires_at: expiresAtIso,
  });

  switch (res.state) {
    case "failed":
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
      i.setState({ createRes: EMPTY_REQUEST });
      break;
    case "success":
      toast(I18NextService.i18n.t("invite_created"));
      i.setState({
        createRes: EMPTY_REQUEST,
        form: { max_uses: undefined, expires_at: undefined },
      });
      await i.fetchInvites();
      break;
  }
}

async function handleRevoke(i: Invites, token: string) {
  i.setState({ revokeRes: LOADING_REQUEST });
  const res = await HttpService.client.revokeRegistrationInvitation({
    token,
  });
  switch (res.state) {
    case "failed":
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
      i.setState({ revokeRes: EMPTY_REQUEST });
      break;
    case "success":
      toast(I18NextService.i18n.t("invite_revoked"));
      i.setState({ revokeRes: EMPTY_REQUEST });
      await i.fetchInvites();
      break;
  }
}

function copyLink(i: Invites, token: string) {
  const link = `${i.inviteUrlBase}${token}`;
  if (isBrowser()) {
    void navigator.clipboard
      .writeText(link)
      .then(() => toast(I18NextService.i18n.t("copied_to_clipboard")));
  }
}
