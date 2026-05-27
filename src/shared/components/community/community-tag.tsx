import { tagColorToColorClass } from "@components/common/tag-color-dropdown";
import { CommunityTag as CommunityTagI } from "lemmy-js-client";

type CommunityTagProps = {
  tag: CommunityTagI;
  useName: boolean;
};
export function CommunityTag({ tag, useName }: CommunityTagProps) {
  const { name, summary, color } = tag;
  const label = useName ? name : communityTagName(tag);

  const summaryStr = summary ? ` - ${summary}` : "";
  const tooltip = `${name}${summaryStr}`;
  const colorClass = tagColorToColorClass(color);

  return (
    <span
      className={`badge text-bg-${colorClass}`}
      aria-label={tooltip}
      data-tippy-content={tooltip}
      data-tippy-allowHTML
    >
      {label}
    </span>
  );
}

export function communityTagName(tag: CommunityTagI): string {
  return tag.display_name ?? tag.name;
}
