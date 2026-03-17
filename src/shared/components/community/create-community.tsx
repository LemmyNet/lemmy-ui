import { enableNsfw, setIsoData } from "@utils/app";
import { Component } from "inferno";
import {
  CommunityResponse,
  CreateCommunity as CreateCommunityI,
  GetSiteResponse,
  MyUserInfo,
} from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { CommunityForm } from "./community-form";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { toast } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";
import {
  EMPTY_REQUEST,
  LOADING_REQUEST,
  RequestState,
} from "@services/HttpService";
import { Metadata } from "@utils/routes";

interface CreateCommunityState {
  createCommunityRes: RequestState<CommunityResponse>;
}

@simpleScrollMixin
export class CreateCommunity extends Component<
  RouteComponentProps<Record<string, never>>,
  CreateCommunityState
> {
  private isoData = setIsoData(this.context);
  state: CreateCommunityState = {
    createCommunityRes: EMPTY_REQUEST,
  };

  static metadata = (
    _: never,
    siteRes: GetSiteResponse,
  ): Metadata | undefined => {
    const title = `${I18NextService.i18n.t("create_community")} - ${
      siteRes?.site_view.site.name
    }`;
    return { title };
  };

  render() {
    const imageUploadDisabled =
      this.isoData.siteRes.site_view.local_site.image_upload_disabled;
    return (
      <div className="create-community container-lg">
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
              createOrEditLoading={
                this.state.createCommunityRes.state === "loading"
              }
              myUserInfo={this.isoData.myUserInfo}
              imageUploadDisabled={imageUploadDisabled}
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
  i.setState({ createCommunityRes: LOADING_REQUEST });
  const res = await HttpService.client.createCommunity(form);
  i.setState({ createCommunityRes: res });

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
}
