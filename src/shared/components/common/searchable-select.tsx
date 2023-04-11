import classNames from "classnames";
import {
  ChangeEvent,
  Component,
  createRef,
  linkEvent,
  RefObject,
} from "inferno";
import { i18n } from "../../i18next";
import { Choice } from "../../utils";
import { Icon, Spinner } from "./icon";

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
        ({ value }) => value === props.value?.toString()
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
          {loading
            ? `${i18n.t("loading")}${loadingEllipses}`
            : options[selectedIndex].label}
        </button>
        <div
          role="combobox"
          aria-activedescendant={options[selectedIndex].label}
          className="modlog-choices-font-size dropdown-menu w-100"
        >
          <div className="input-group p-2">
            <span className="input-group-text">
              {loading ? <Spinner /> : <Icon icon="search" />}
            </span>
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

      if (this.props.onSearch) {
        this.props.onSearch("");
      }

      this.setState({
        searchText: "",
      });
    }
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

  handleChange(option: Choice) {
    const { onChange, value } = this.props;

    if (option.value !== value?.toString()) {
      if (onChange) {
        onChange(option);
      }

      this.setState({ searchText: "" });
    }
  }
}
