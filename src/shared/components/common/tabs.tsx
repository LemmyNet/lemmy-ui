import classNames from "classnames";
import { Component, InfernoNode } from "inferno";
import { isBrowser } from "@utils/browser";

interface TabItem {
  key: string;
  getNode: (isSelected: boolean) => InfernoNode;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
}

interface TabsState {
  currentTab: string;
}

export default class Tabs extends Component<TabsProps, TabsState> {
  constructor(props: TabsProps, context: object) {
    super(props, context);

    const hashTab = isBrowser() ? window.location.hash.slice(1) : "";
    const validTab = props.tabs.find(t => t.key === hashTab)?.key;

    this.state = {
      currentTab: validTab ?? (props.tabs.length > 0 ? props.tabs[0].key : ""),
    };
  }

  render() {
    return (
      <div>
        <ul className="nav nav-tabs mb-2" role="tablist">
          {this.props.tabs.map(({ key, label }) => (
            <li key={key} className="nav-item">
              <button
                type="button"
                className={classNames("nav-link", {
                  active: this.state?.currentTab === key,
                })}
                onClick={() => {
                  window.history.replaceState(null, "", `#${key}`);
                  this.setState({ currentTab: key });
                }}
                aria-controls={`${key}-tab-pane`}
                {...(this.state?.currentTab === key && {
                  ...{
                    "aria-current": "page",
                    "aria-selected": "true",
                  },
                })}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="tab-content">
          {this.props.tabs.map(({ key, getNode }) => {
            return getNode(this.state?.currentTab === key);
          })}
        </div>
      </div>
    );
  }
}
