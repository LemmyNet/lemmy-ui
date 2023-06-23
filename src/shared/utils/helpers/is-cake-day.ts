import moment from "moment";

moment.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "<1m",
    ss: "%ds",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "1d",
    dd: "%dd",
    w: "1w",
    ww: "%dw",
    M: "1M",
    MM: "%dM",
    y: "1Y",
    yy: "%dY",
  },
});

export default function isCakeDay(published: string): boolean {
  const createDate = moment.utc(published).local();
  const currentDate = moment(new Date());

  return (
    createDate.date() === currentDate.date() &&
    createDate.month() === currentDate.month() &&
    createDate.year() !== currentDate.year()
  );
}
