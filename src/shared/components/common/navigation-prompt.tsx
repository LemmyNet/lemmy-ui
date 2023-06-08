import { Component } from "inferno";
import { i18n } from "../../i18next";
import { HistoryService } from "../../services/HistoryService";

interface NavigationPromptProps {
  when: boolean;
}

interface NavigationPromptState {
  promptState: "hidden" | "show" | "approved";
  calls: number;
}

export default class NavigationPrompt extends Component<
  NavigationPromptProps,
  NavigationPromptState
> {
  state: NavigationPromptState = {
    promptState: "hidden",
    calls: 0,
  };

  constructor(props: NavigationPromptProps, context: any) {
    super(props, context);
  }

  componentDidMount(): void {
    console.log("mounted");
    const unblock = HistoryService.history.block(tx => {
      this.setState(prev => ({ ...prev, calls: prev.calls + 1 }));
      if (!this.props.when || window.confirm(i18n.t("block_leaving"))) {
        console.log("Not blocked");
        console.log(this.state.calls);
        unblock();
      }
    });
  }

  componentWillUnmount(): void {
    console.log("unmounted");
  }

  render() {
    return null;
  }
}
