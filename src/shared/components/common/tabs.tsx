import classNames from "classnames";
import { Component, InfernoNode, linkEvent } from "inferno";

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

function handleSwitchTab({ ctx, tab }: { ctx: Tabs; tab: string }) {
  ctx.setState({ currentTab: tab });
}

export default class Tabs extends Component<TabsProps, TabsState> {
  constructor(props: TabsProps, context: any) {
    super(props, context);

    this.state = {
      currentTab: props.tabs.length > 0 ? props.tabs[0].key : "",
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
                onClick={linkEvent({ ctx: this, tab: key }, handleSwitchTab)}
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
