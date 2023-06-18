import classNames from "classnames";
import { Component, InfernoNode } from "inferno";

interface TabItem {
  key: string;
  getNode: () => InfernoNode;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
}

export default class Tabs extends Component<TabsProps> {
  constructor(props: TabsProps, context) {
    super(props, context);
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
