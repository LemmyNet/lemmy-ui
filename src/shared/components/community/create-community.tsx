import { Component } from "inferno";
import { CommunityView, GetSiteResponse } from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import {
  enableNsfw,
  isBrowser,
  setIsoData,
  toast,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { CommunityForm } from "./community-form";

interface CreateCommunityState {
  siteRes: GetSiteResponse;
  loading: boolean;
}

export class CreateCommunity extends Component<any, CreateCommunityState> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: CreateCommunityState = {
    siteRes: this.isoData.site_res,
    loading: false,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.handleCommunityCreate = this.handleCommunityCreate.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("create_community")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div className="row">
            <div className="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t("create_community")}</h5>
              <CommunityForm
                onCreate={this.handleCommunityCreate}
                enableNsfw={enableNsfw(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
                communityLanguages={this.state.siteRes.discussion_languages}
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
