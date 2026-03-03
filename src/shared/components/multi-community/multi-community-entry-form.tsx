import { debounce, getIdFromString, randomStr } from "@utils/helpers";
import { Component } from "inferno";
import {
  CommunityId,
  CommunityView,
  PagedResponse,
  MyUserInfo,
} from "lemmy-js-client";
import {
  communityToChoice,
  fetchCommunities,
  filterCommunitySelection,
} from "@utils/app";
import { tippyMixin } from "../mixins/tippy-mixin";
import { EMPTY_REQUEST, RequestState } from "@services/HttpService";
import { Choice } from "@utils/types";
import { CommunityLink } from "@components/community/community-link";
import { Icon } from "@components/common/icon";
import { FilterChipSelect } from "@components/common/filter-chip-select";

interface Props {
  currentCommunities: CommunityView[];
  myUserInfo: MyUserInfo | undefined;
  onCreate: (id: CommunityId) => void;
}

interface State {
  listCommunitiesRes: RequestState<PagedResponse<CommunityView>>;
  selectedCommunity?: CommunityView;
  communitySearchOptions: Choice[];
  communitySearchLoading: boolean;
}

@tippyMixin
export class MultiCommunityEntryForm extends Component<Props, State> {
  state: State = {
    listCommunitiesRes: EMPTY_REQUEST,
    communitySearchOptions: [],
    communitySearchLoading: false,
  };

  render() {
    const id = randomStr();

    return (
      <div className={`multi-community-entry-form-${id}`}>
        <div className="row">
          <div className="col-12">
            <FilterChipSelect
              label={"add_community"}
              multiple={false}
              allOptions={this.state.communitySearchOptions}
              selectedOptions={
                this.state.selectedCommunity
                  ? [this.state.selectedCommunity.community.id.toString()]
                  : []
              }
              onSelect={choices => handleCommunitySelect(this, choices)}
              onSearch={res => handleCommunitySearch(this, res)}
            />
          </div>
        </div>
      </div>
    );
  }
}

function handleCommunitySelect(i: MultiCommunityEntryForm, choices: Choice[]) {
  const communityId = getIdFromString(choices[0].value);
  if (communityId) {
    i.props.onCreate(communityId);
  }
}

const handleCommunitySearch = debounce(
  async (i: MultiCommunityEntryForm, text: string) => {
    i.setState({ communitySearchLoading: true });

    const newOptions: Choice[] = [];

    if (text.length > 0) {
      newOptions.push(
        ...filterCommunitySelection(
          await fetchCommunities(text),
          i.props.myUserInfo,
        )
          // Filter out currently selected comms
          .filter(
            c =>
              !i.props.currentCommunities
                .map(cc => cc.community.id)
                .includes(c.community.id),
          )
          .map(communityToChoice),
      );

      i.setState({
        communitySearchOptions: newOptions,
      });
    }

    i.setState({
      communitySearchLoading: false,
    });
  },
);

interface MultiCommunityEntryListProps {
  communities: CommunityView[];
  isCreator: boolean;
  onDelete?: (communityId: CommunityId) => void;
  myUserInfo: MyUserInfo | undefined;
}

export function MultiCommunityEntryList({
  communities,
  isCreator,
  onDelete,
  myUserInfo,
}: MultiCommunityEntryListProps) {
  return (
    communities.length > 0 && (
      <div id="multi-community-entry-table">
        {communities.map(c => (
          <>
            <div
              key={`multi-community-entry-${c.community.id}`}
              className="row"
            >
              <div className="col-12">
                <CommunityLink
                  community={c.community}
                  myUserInfo={myUserInfo}
                />
                {isCreator && onDelete && (
                  <button
                    className="btn btn-sm btn-link"
                    onClick={() => onDelete?.(c.community.id)}
                  >
                    <Icon icon={"x"} classes="icon-inline text-danger" />
                  </button>
                )}
              </div>
            </div>
          </>
        ))}
      </div>
    )
  );
}
