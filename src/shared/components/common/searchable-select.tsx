import type { Choice as Option } from "choices.js";
import classNames from "classnames";
import {
  ChangeEvent,
  Component,
  createRef,
  linkEvent,
  RefObject,
} from "inferno";
import { i18n } from "../../i18next";

interface SearchableSelectProps {
  id: string;
  value?: number | string;
  options: Option[];
  onChange?: (option: Option) => void;
  onSearch?: (text: string) => void;
  loading?: boolean;
}

interface SearchableSelectState {
  selectedIndex: number;
  searchText: string;
  loadingEllipses: string;
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

export class SearchableSelect extends Component<
  SearchableSelectProps,
  SearchableSelectState
> {
  private searchInputRef: RefObject<HTMLInputElement> = createRef();
  private toggleButtonRef: RefObject<HTMLButtonElement> = createRef();
  private loadingEllipsesInterval?: NodeJS.Timer = undefined;

  state: SearchableSelectState = {
    selectedIndex: 0,
    searchText: "",
    loadingEllipses: "...",
  };

  constructor(props: SearchableSelectProps, context: any) {
    super(props, context);

    this.handleChange = this.handleChange.bind(this);
    this.focusSearch = this.focusSearch.bind(this);

    if (props.value) {
      let selectedIndex = props.options.findIndex(
        ({ value }) => value === props.value
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
    const { searchText, selectedIndex, loadingEllipses } = this.state;

    return (
      <div className="dropdown">
        <button
          id={id}
          type="button"
          className="custom-select text-start"
          aria-haspopup="listbox"
          data-bs-toggle="dropdown"
          onClick={this.focusSearch}
        >
          {loading ? `Loading${loadingEllipses}` : options[selectedIndex].label}
        </button>
        <div
          role="combobox"
          aria-activedescendant={options[selectedIndex].label}
          className="modlog-choices-font-size dropdown-menu w-100"
        >
          <div className="input-group p-2">
            <input
              type="text"
              className="form-control"
              ref={this.searchInputRef}
              onInput={linkEvent(this, handleSearch)}
              value={searchText}
              placeholder={`${i18n.t("search")}...`}
            />
          </div>
          {!loading &&
            // If onSearch is provided, it is assumed that the parent component is doing it's own sorting logic.
            (onSearch || searchText.length === 0
              ? options
              : options.filter(({ label }) =>
                  label.toLowerCase().includes(searchText.toLowerCase())
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
                onClick={() => this.handleChange(option)}
              >
                {option.label}
              </button>
            ))}
        </div>
      </div>
    );
  }

  focusSearch() {
    if (this.toggleButtonRef.current?.ariaExpanded !== "true") {
      this.searchInputRef.current?.focus();
    }
  }

  static getDerivedStateFromProps({
    value,
    options,
  }: SearchableSelectProps): Partial<SearchableSelectState> {
    let selectedIndex =
      value || value === 0
        ? options.findIndex(option => option.value === value)
        : 0;

    if (selectedIndex < 0) {
      selectedIndex = 0;
    }

    return {
      selectedIndex,
    };
  }

  componentDidUpdate() {
    const { loading } = this.props;
    if (loading && !this.loadingEllipsesInterval) {
      this.loadingEllipsesInterval = setInterval(() => {
        this.setState(({ loadingEllipses }) => ({
          loadingEllipses:
            loadingEllipses.length === 3 ? "" : loadingEllipses + ".",
        }));
      }, 750);
    } else if (!loading && this.loadingEllipsesInterval) {
      clearInterval(this.loadingEllipsesInterval);
    }
  }

  componentWillUnmount() {
    if (this.loadingEllipsesInterval) {
      clearInterval(this.loadingEllipsesInterval);
    }
  }

  handleChange(option: Option) {
    const { onChange, value } = this.props;

    if (option.value !== value) {
      if (onChange) {
        onChange(option);
      }

      this.setState({ searchText: "" });
    }
  }
}
