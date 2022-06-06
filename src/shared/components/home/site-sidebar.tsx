import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { PersonViewSafe, Site, SiteAggregates } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { mdToHtml, numToSI } from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { SiteForm } from "./site-form";

interface SiteSidebarProps {
  site: Site;
  showLocal: boolean;
  counts?: SiteAggregates;
  admins?: PersonViewSafe[];
  online?: number;
}

interface SiteSidebarState {
  collapsed: boolean;
  showEdit: boolean;
}

export class SiteSidebar extends Component<SiteSidebarProps, SiteSidebarState> {
  private emptyState: SiteSidebarState = {
    collapsed: false,
    showEdit: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handleEditCancel = this.handleEditCancel.bind(this);
    this.handleEditSite = this.handleEditSite.bind(this);
  }

  render() {
    let site = this.props.site;
    return (
      <div class="card border-secondary mb-3">
        <div class="card-body">
          {!this.state.showEdit ? (
            <div>
              <div class="mb-2">
                {this.siteName()}
                {this.props.admins && this.adminButtons()}
              </div>
              {!this.state.collapsed && (
                <>
                  <BannerIconHeader banner={site.banner} />
                  {this.siteInfo()}
                </>
              )}
            </div>
          ) : (
            <SiteForm
              site={site}
              showLocal={this.props.showLocal}
              onEdit={this.handleEditSite}
              onCancel={this.handleEditCancel}
            />
          )}
        </div>
      </div>
    );
  }

  siteName() {
    let site = this.props.site;
    return (
      site.name && (
        <h5 class="mb-0 d-inline">
          {site.name}
          <button
            class="btn btn-sm text-muted"
            onClick={linkEvent(this, this.handleCollapseSidebar)}
            aria-label={i18n.t("collapse")}
            data-tippy-content={i18n.t("collapse")}
          >
            {this.state.collapsed ? (
              <Icon icon="plus-square" classes="icon-inline" />
            ) : (
              <Icon icon="minus-square" classes="icon-inline" />
            )}
          </button>
        </h5>
      )
    );
  }

  siteInfo() {
    let site = this.props.site;
    return (
      <div>
        {site.description && <h6>{site.description}</h6>}
        {site.sidebar && this.siteSidebar()}
        {this.props.counts && this.badges()}
        {this.props.admins && this.admins()}
      </div>
    );
  }

  adminButtons() {
    return (
      this.canAdmin && (
        <ul class="list-inline mb-1 text-muted font-weight-bold">
          <li className="list-inline-item-action">
            <button
              class="btn btn-link d-inline-block text-muted"
              onClick={linkEvent(this, this.handleEditClick)}
              aria-label={i18n.t("edit")}
              data-tippy-content={i18n.t("edit")}
            >
              <Icon icon="edit" classes="icon-inline" />
            </button>
          </li>
        </ul>
      )
    );
  }

  siteSidebar() {
    return (
      <div
        className="md-div"
        dangerouslySetInnerHTML={mdToHtml(this.props.site.sidebar)}
      />
    );
  }

  admins() {
    return (
      <ul class="mt-1 list-inline small mb-0">
        <li class="list-inline-item">{i18n.t("admins")}:</li>
        {this.props.admins?.map(av => (
          <li class="list-inline-item">
            <PersonListing person={av.person} />
          </li>
        ))}
      </ul>
    );
  }

  badges() {
    let counts = this.props.counts;
    let online = this.props.online;
    return (
      <ul class="my-2 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", {
            count: online,
            formattedCount: numToSI(online),
          })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: counts.users_active_week,
            formattedCount: counts.users_active_week,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_week,
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: counts.users_active_month,
            formattedCount: counts.users_active_month,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_month,
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: counts.users_active_half_year,
            formattedCount: counts.users_active_half_year,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_half_year,
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_users", {
            count: counts.users,
            formattedCount: numToSI(counts.users),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_communities", {
            count: counts.communities,
            formattedCount: numToSI(counts.communities),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: counts.posts,
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: counts.comments,
            formattedCount: numToSI(counts.comments),
          })}
        </li>
        <li className="list-inline-item">
          <Link className="badge badge-primary" to="/modlog">
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.myUserInfo &&
      this.props.admins
        .map(a => a.person.id)
        .includes(UserService.Instance.myUserInfo.local_user_view.person.id)
    );
  }

  handleCollapseSidebar(i: SiteSidebar) {
    i.state.collapsed = !i.state.collapsed;
    i.setState(i.state);
  }

  handleEditClick(i: SiteSidebar) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleEditSite() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleEditCancel() {
    this.state.showEdit = false;
    this.setState(this.state);
  }
}
