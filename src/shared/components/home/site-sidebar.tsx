import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  Language,
  LocalSite,
  MyUserInfo,
  PersonView,
  PluginMetadata,
  Site,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { LocalSiteBadges } from "../common/badges";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { LanguageList } from "@components/common/language-list";
import {
  CreateCommunityButton,
  CreateMultiCommunityButton,
  CreatePostButton,
} from "@components/common/content-actions/create-item-buttons";

interface SiteSidebarProps {
  site: Site;
  localSite?: LocalSite;
  admins?: PersonView[];
  isMobile?: boolean;
  myUserInfo: MyUserInfo | undefined;
  allLanguages?: Language[];
  siteLanguages?: number[];
  activePlugins?: PluginMetadata[];
}

interface SiteSidebarState {
  collapsed: boolean;
}

@tippyMixin
export class SiteSidebar extends Component<SiteSidebarProps, SiteSidebarState> {
  state: SiteSidebarState = {
    collapsed: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div className="site-sidebar accordion">
        <section id="sidebarInfo" className="card mb-3">
          <header className="card-header" id="sidebarInfoHeader">
            {this.siteName()}
            {!this.state.collapsed && (
              <BannerIconHeader banner={this.props.site.banner} />
            )}
          </header>

          {!this.state.collapsed && (
            <div id="sidebarInfoBody" aria-labelledby="sidebarInfoHeader">
              <div className="card-body">{this.siteInfo()}</div>
            </div>
          )}
        </section>
      </div>
    );
  }

  siteName() {
    return (
      <div className={classNames({ "mb-2": !this.state.collapsed })}>
        <h5 className="mb-0 d-inline">{this.props.site.name}</h5>
        {!this.props.isMobile && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={linkEvent(this, this.handleCollapseSidebar)}
            aria-label={
              this.state.collapsed
                ? I18NextService.i18n.t("expand")
                : I18NextService.i18n.t("collapse")
            }
            data-tippy-content={
              this.state.collapsed
                ? I18NextService.i18n.t("expand")
                : I18NextService.i18n.t("collapse")
            }
            data-bs-toggle="collapse"
            data-bs-target="#sidebarInfoBody"
            aria-expanded="true"
            aria-controls="sidebarInfoBody"
          >
            {this.state.collapsed ? (
              <Icon icon="plus-square" classes="icon-inline" />
            ) : (
              <Icon icon="minus-square" classes="icon-inline" />
            )}
          </button>
        )}
      </div>
    );
  }

  siteInfo() {
    const { site, activePlugins } = this.props;

    return (
      <div>
        {site.description && <h6>{site.description}</h6>}
        {site.sidebar && this.siteSidebar(site.sidebar)}
        <LanguageList
          allLanguages={this.props.allLanguages}
          languageIds={this.props.siteLanguages}
        />
        <CreatePostButton />
        <CreateCommunityButton
          localSite={this.props.localSite}
          myUserInfo={this.props.myUserInfo}
          blockButton
        />
        <CreateMultiCommunityButton
          myUserInfo={this.props.myUserInfo}
          blockButton
        />
        {this.props.localSite && (
          <LocalSiteBadges localSite={this.props.localSite} />
        )}
        {this.props.admins && this.admins(this.props.admins)}
        {activePlugins && this.plugins(activePlugins)}
      </div>
    );
  }

  siteSidebar(sidebar: string) {
    return (
      <div
        className="md-div mb-2"
        dangerouslySetInnerHTML={mdToHtml(sidebar, () => this.forceUpdate())}
      />
    );
  }

  admins(admins: PersonView[]) {
    return (
      <ul className="mt-1 list-inline small mb-0">
        <li className="list-inline-item">{I18NextService.i18n.t("admins")}:</li>
        {admins.map(av => (
          <li key={av.person.id} className="list-inline-item">
            <PersonListing
              person={av.person}
              banned={av.banned}
              myUserInfo={this.props.myUserInfo}
            />
          </li>
        ))}
      </ul>
    );
  }

  plugins(plugins: PluginMetadata[]) {
    return (
      plugins.length > 0 && (
        <ul className="mt-1 list-inline small mb-0">
          <li className="list-inline-item">
            {I18NextService.i18n.t("active_plugins")}:
          </li>
          {plugins.map(p => (
            <li className="list-inline-item">
              <a href={p.url} data-tippy-content={p.description}>
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )
    );
  }

  handleCollapseSidebar(i: SiteSidebar) {
    i.setState({ collapsed: !i.state.collapsed });
  }
}
