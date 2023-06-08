import { Component } from "inferno";
import { i18n } from "../../i18next";
import { HistoryService } from "../../services/HistoryService";

interface NavigationPromptProps {
  when: boolean;
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
    const unblock = HistoryService.history.block(({ retry }) => {
      if (!this.props.when || window.confirm(i18n.t("block_leaving"))) {
        unblock();

        retry();
      }
    });
  }

  render() {
    return null;
  }
}
