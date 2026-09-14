import { Component, InfernoNode } from "inferno";
import { NoOptionI18nKeys } from "i18next";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { RequestState } from "lemmy-js-client";

export interface ListViewProps<T> {
  state?: RequestState<{ items: T[] }>;
  items?: T[];
  renderItem: (item: T, index: number) => InfernoNode;
  emptyIcon: string;
  emptyTranslationKey: NoOptionI18nKeys;
  loadingNode?: InfernoNode;
}

function NoResults({
  icon,
  translationKey,
}: {
  icon: string;
  translationKey: NoOptionI18nKeys;
}) {
  return (
    <div className="d-flex flex-column fl-1 align-items-center justify-content-center gap-2 text-center">
      <Icon icon={icon} classes="fs-1 text-muted" />
      <div className="fw-medium text-body fs-5">
        {I18NextService.i18n.t(translationKey)}
      </div>
    </div>
  );
}

export class ListView<T> extends Component<ListViewProps<T>> {
  render() {
    const {
      state,
      items,
      renderItem,
      emptyIcon,
      emptyTranslationKey,
      loadingNode,
    } = this.props;

    if (state) {
      if (state.state === "loading") {
        return loadingNode || null;
      }
      if (state.state !== "success" || !state.data.items.length) {
        return (
          <NoResults icon={emptyIcon} translationKey={emptyTranslationKey} />
        );
      }
      return (
        <div>
          {state.data.items.map((item, index) => renderItem(item, index))}
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <NoResults icon={emptyIcon} translationKey={emptyTranslationKey} />
      );
    }

    return <div>{items.map((item, index) => renderItem(item, index))}</div>;
  }
}
