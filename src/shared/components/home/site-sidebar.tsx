import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { PersonView, Site, SiteAggregates } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { mdToHtml, numToSI } from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";

interface SiteSidebarProps {
  site: Site;
  showLocal: boolean;
  counts?: SiteAggregates;
  admins?: PersonView[];
}

interface SiteSidebarState {
  collapsed: boolean;
}

export class SiteSidebar extends Component<SiteSidebarProps, SiteSidebarState> {
  state: SiteSidebarState = {
    collapsed: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div className="card border-secondary mb-3">
        <div className="card-body">
          <div>
            <div className="mb-2">{this.siteName()}</div>
            {!this.state.collapsed && (
              <>
                <BannerIconHeader banner={this.props.site.banner} />
                {this.siteInfo()}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  siteName() {
    return (
      <h5 className="mb-0 d-inline">
        {this.props.site.name}
        <button
          className="btn btn-sm text-muted"
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
    );
  }

  siteInfo() {
    const site = this.props.site;
    return (
      <div>
        {site.description && <h6>{site.description}</h6>}
        {site.sidebar && this.siteSidebar(site.sidebar)}
        {this.props.counts && this.badges(this.props.counts)}
        {this.props.admins && this.admins(this.props.admins)}
      </div>
    );
  }

  siteSidebar(sidebar: string) {
    return (
      <div className="md-div" dangerouslySetInnerHTML={mdToHtml(sidebar)} />
    );
  }

  admins(admins: PersonView[]) {
    return (
      <ul className="mt-1 list-inline small mb-0">
        <li className="list-inline-item">{i18n.t("admins")}:</li>
        {admins.map(av => (
          <li key={av.person.id} className="list-inline-item">
            <PersonListing person={av.person} />
          </li>
        ))}
      </ul>
    );
  }

  badges(siteAggregates: SiteAggregates) {
    const counts = siteAggregates;
    return (
      <ul className="my-2 list-inline">
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_users", {
            count: Number(counts.users),
            formattedCount: numToSI(counts.users),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_communities", {
            count: Number(counts.communities),
            formattedCount: numToSI(counts.communities),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: Number(counts.posts),
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: Number(counts.comments),
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

  handleCollapseSidebar(i: SiteSidebar) {
    i.setState({ collapsed: !i.state.collapsed });
  }
}
