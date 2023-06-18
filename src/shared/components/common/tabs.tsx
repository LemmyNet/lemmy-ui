import classNames from "classnames";
import { Component, InfernoNode, linkEvent } from "inferno";

interface TabItem {
  key: string;
  getNode: () => InfernoNode;
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
  constructor(props: TabsProps, context) {
    super(props, context);

    this.state = {
      currentTab: props.tabs.length > 0 ? props.tabs[0].key : "",
    };
  }

  render() {
    return (
      <div>
        <ul className="nav nav-tabs mb-2" role="tablist">
          {this.props.tabs.map(({ key, label }, index) => (
            <li key={key} className="nav-item">
              <button
                type="button"
                data-bs-toggle="tab"
                data-bs-target={`#${key}-tab-pane`}
                aria-controls={`${key}-tab-pane`}
                className={classNames("nav-link", {
                  active: index === 0,
                })}
                {...(index === 0 && {
                  ...{
                    "aria-current": "page",
                    "aria-selected": "true",
                  },
                })}
                onClick={linkEvent({ ctx: this, tab: key }, handleSwitchTab)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="tab-content">
          {this.props.tabs.map(tab => {
            return tab.getNode();
          })}
        </div>
      </div>
    );
  }
}
