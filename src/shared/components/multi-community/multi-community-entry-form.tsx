import { debounce, getIdFromString, randomStr } from "@utils/helpers";
import { Component } from "inferno";
import {
  CommunityId,
  CommunityView,
  ListCommunitiesResponse,
  MyUserInfo,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import {
  communityToChoice,
  fetchCommunities,
  filterCommunitySelection,
} from "@utils/app";
import { tippyMixin } from "../mixins/tippy-mixin";
import { EMPTY_REQUEST, RequestState } from "@services/HttpService";
import { SearchableSelect } from "@components/common/searchable-select";
import { Choice } from "@utils/types";

interface Props {
  currentCommunities: CommunityView[];
  onCreate(id: CommunityId): void;
  myUserInfo: MyUserInfo | undefined;
}

interface State {
  listCommunitiesRes: RequestState<ListCommunitiesResponse>;
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

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const id = randomStr();

    return (
      <div className={`multi-community-entry-form-${id}`}>
        <div className="row">
          <div className="col-12">
            <SearchableSelect
              id="multi-community-entry-select"
              value={this.state.selectedCommunity?.community.id}
              options={[
                {
                  label: I18NextService.i18n.t("add_community"),
                  value: "",
                  disabled: true,
                } as Choice,
              ].concat(this.state.communitySearchOptions)}
              loading={this.state.communitySearchLoading}
              onChange={choice => handleCommunitySelect(this, choice)}
              onSearch={res => handleCommunitySearch(this, res)}
            />
          </div>
        </div>
      </div>
    );
  }
}

function handleCommunitySelect(i: MultiCommunityEntryForm, choice: Choice) {
  const communityId = getIdFromString(choice.value);
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
