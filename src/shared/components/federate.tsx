import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { FirstLoadService } from "../../shared/services";
import { HtmlTags } from "./common/html-tags";

export class Federate extends Component<any, any> {
  private isoData = setIsoData<Record<string, any>>(this.context);

  constructor(props, context) {
    super(props, context);

    FirstLoadService.isFirstLoad;
  }

  render() {
    return (
      <div className="modlog container-lg">
        <HtmlTags
          title="Federate!"
          path={this.context.router.route.match.url}
        />
        <h1 className="h4 mb-4">Federate</h1>
        <p>
          Search for communities that aren&apos;t federated with your instance
          yet.
        </p>
      </div>
    );
  }

  static async fetchInitialData(): Promise<Record<string, any>> {
    return {};
  }
}
