import { Tag } from "lemmy-js-client";

type CommunityTagProps = {
  tag: Tag;
  useName: boolean;
};
export function CommunityTag({ tag, useName }: CommunityTagProps) {
  const { name, description } = tag;
  const label = useName ? name : communityTagName(tag);

  const descriptionStr = description ? ` - ${description}` : "";
  const tooltip = `${name}${descriptionStr}`;

  return (
    <span
      className={`badge text-bg-light`}
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
