export default function getRoleLabelPill({
  label,
  tooltip,
  classes,
  shrink = true,
}: {
  label: string;
  tooltip: string;
  classes?: string;
  shrink?: boolean;
}) {
  return (
    <span
      className={`badge me-1 ${classes ?? "text-bg-light"}`}
      aria-label={tooltip}
      data-tippy-content={tooltip}
    >
      {shrink ? label[0].toUpperCase() : label}
    </span>
  );
}
