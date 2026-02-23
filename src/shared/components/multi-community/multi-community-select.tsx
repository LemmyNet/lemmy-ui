import { debounce, getIdFromString, hostname } from "@utils/helpers";
import { Component } from "inferno";
import {
  PagedResponse,
  MyUserInfo,
  MultiCommunityId,
  MultiCommunityView,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { fetchSearchResults } from "@utils/app";
import { tippyMixin } from "../mixins/tippy-mixin";
import { EMPTY_REQUEST, RequestState } from "@services/HttpService";
import { SearchableSelect } from "@components/common/searchable-select";
import { Choice } from "@utils/types";
import { isBrowser } from "@utils/browser";

interface Props {
  myUserInfo: MyUserInfo | undefined;
  onSelect: (id: MultiCommunityId) => void;
  value?: MultiCommunityId;
}

interface State {
  listMultiCommunitiesRes: RequestState<PagedResponse<MultiCommunityView>>;
  selectedMultiCommunity?: MultiCommunityView;
  multiCommunitySearchOptions: Choice[];
  multiCommunitySearchLoading: boolean;
}

@tippyMixin
export class MultiCommunitySelect extends Component<Props, State> {
  state: State = {
    listMultiCommunitiesRes: EMPTY_REQUEST,
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
      <SearchableSelect
        id="multi-community-select"
        value={this.props.value}
        options={[
          {
            label: I18NextService.i18n.t("none"),
            value: "0",
            disabled: false,
          } as Choice,
        ].concat(this.state.multiCommunitySearchOptions)}
        loading={this.state.multiCommunitySearchLoading}
        onChange={choice => handleMultiCommunitySelect(this, choice)}
        onSearch={res => handleMultiCommunitySearch(this, res, false)}
      />
    );
  }
}

function handleMultiCommunitySelect(i: MultiCommunitySelect, choice: Choice) {
  const multiCommunityId = getIdFromString(choice.value);
  i.props.onSelect(multiCommunityId ?? 0);
  updateLabel(i, multiCommunityId);
}

function updateLabel(
  i: MultiCommunitySelect,
  multiCommunityId?: MultiCommunityId,
) {
  const res = i.state.listMultiCommunitiesRes;
  const selected =
    res.state === "success" &&
    res.data.items.find(i => i.multi.id === multiCommunityId);
  if (selected) {
    i.setState({ selectedMultiCommunity: selected });
  }
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
  async (i: MultiCommunitySelect, text: string, initial_load: boolean) => {
    i.setState({ multiCommunitySearchLoading: true });

    const newOptions: Choice[] = [];

    if (text.length > 0 || initial_load) {
      newOptions.push(
        ...(await fetchMultiCommunities(text)).map(multiCommunityToChoice),
      );

      i.setState({
        multiCommunitySearchOptions: newOptions,
      });
      updateLabel(i, i.props.value);
    }

    i.setState({
      multiCommunitySearchLoading: false,
    });
  },
);
