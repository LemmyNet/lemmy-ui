import { Component, InfernoNode } from "inferno";
import { NoOptionI18nKeys } from "i18next";
import { NoResultsIndicator } from "./no-results-indicator";

export interface ListViewProps<T> {
  items: T[] | undefined;
  renderItem: (item: T, index: number) => InfernoNode;
  emptyIcon: string;
  emptyTranslationKey: NoOptionI18nKeys;
  loading?: boolean;
  loadingNode?: InfernoNode;
}

export class ListView<T> extends Component<ListViewProps<T>> {
  render() {
    const {
      items,
      renderItem,
      emptyIcon,
      emptyTranslationKey,
      loading,
      loadingNode,
    } = this.props;

    if (loading) {
      return loadingNode || null;
    }

    if (!items || items.length === 0) {
      return (
        <NoResultsIndicator
          icon={emptyIcon}
          translationKey={emptyTranslationKey}
        />
      );
    }

    return <div>{items.map((item, index) => renderItem(item, index))}</div>;
  }
}
