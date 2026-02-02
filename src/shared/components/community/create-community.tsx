import { enableNsfw, setIsoData } from "@utils/app";
import { Component } from "inferno";
import {
  CreateCommunity as CreateCommunityI,
  MyUserInfo,
} from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { HtmlTags } from "../common/html-tags";
import { CommunityForm } from "./community-form";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { toast } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";

interface CreateCommunityState {
  loading: boolean;
}

@simpleScrollMixin
export class CreateCommunity extends Component<
  RouteComponentProps<Record<string, never>>,
  CreateCommunityState
> {
  private isoData = setIsoData(this.context);
  state: CreateCommunityState = {
    loading: false,
  };

  get documentTitle(): string {
    return `${I18NextService.i18n.t("create_community")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="create-community container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("create_community")}
            </h1>
            <CommunityForm
              onCreate={form =>
                handleCommunityCreate(this, form, this.isoData.myUserInfo)
              }
              enableNsfw={enableNsfw(this.isoData.siteRes)}
              allLanguages={this.isoData.siteRes?.all_languages}
              siteLanguages={this.isoData.siteRes?.discussion_languages}
              communityLanguages={this.isoData.siteRes?.discussion_languages}
              createOrEditLoading={this.state.loading}
              myUserInfo={this.isoData.myUserInfo}
            />
          </div>
        </div>
      </div>
    );
  }
}

async function handleCommunityCreate(
  i: CreateCommunity,
  form: CreateCommunityI,
  myUserInfo?: MyUserInfo,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.createCommunity(form);

  if (res.state === "success" && myUserInfo) {
    myUserInfo.moderates.push({
      community: res.data.community_view.community,
      moderator: myUserInfo.local_user_view.person,
    });
    const name = res.data.community_view.community.name;
    i.props.history.replace(`/c/${name}`);
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  i.setState({ loading: false });
}
