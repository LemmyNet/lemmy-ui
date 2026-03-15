import { Component, FormEvent } from "inferno";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

export type IntervalUnit = NoOptionI18nKeys &
  ("seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years");

export type Interval = {
  num: number;
  unit: IntervalUnit;
};

const intervalRegex = /^(?<num>[0-9.]+)(?<unit>[^0-9]+)$/;

export function intervalFromQuery(query: `${number}${IntervalUnit}`): Interval {
  const { groups: { num, unit } = { ...ALL_TIME_INTERVAL } } =
    intervalRegex.exec(query) ?? {};
  return { num: Number(num), unit: unit as IntervalUnit };
}

export function intervalToQuery(interval: Interval) {
  return `${interval.num}${interval.unit}`;
}

export function intervalToSeconds(interval: Interval): number {
  const num = interval.num ?? 0;
  const mult = conversions.find(t => t.unit === interval.unit)?.num ?? 1;
  const secs = num * mult;
  return secs;
}

type Props = {
  interval: Interval;
  onChange: (interval: Interval) => void;
};

export const ALL_TIME_INTERVAL: Interval = { unit: "days", num: 0 };

type TimePreset = {
  label: /* FIXME: i18n */ string;
  interval: Interval;
};

export const TIME_RANGE_PRESETS: TimePreset[] = [
  { label: "All time", interval: { ...ALL_TIME_INTERVAL } },
  { label: "60 Seconds", interval: { num: 60, unit: "seconds" } },
  { label: "30 Minutes", interval: { num: 30, unit: "minutes" } },
  { label: "1 Hour", interval: { num: 1, unit: "hours" } },
  { label: "6 Hours", interval: { num: 6, unit: "hours" } },
  { label: "12 Hours", interval: { num: 12, unit: "hours" } },
  { label: "1 Day", interval: { num: 1, unit: "days" } },
  { label: "1 Week", interval: { num: 1, unit: "weeks" } },
  { label: "1 Month", interval: { num: 1, unit: "months" } },
  { label: "3 Months", interval: { num: 3, unit: "months" } },
  { label: "6 Months", interval: { num: 6, unit: "months" } },
  { label: "1 Year", interval: { num: 1, unit: "years" } },
];

export class TimeIntervalFilter extends Component<Props, never> {
  render() {
    const { num, unit } = this.props.interval;

    // TODO: aria representation is weird
    return (
      <div className="input-group input-group-sm">
        <input
          type="number"
          className="form-control interval-filter-input border-light-subtle"
          aria-label={I18NextService.i18n.t("time_interval")}
          value={num}
          onInput={e => handleTimeIntervalNumChange(this, e)}
        />
        <button
          className="btn btn-light border-light-subtle dropdown-toggle"
          data-tippy-content={I18NextService.i18n.t("time_interval")}
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-controls="time-interval-unit-dropdown"
          aria-label={I18NextService.i18n.t("time_unit")}
        >
          {I18NextService.i18n.t(unit)}
        </button>
        <ul
          className="dropdown-menu dropdown-menu-end"
          id="time-interval-unit-dropdown"
        >
          <li>
            <button className="dropdown-item disabled" aria-disabled="true">
              {I18NextService.i18n.t("custom_time")}
            </button>
          </li>
          {TIME_RANGE_PRESETS.map(({ interval, label }) => (
            <li>
              <button
                className="dropdown-item"
                onClick={() => this.props.onChange(interval)}
              >
                {/* FIXME: i18n */ label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

function handleTimeIntervalNumChange(
  i: TimeIntervalFilter,
  event: FormEvent<HTMLInputElement>,
) {
  i.props.onChange({
    num: Number(event.target.value),
    unit: i.props.interval.unit,
  });
}

const conversions: Interval[] = [
  { num: 1, unit: "seconds" },
  { num: 60, unit: "minutes" },
  { num: 60 * 60, unit: "hours" },
  { num: 60 * 60 * 24, unit: "days" },
  { num: 60 * 60 * 24 * 7, unit: "weeks" },
  { num: 60 * 60 * 24 * 31, unit: "months" },
  { num: 60 * 60 * 24 * 365, unit: "years" },
];

// Taken from https://stackoverflow.com/questions/70805666/how-to-convert-seconds-to-biggest-significative-time-unit
export function secondsToLargestInterval(
  seconds?: number,
): Interval | undefined {
  if (seconds === undefined) {
    return undefined;
  }
  let bestInterval = conversions[0];
  for (const interval of conversions) {
    if (seconds >= (interval.num ?? 1)) {
      bestInterval = interval;
    }
  }
  return {
    num: Math.floor(seconds / (bestInterval.num ?? 1)),
    unit: bestInterval.unit,
  };
}
