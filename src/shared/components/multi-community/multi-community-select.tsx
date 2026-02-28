import { debounce, hostname } from "@utils/helpers";
import { Component } from "inferno";
import { MultiCommunityId, MultiCommunityView } from "lemmy-js-client";
import { fetchSearchResults } from "@utils/app";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Choice } from "@utils/types";
import { isBrowser } from "@utils/browser";
import { FilterChipSelect } from "@components/common/filter-chip-select";
import { I18NextService } from "@services/I18NextService";

interface Props {
  onSelect: (id: MultiCommunityId) => void;
  value?: MultiCommunityId;
}

interface State {
  multiCommunitySearchOptions: Choice[];
  multiCommunitySearchLoading: boolean;
}

@tippyMixin
export class MultiCommunitySelect extends Component<Props, State> {
  state: State = {
    multiCommunitySearchOptions: [],
    multiCommunitySearchLoading: false,
  };

  async componentWillMount() {
    if (isBrowser()) {
      await handleMultiCommunitySearch(this, "", true);
    }
  }

  render() {
    return (
      <FilterChipSelect
        label={"suggested_multi_community"}
        multiple={false}
        allOptions={this.state.multiCommunitySearchOptions}
        selectedOptions={[(this.props.value ?? 0).toString()]}
        onSelect={choice => handleMultiCommunitySelect(this, choice)}
        onSearch={res => handleMultiCommunitySearch(this, res, false)}
      />
    );
  }
}

function handleMultiCommunitySelect(
  i: MultiCommunitySelect,
  choices: Choice[],
) {
  const multiCommunityId = choices[0].value;
  i.props.onSelect(Number(multiCommunityId));
}

async function fetchMultiCommunities(q: string) {
  const res = await fetchSearchResults(q, "multi_communities");

  return res.state === "success"
    ? res.data.search.filter(s => s.type_ === "multi_community")
    : [];
}

function multiCommunityToChoice(m: MultiCommunityView): Choice {
  return {
    value: m.multi.id.toString(),
    label: communitySelectName(m),
  };
}

function communitySelectName(m: MultiCommunityView): string {
  return m.multi.local
    ? (m.multi.title ?? m.multi.name)
    : `!${m.multi.title}@${hostname(m.multi.ap_id)}`;
}

const handleMultiCommunitySearch = debounce(
  async (i: MultiCommunitySelect, text: string, initialLoad: boolean) => {
    i.setState({ multiCommunitySearchLoading: true });

    const newOptions: Choice[] = [];

    if (text.length > 0 || initialLoad) {
      newOptions.push(
        { label: I18NextService.i18n.t("none"), value: "0" },
        ...(await fetchMultiCommunities(text)).map(multiCommunityToChoice),
      );

      i.setState({
        multiCommunitySearchOptions: newOptions,
      });
    }

    i.setState({
      multiCommunitySearchLoading: false,
    });
  },
);
