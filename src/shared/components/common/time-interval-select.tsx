import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

type IntervalUnit = NoOptionI18nKeys &
  ("seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years");

type Interval = {
  num: number | undefined;
  unit: IntervalUnit;
};

interface TimeIntervalSelectProps {
  onChange(seconds: number): void;
  currentSeconds: number | undefined;
}

interface TimeIntervalSelectState {
  interval: Interval;
}

export class TimeIntervalSelect extends Component<
  TimeIntervalSelectProps,
  TimeIntervalSelectState
> {
  state: TimeIntervalSelectState = {
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
      <div class="input-group">
        <input
          type="number"
          className="form-control"
          aria-label={I18NextService.i18n.t("time_interval")}
          value={num}
          onInput={linkEvent(this, handleTimeIntervalNumChange)}
        />
        <button
          className="btn btn-outline-secondary dropdown-toggle"
          data-tippy-content={I18NextService.i18n.t("time_interval")}
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-controls="time-interval-unit-dropdown"
          aria-label={I18NextService.i18n.t("time_unit")}
        >
          {I18NextService.i18n.t(unit)}
        </button>
        <ul
          class="dropdown-menu dropdown-menu-end"
          id="time-interval-unit-dropdown"
        >
          {conversions
            .map(c => c.unit)
            .map(cUnit => (
              <li>
                <button
                  class="dropdown-item"
                  onClick={() => handleTimeIntervalUnitChange(this, cUnit)}
                >
                  {I18NextService.i18n.t(cUnit)}
                </button>
              </li>
            ))}
        </ul>
      </div>
    );
  }
}

function handleTimeIntervalNumChange(i: TimeIntervalSelect, event: any) {
  const num = Number(event.target.value);
  const unit = i.state.interval.unit;
  const interval = { num, unit };

  handleTimeIntervalChange(i, interval);
}

function handleTimeIntervalUnitChange(
  i: TimeIntervalSelect,
  unit: IntervalUnit,
) {
  const num = i.state.interval.num;
  const interval = { num, unit };

  handleTimeIntervalChange(i, interval);
}

function handleTimeIntervalChange(i: TimeIntervalSelect, interval: Interval) {
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
