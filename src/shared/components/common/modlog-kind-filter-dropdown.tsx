import { ModlogKindFilter } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<ModlogKindFilter>[] = [
  { value: "all", i18n: "all" },
  { value: "mod_remove_post", i18n: "removing_posts" },
  { value: "mod_lock_post", i18n: "locking_posts" },
  { value: "mod_lock_comment", i18n: "locking_comments" },
  { value: "mod_feature_post_community", i18n: "featuring_posts_in_community" },
  {
    value: "admin_feature_post_site",
    i18n: "featuring_posts_for_local_instance",
  },
  { value: "mod_remove_comment", i18n: "removing_comments" },
  { value: "admin_remove_community", i18n: "removing_communities" },
  { value: "admin_ban", i18n: "banning_from_site" },
  { value: "mod_ban_from_community", i18n: "banning_from_communities" },
  { value: "mod_add_to_community", i18n: "adding_mod_to_community" },
  { value: "mod_transfer_community", i18n: "transferring_communities" },
  {
    value: "mod_change_community_visibility",
    i18n: "changing_community_visibility",
  },
  { value: "admin_add", i18n: "adding_admin_to_site" },
  { value: "admin_block_instance", i18n: "blocking_a_federated_instance" },
  { value: "admin_allow_instance", i18n: "allowing_a_federated_instance" },
  { value: "admin_purge_person", i18n: "purging_a_person" },
  { value: "admin_purge_community", i18n: "purging_a_community" },
  { value: "admin_purge_post", i18n: "purging_a_post" },
  { value: "admin_purge_comment", i18n: "purging_a_comment" },
];

type ModlogKindFilterDropdownProps = {
  currentOption: ModlogKindFilter | undefined;
  onSelect: (val: ModlogKindFilter) => void;
  className?: string;
};
export function ModlogKindFilterDropdown({
  currentOption,
  onSelect,
  className,
}: ModlogKindFilterDropdownProps) {
  return (
    <FilterChipDropdown
      label={"type"}
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
