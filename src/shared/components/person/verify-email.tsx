import { Component } from "inferno";
import {
  GetSiteResponse,
  UserOperation,
  VerifyEmailResponse,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  HttpService,
  RequestState,
  apiWrapper,
} from "../../services/HttpService";
import { setIsoData, toast } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  verifyRes: RequestState<VerifyEmailResponse>;
  siteRes: GetSiteResponse;
}

export class VerifyEmail extends Component<any, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    verifyRes: { state: "empty" },
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  async verify() {
    this.setState({
      verifyRes: { state: "loading" },
    });

    this.setState({
      verifyRes: await apiWrapper(
        HttpService.client.verifyEmail({
          token: this.props.match.params.token,
        })
      ),
    });

    if (this.state.verifyRes.state == "success") {
      toast(i18n.t("email_verified"));
      this.props.history.push("/login");
    }
  }

  async componentDidMount() {
    await this.verify();
  }

  get documentTitle(): string {
    return `${i18n.t("verify_email")} - ${
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
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h5>{i18n.t("verify_email")}</h5>
            {this.state.verifyRes.state == "loading" && (
              <h5>
                <Spinner large />
              </h5>
            )}
          </div>
        </div>
      </div>
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState(this.state);
      this.props.history.push("/");
      return;
    } else if (op == UserOperation.VerifyEmail) {
      let data = wsJsonToRes(msg);
      if (data) {
        toast(i18n.t("email_verified"));
        this.props.history.push("/login");
      }
    }
  }
}
