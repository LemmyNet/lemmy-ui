import { Choice } from "@utils/types";
import classNames from "classnames";
import {
  ChangeEvent,
  Component,
  createRef,
  linkEvent,
  RefObject,
} from "inferno";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "./icon";
import { LoadingEllipses } from "./loading-ellipses";

interface SearchableSelectProps {
  id: string;
  value?: number | string;
  options: Choice[];
  onChange?: (option: Choice) => void;
  onSearch?: (text: string) => void;
  loading?: boolean;
}

interface SearchableSelectState {
  selectedIndex: number;
  searchText: string;
}

function handleSearch(i: SearchableSelect, e: ChangeEvent<HTMLInputElement>) {
  const { onSearch } = i.props;
  const searchText = e.target.value;

  if (onSearch) {
    onSearch(searchText);
  }

  i.setState({
    searchText,
  });
}

function focusSearch(i: SearchableSelect) {
  if (i.toggleButtonRef.current?.ariaExpanded !== "true") {
    i.searchInputRef.current?.focus();

    if (i.props.onSearch) {
      i.props.onSearch("");
    }

    i.setState({
      searchText: "",
    });
  }
}

function handleChange({ option, i }: { option: Choice; i: SearchableSelect }) {
  const { onChange, value } = i.props;

  if (option.value !== value?.toString()) {
    if (onChange) {
      onChange(option);
    }

    i.setState({ searchText: "" });
  }
}

export class SearchableSelect extends Component<
  SearchableSelectProps,
  SearchableSelectState
> {
  searchInputRef: RefObject<HTMLInputElement> = createRef();
  toggleButtonRef: RefObject<HTMLButtonElement> = createRef();

  state: SearchableSelectState = {
    selectedIndex: 0,
    searchText: "",
  };

  constructor(props: SearchableSelectProps, context: any) {
    super(props, context);

    if (props.value) {
      let selectedIndex = props.options.findIndex(
        ({ value }) => value === props.value?.toString(),
      );

      if (selectedIndex < 0) {
        selectedIndex = 0;
      }

      this.state = {
        ...this.state,
        selectedIndex,
      };
    }
  }

  render() {
    const { id, options, onSearch, loading } = this.props;
    const { searchText, selectedIndex } = this.state;

    return (
      <div className="searchable-select dropdown col-12 col-sm-auto flex-grow-1">
        <button
          id={id}
          type="button"
          role="combobox"
          className="form-select d-inline-block text-start"
          aria-haspopup="listbox"
          aria-controls="searchable-select-input"
          aria-activedescendant={options[selectedIndex].label}
          aria-expanded={false}
          data-bs-toggle="dropdown"
          onClick={linkEvent(this, focusSearch)}
          ref={this.toggleButtonRef}
        >
          {loading ? (
            <>
              {I18NextService.i18n.t("loading")}
              <LoadingEllipses />
            </>
          ) : (
            options[selectedIndex].label
          )}
        </button>
        <div className="modlog-choices-font-size dropdown-menu w-100 p-2">
          <div className="input-group">
            <span className="input-group-text">
              {loading ? <Spinner /> : <Icon icon="search" />}
            </span>
            <input
              type="text"
              id="searchable-select-input"
              className="form-control"
              ref={this.searchInputRef}
              onInput={linkEvent(this, handleSearch)}
              value={searchText}
              placeholder={`${I18NextService.i18n.t("search")}...`}
            />
          </div>
          {!loading &&
            // If onSearch is provided, it is assumed that the parent component is doing it's own sorting logic.
            (onSearch || searchText.length === 0
              ? options
              : options.filter(({ label }) =>
                  label.toLowerCase().includes(searchText.toLowerCase()),
                )
            ).map((option, index) => (
              <button
                key={option.value}
                className={classNames("dropdown-item", {
                  active: selectedIndex === index,
                })}
                role="option"
                aria-disabled={option.disabled}
                disabled={option.disabled}
                aria-selected={selectedIndex === index}
                onClick={linkEvent({ i: this, option }, handleChange)}
                type="button"
              >
                {option.label}
              </button>
            ))}
        </div>
      </div>
    );
  }

  static getDerivedStateFromProps({
    value,
    options,
  }: SearchableSelectProps): Partial<SearchableSelectState> {
    let selectedIndex =
      value || value === 0
        ? options.findIndex(option => option.value === value.toString())
        : 0;

    if (selectedIndex < 0) {
      selectedIndex = 0;
    }

    return {
      selectedIndex,
    };
  }
}
