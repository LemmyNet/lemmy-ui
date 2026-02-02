import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

type IntervalUnit = NoOptionI18nKeys &
  ("seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years");

type Interval = {
  num: number | undefined;
  unit: IntervalUnit;
};

type Preset = { key: NoOptionI18nKeys; interval: Interval };

const presets: Preset[] = [
  { key: "all_time", interval: { num: undefined, unit: "days" } },
  { key: "one_hour", interval: { num: 1, unit: "hours" } },
  { key: "six_hours", interval: { num: 6, unit: "hours" } },
  { key: "twelve_hours", interval: { num: 12, unit: "hours" } },
  { key: "one_day", interval: { num: 1, unit: "days" } },
  { key: "one_week", interval: { num: 1, unit: "weeks" } },
  { key: "one_month", interval: { num: 1, unit: "months" } },
  { key: "three_months", interval: { num: 3, unit: "months" } },
  { key: "six_months", interval: { num: 6, unit: "months" } },
  { key: "nine_months", interval: { num: 9, unit: "months" } },
  { key: "one_year", interval: { num: 1, unit: "years" } },
];

type Props = {
  onChange(seconds: number): void;
  currentSeconds: number | undefined;
};

type State = {
  interval: Interval;
};

export class TimeIntervalFilter extends Component<Props, State> {
  state: State = {
    interval: this.props.currentSeconds
      ? secondsToLargestInterval(this.props.currentSeconds)
      : { num: undefined, unit: "days" },
  };
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { num, unit } = this.state.interval;

    return (
      <div className="input-group input-group-sm">
        <input
          type="number"
          className="form-control interval-filter-input border-light-subtle"
          aria-label={I18NextService.i18n.t("time_interval")}
          value={num}
          onInput={linkEvent(this, handleTimeIntervalNumChange)}
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
          {/* Presets first, then the custom ones */}
          {presets.map(p => (
            <li>
              <button
                className="dropdown-item"
                onClick={() => handlePresetSelect(this, p)}
              >
                {I18NextService.i18n.t(p.key)}
              </button>
            </li>
          ))}
          <hr className="dropdown-divider" />
          <li>
            <button className="dropdown-item disabled" aria-disabled="true">
              {I18NextService.i18n.t("custom_time")}
            </button>
          </li>
          {conversions.map(({ unit }) => (
            <li>
              <button
                className="dropdown-item"
                onClick={() => handleTimeIntervalUnitChange(this, unit)}
              >
                {I18NextService.i18n.t(unit)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

function handleTimeIntervalNumChange(i: TimeIntervalFilter, event: any) {
  const interval = {
    num: Number(event.target.value),
    unit: i.state.interval.unit,
  };

  handleTimeIntervalChange(i, interval);
}

function handleTimeIntervalUnitChange(
  i: TimeIntervalFilter,
  unit: IntervalUnit,
) {
  const interval = { num: i.state.interval.num, unit };

  handleTimeIntervalChange(i, interval);
}

function handlePresetSelect(i: TimeIntervalFilter, preset: Preset) {
  const interval = preset.interval;

  handleTimeIntervalChange(i, interval);
}

function handleTimeIntervalChange(i: TimeIntervalFilter, interval: Interval) {
  i.setState({ interval });

  const num = interval.num ?? 0;
  const mult = conversions.find(t => t.unit === interval.unit)?.num ?? 1;
  const secs = num * mult;

  i.props.onChange(secs);
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
function secondsToLargestInterval(seconds: number): Interval {
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
