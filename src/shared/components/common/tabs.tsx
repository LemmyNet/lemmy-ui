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
  console.log(tab);
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
        <ul className="nav nav-tabs mb-2">
          {this.props.tabs.map(({ key, label }) => (
            <li key={key} className="nav-item">
              <button
                type="button"
                className={`nav-link btn${
                  this.state?.currentTab === key ? " active" : ""
                }`}
                onClick={linkEvent({ ctx: this, tab: key }, handleSwitchTab)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        {this.props.tabs
          .find(tab => tab.key === this.state?.currentTab)
          ?.getNode()}
      </div>
    );
  }
}
