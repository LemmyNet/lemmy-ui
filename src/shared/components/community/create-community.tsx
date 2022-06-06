import { Component } from "inferno";
import { CommunityView, SiteView } from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { isBrowser, setIsoData, toast, wsSubscribe } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { CommunityForm } from "./community-form";

interface CreateCommunityState {
  site_view: SiteView;
  loading: boolean;
}

export class CreateCommunity extends Component<any, CreateCommunityState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreateCommunityState = {
    site_view: this.isoData.site_res.site_view,
    loading: false,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.handleCommunityCreate = this.handleCommunityCreate.bind(this);
    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("create_community")} - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t("create_community")}</h5>
              <CommunityForm
                onCreate={this.handleCommunityCreate}
                enableNsfw={this.state.site_view.site.enable_nsfw}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handleCommunityCreate(cv: CommunityView) {
    this.props.history.push(`/c/${cv.community.name}`);
  }

  parseMessage(msg: any) {
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
    }
  }
}
