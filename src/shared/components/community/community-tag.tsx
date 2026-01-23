import { md } from "@utils/markdown";
import { Tag } from "lemmy-js-client";

type CommunityTagProps = {
  tag: Tag;
  useName: boolean;
};
export function CommunityTag({ tag, useName }: CommunityTagProps) {
  const label = useName ? tag.name : communityTagName(tag);
  const description = tag.description && md.renderInline(tag.description);
  const tooltip = `${tag.name}${description && ` - ${description}`}`;

  return (
    <span
      className={`badge text-bg-light"`}
      aria-label={tooltip}
      data-tippy-content={tooltip}
      data-tippy-allowHTML
    >
      {label}
    </span>
  );
}

export function communityTagName(tag: Tag): string {
  return tag.display_name ?? tag.name;
}
