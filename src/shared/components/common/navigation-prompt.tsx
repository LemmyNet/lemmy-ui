import { Component } from "inferno";
import { i18n } from "../../i18next";
import { HistoryService } from "../../services/HistoryService";

interface NavigationPromptProps {
  when: boolean;
  suppress?: boolean;
}

interface NavigationPromptState {
  promptState: "hidden" | "show" | "approved";
}

export default class NavigationPrompt extends Component<
  NavigationPromptProps,
  NavigationPromptState
> {
  state: NavigationPromptState = {
    promptState: "hidden",
  };

  constructor(props: NavigationPromptProps, context: any) {
    super(props, context);
  }

  componentDidMount(): void {
    if (!this.props.suppress) {
      const unblock = HistoryService.history.block(tx => {
        if (!this.props.when || window.confirm(i18n.t("block_leaving"))) {
          unblock();

          tx.retry();
        }
      });
    }
  }

  componentWillUnmount(): void {
    console.log("unmounted");
  }

  render() {
    return null;
  }
}
