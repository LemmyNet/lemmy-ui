import { setIsoData } from "@utils/app";
import { Choice } from "@utils/types";
import { Component } from "inferno";
import { emDash } from "../../shared/config";
import { FirstLoadService } from "../../shared/services";
import { HtmlTags } from "./common/html-tags";
import { SearchableSelect } from "./common/searchable-select";

export class Federate extends Component<any, any> {
  private isoData = setIsoData<Record<string, any>>(this.context);

  constructor(props, context) {
    super(props, context);

    FirstLoadService.isFirstLoad;
  }

  render() {
    return (
      <main className="federate container-lg">
        <HtmlTags
          title="Federate!"
          path={this.context.router.route.match.url}
        />
        <h1 className="h4 mb-4">Federate</h1>
        <p>
          Search for communities that aren&apos;t federated with your instance
          yet.
        </p>
        <form className="row">
          <div className="col-12 col-md-6 my-2">
            <p className="alert alert-info">
              Enter the name of the community you want to federate. Make sure to
              use the part after the <code>/c</code> in a community&apos;s URL.
              E.g. if trying to federate with the community{" "}
              <a href="https://lemmy.ml/c/lemmy_support">
                lemmy.ml/c/lemmy_support
              </a>
              , enter <code>lemmy_support</code>, not &quot;Lemmy Support&quot;.
            </p>
            <input
              type="text"
              id="community-name-input"
              className="form-control"
              placeholder="Community name..."
              aria-label="Community Name"
              required
              minLength={3}
            />
          </div>
          <div className="col-12 col-md-6 my-2">
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="linked-instances-search-select"
              >
                Linked Instances
              </label>
              <SearchableSelect
                id="linked-instances-search-select"
                options={[
                  { label: emDash, value: "0", disabled: true } as Choice,
                ]}
              />
            </div>
            <div className="form-group mt-2">
              <label htmlFor="instance-name-input">
                Is the instance you&apos;re looking for not linked already?
                Enter it here!
              </label>
              <input
                type="text"
                id="instance-name-input"
                className="form-control"
                placeholder="Instance domain..."
              />
            </div>
          </div>
        </form>
      </main>
    );
  }

  static async fetchInitialData(): Promise<Record<string, any>> {
    return {};
  }
}
