import { Component, FormEvent } from "inferno";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

type IntervalUnit = NoOptionI18nKeys &
  ("seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years");

type Interval = {
  num: number | undefined;
  unit: IntervalUnit;
};

type Props = {
  currentSeconds: number | undefined;
  onChange: (seconds: number) => void;
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

  render() {
    const { num, unit } = this.state.interval;

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

function handleTimeIntervalNumChange(
  i: TimeIntervalFilter,
  event: FormEvent<HTMLInputElement>,
) {
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
