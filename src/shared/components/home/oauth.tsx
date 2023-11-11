import { setIsoData } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import * as cookie from "cookie";
import { Component, linkEvent } from "inferno";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { HttpService, I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import PasswordInput from "../common/password-input";

interface State {
  siteRes: GetSiteResponse;
}

export class OAuth extends Component<any, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    UserService.Instance.login({
        res: {
            jwt: cookie.parse(document.cookie).jwt,
            verify_email_sent: false,
            registration_created: false,
        },
    });

    window.location = new URLSearchParams(this.props.location.search).get("redirect_uri");
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.site.name;
  }

  render() {
    return (
      <div className="container-lg">
      </div>
    );
  }
}
