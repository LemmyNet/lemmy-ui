import { NoOptionI18nKeys } from "i18next";
import { dedupByProperty, randomStr } from "@utils/helpers";
import { Component, FormEvent, InfernoNode } from "inferno";
import Choices from "choices.js/public/types/src/scripts/choices";
import { Choice } from "@utils/types";
import { I18NextService } from "@services/I18NextService";

type Props = {
  allOptions: Choice[];
  selectedOptions: string[];
  multiple: boolean;
  label?: NoOptionI18nKeys;
  className?: string;
  disabled?: boolean;
  onSelect: (val: Choice[]) => void;
  onSearch?: (val: string) => void;
};

type State = {
  id: string;
  choices: Choices | undefined;
};

export class FilterChipSelect extends Component<Props, State> {
  state: State = {
    choices: undefined,
    id: `filter-chip-select-${randomStr()}`,
  };

  async componentDidMount() {
    // Only load choices on first mount
    const Choices = (await import("choices.js")).default;
    const element = document.querySelector("#" + this.state.id);
    if (element) {
      const choices = new Choices(element, {
        choices: buildChoices(
          this.props.allOptions,
          this.props.selectedOptions,
        ),
        placeholderValue: this.props.label
          ? I18NextService.i18n.t(this.props.label)
          : undefined,
        shouldSort: false,
        removeItemButton: true,
        itemSelectText: "",
        removeItemIconText: () => (this.props.multiple ? `x` : ""),
        noChoicesText: I18NextService.i18n.t("no_results"),
        noResultsText: I18NextService.i18n.t("none_found"),
        classNames: {
          containerOuter: [
            "choices",
            // "w-auto",
            // "d-inline-block",
          ],
          containerInner: [
            // "choices__inner",
            "form-select",
            "form-select-sm",
            "bg-light",
            "border-light-subtle",
            "no-caret",
            // These classes ended up not working
            // "btn",
            // "btn-light",
            // "btn-sm",
            // "border-light-subtle",
            // "w-auto",
            // "d-inline-block",
          ],
          input: ["choices__input"],
          inputCloned: ["choices__input--cloned"],
          list: ["choices__list"],
          listItems: ["choices__list--multiple"],
          listSingle: ["choices__list--single", "p-0"],
          listDropdown: ["choices__list--dropdown"],
          item: ["choices__item"],
          itemSelectable: ["choices__item--selectable"],
          itemDisabled: ["choices__item--disabled"],
          itemChoice: ["choices__item--choice"],
          description: ["choices__description"],
          placeholder: ["choices__placeholder", "opacity-100"],
          group: ["choices__group"],
          groupHeading: ["choices__heading"],
          button: ["btn", "btn-sm"],
          activeState: ["is-active"],
          focusState: ["is-focused"],
          openState: ["is-open", "p-absolute"],
          disabledState: ["is-disabled"],
          highlightedState: ["is-highlighted"],
          selectedState: ["is-selected"],
          flippedState: ["is-flipped"],
          loadingState: ["is-loading"],
          notice: ["choices__notice"],
          addChoice: ["choices__item--selectable", "add-choice"],
          noResults: ["has-no-results"],
          noChoices: ["has-no-choices"],
        },
      });

      this.setState({ choices });

      // If its searchable, add the search event
      if (this.props.onSearch) {
        element.addEventListener("search", (e: any) => {
          const searchText: string = e.detail.value;
          this.props.onSearch?.(searchText);
        });
      }
    }
  }

  async componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>,
  ) {
    // For searching, clear the existing choices
    if (this.state.choices && nextProps.onSearch) {
      this.state.choices.clearChoices(true, true);
      await this.state.choices.setChoices(
        buildChoices(nextProps.allOptions, nextProps.selectedOptions),
      );
    }
  }

  render() {
    return (
      <select
        id={this.state.id}
        multiple={this.props.multiple}
        disabled={this.props.disabled}
        onChange={e => handleSelect(this, e)}
      ></select>
    );
  }
}

/**
 * De-dupes the choices, and sets the selected ones.
 **/
function buildChoices(
  allOptions: Choice[],
  selectedOptions: string[],
): Choice[] {
  const newChoices = dedupByProperty(allOptions, option => option.value);
  newChoices.forEach(o => (o.selected = selectedOptions.includes(o.value)));

  return newChoices;
}

function handleSelect(i: FilterChipSelect, e: FormEvent<HTMLSelectElement>) {
  const options: HTMLOptionElement[] = Array.from(e.target.options);

  const selectedVals = options.filter(o => o.selected).map(o => o.value);
  const selected = i.props.allOptions.filter(o =>
    selectedVals.includes(o.value),
  );

  i.props.onSelect(selected);
}
