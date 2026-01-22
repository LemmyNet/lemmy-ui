import { RoleLabelPill } from "@components/common/user-badges";
import { Tag } from "lemmy-js-client";

type CommunityTagProps = {
  tag: Tag;
  useName: boolean;
};
export function CommunityTag({ tag, useName }: CommunityTagProps) {
  const label = useName ? tag.name : (tag.display_name ?? tag.name);
  const tooltip = tag.name;

  return <RoleLabelPill label={label} tooltip={tooltip} />;
}
