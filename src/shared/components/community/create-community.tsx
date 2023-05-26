import { Component } from "inferno";
import { Redirect } from "inferno-router";
import {
  CreateCommunity as CreateCommunityI,
  GetSiteResponse,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { HttpService, apiWrapper } from "../../services/HttpService";
import { UserService } from "../../services/UserService";
import { enableNsfw, setIsoData, toast } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { CommunityForm } from "./community-form";

interface CreateCommunityState {
  siteRes: GetSiteResponse;
}

export class CreateCommunity extends Component<any, CreateCommunityState> {
  private isoData = setIsoData(this.context);
  state: CreateCommunityState = {
    siteRes: this.isoData.site_res,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.handleCommunityCreate = this.handleCommunityCreate.bind(this);
  }

  get documentTitle(): string {
    return `${i18n.t("create_community")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="container-lg">
        {!UserService.Instance.myUserInfo && <Redirect to="/login" />}
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h5>{i18n.t("create_community")}</h5>
            <CommunityForm
              onCreateCommunity={this.handleCommunityCreate}
              enableNsfw={enableNsfw(this.state.siteRes)}
              allLanguages={this.state.siteRes.all_languages}
              siteLanguages={this.state.siteRes.discussion_languages}
              communityLanguages={this.state.siteRes.discussion_languages}
            />
          </div>
        </div>
      </div>
    );
  }

  async handleCommunityCreate(form: CreateCommunityI) {
    const res = apiWrapper(await HttpService.client.createCommunity(form));
    if (res.state == "success") {
      const name = res.data.community_view.community.name;
      this.props.history.push(`/c/${name}`);
    }
  }

  parseMessage(msg: any) {
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
    }
  }
}
