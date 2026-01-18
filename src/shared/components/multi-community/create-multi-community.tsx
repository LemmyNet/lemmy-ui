import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import {
  CreateMultiCommunity as CreateMultiCommunityI,
  MyUserInfo,
} from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { HtmlTags } from "../common/html-tags";
import { MultiCommunityForm } from "./multi-community-form";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { toast } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";

interface State {
  loading: boolean;
}

@simpleScrollMixin
export class CreateMultiCommunity extends Component<
  RouteComponentProps<Record<string, never>>,
  State
> {
  private isoData = setIsoData(this.context);
  state: State = {
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("create_multi_community")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    const myUserInfo = this.isoData.myUserInfo;

    return (
      <div className="create-multi-community container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("create_multi_community")}
            </h1>
            <MultiCommunityForm
              onCreate={form => handleCreate(this, form, myUserInfo)}
              loading={this.state.loading}
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
  i.setState({ loading: true });

  const res = await HttpService.client.createMultiCommunity(form);

  if (res.state === "success" && myUserInfo) {
    const name = res.data.multi_community_view.multi.name;
    i.props.history.replace(`/m/${name}`);
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  i.setState({ loading: false });
}
