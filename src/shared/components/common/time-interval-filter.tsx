import { Component } from "inferno";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";
import classNames from "classnames";
import { createRef } from "inferno";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

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

type State = { customInterval?: Interval };

export const ALL_TIME_INTERVAL: Interval = { unit: "days", num: 0 };

export const TIME_RANGE_PRESETS: Interval[] = [
  { ...ALL_TIME_INTERVAL },
  { num: 1, unit: "hours" },
  { num: 6, unit: "hours" },
  { num: 12, unit: "hours" },
  { num: 1, unit: "days" },
  { num: 1, unit: "weeks" },
  { num: 1, unit: "months" },
  { num: 3, unit: "months" },
  { num: 6, unit: "months" },
  { num: 1, unit: "years" },
];
const TIME_RANGE_UNITS = Array.from(
  new Set(TIME_RANGE_PRESETS.map(x => x.unit)).values(),
);
const TIME_RANGE_UNIT_OPTIONS: FilterOption<IntervalUnit>[] =
  TIME_RANGE_UNITS.map(u => ({ value: u, i18n: u }));

function presetLabel(interval: Interval): string {
  return interval.num === 0
    ? I18NextService.i18n.t("all_time")
    : I18NextService.i18n.t(`n_${interval.unit}`, {
        count: interval.num,
        formattedCount: interval.num,
      });
}

export class TimeIntervalFilter extends Component<Props, State> {
  state: State = {};
  buttonRef = createRef<HTMLButtonElement>();
  render() {
    const {
      interval,
      interval: { num, unit },
    } = this.props;

    const customInterval = this.state.customInterval ?? interval;

    const allOptions = TIME_RANGE_PRESETS.map((interval, index) => ({
      value: index.toString(),
      noI18n: presetLabel(interval),
      interval,
    }));
    const currentOption = allOptions.find(
      option => option.interval.num === num && option.interval.unit === unit,
    );

    return (
      <FilterChipDropdown
        buttonRef={this.buttonRef}
        label="time_filter"
        allOptions={allOptions}
        currentOption={currentOption}
        onSelect={value => {
          const selected = allOptions.find(
            option => option.value === value,
          )?.interval;
          if (selected) {
            handleIntervalChange(this, selected);
          }
        }}
        autoClose="outside"
        noCurrentText={I18NextService.i18n.t(`n_${unit}`, {
          count: num,
          formattedCount: num,
        })}
      >
        <div className={classNames("dropdown-header")}>
          {I18NextService.i18n.t("custom_time")}
        </div>
        <div className="dropdown-item-text">
          <form method="dialog" className="input-group flex-nowrap">
            <input
              type="number"
              className="form-control form-control-sm border-light-subtle interval-filter-input"
              aria-label={I18NextService.i18n.t("time_interval")}
              onInput={e =>
                this.setState({
                  customInterval: {
                    num: Number(e.target.value),
                    unit: customInterval.unit,
                  },
                })
              }
              value={customInterval.num}
            />
            <FilterChipDropdown
              className="btn btn-sm btn-light border-light-subtle rounded-0"
              allOptions={TIME_RANGE_UNIT_OPTIONS}
              currentOption={{
                value: customInterval.unit,
                i18n: customInterval.unit,
              }}
              onSelect={option =>
                this.setState({
                  customInterval: { num: customInterval.num, unit: option },
                })
              }
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary border-light-subtle"
              onClick={() => handleIntervalChange(this, customInterval)}
            >
              {I18NextService.i18n.t("update")}
            </button>
          </form>
        </div>
      </FilterChipDropdown>
    );
  }
}

function handleIntervalChange(i: TimeIntervalFilter, interval: Interval) {
  if (i.buttonRef.current?.getAttribute("aria-expanded")) {
    i.buttonRef.current?.click();
  }
  i.setState({ customInterval: undefined });
  i.props.onChange(interval);
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
