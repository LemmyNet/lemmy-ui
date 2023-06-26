import { Component } from "inferno";
import { I18NextService } from "../../services";

export interface IPromptProps {
  when: boolean;
}

export default class NavigationPrompt extends Component<IPromptProps, any> {
  public unblock;

  public enable() {
    if (this.unblock) {
      this.unblock();
    }

    this.unblock = this.context.router.history.block(tx => {
      if (window.confirm(I18NextService.i18n.t("block_leaving") ?? undefined)) {
        this.unblock();
        tx.retry();
      }
    });
  }

  public disable() {
    if (this.unblock) {
      this.unblock();
      this.unblock = null;
    }
  }
  public componentWillMount() {
    if (this.props.when) {
      this.enable();
    }
  }

  public componentWillReceiveProps(nextProps: IPromptProps) {
    if (nextProps.when) {
      if (!this.props.when) {
        this.enable();
      }
    } else {
      this.disable();
    }
  }

  public componentWillUnmount() {
    this.disable();
  }

  public render() {
    return null;
  }
}
