import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import {
  CreateMultiCommunity as CreateMultiCommunityI,
  GetSiteResponse,
  MultiCommunityResponse,
  MyUserInfo,
} from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { MultiCommunityForm } from "./multi-community-form";
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

interface State {
  createRes: RequestState<MultiCommunityResponse>;
}

@simpleScrollMixin
export class CreateMultiCommunity extends Component<
  RouteComponentProps<Record<string, never>>,
  State
> {
  private isoData = setIsoData(this.context);
  state: State = { createRes: EMPTY_REQUEST };

  static metadata = (
    _: never,
    siteRes: GetSiteResponse,
  ): Metadata | undefined => {
    const title = `${I18NextService.i18n.t("create_multi_community")} - ${
      siteRes?.site_view.site.name
    }`;
    return { title };
  };

  render() {
    const myUserInfo = this.isoData.myUserInfo;

    return (
      <div className="create-multi-community container-lg">
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("create_multi_community")}
            </h1>
            <MultiCommunityForm
              onCreate={form => handleCreate(this, form, myUserInfo)}
              createOrEditLoading={this.state.createRes.state === "loading"}
              myUserInfo={myUserInfo}
            />
          </div>
        </div>
      </div>
    );
  }
}
async function handleCreate(
  i: CreateMultiCommunity,
  form: CreateMultiCommunityI,
  myUserInfo?: MyUserInfo,
) {
  i.setState({ createRes: LOADING_REQUEST });
  const createRes = await HttpService.client.createMultiCommunity(form);
  i.setState({ createRes });

  if (createRes.state === "success" && myUserInfo) {
    const name = createRes.data.multi_community_view.multi.name;
    i.props.history.replace(`/m/${name}`);
  } else if (createRes.state === "failed") {
    toast(
      I18NextService.i18n.t(createRes.err.name as NoOptionI18nKeys),
      "danger",
    );
  }
}
