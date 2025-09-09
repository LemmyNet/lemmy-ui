import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";

interface TimeIntervalSelectProps {
  onChange(seconds: number): void;
  currentSeconds: number | undefined;
}

// Unfortunately necessary because its impossible to use numeric props with undefined.
// Trust me I tried.
interface TimeIntervalSelectState {
  days: number | undefined;
}

export class TimeIntervalSelect extends Component<
  TimeIntervalSelectProps,
  TimeIntervalSelectState
> {
  state: TimeIntervalSelectState = {
    days: this.props.currentSeconds
      ? secondsToDays(this.props.currentSeconds)
      : undefined,
  };
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div class="input-group">
        <input
          type="number"
          className="form-control"
          id="time-interval"
          aria-label={I18NextService.i18n.t("days")}
          aria-describedby="time-interval-days"
          value={this.state.days}
          onInput={linkEvent(this, handleTimeIntervalChange)}
        />
        <span class="input-group-text" id="time-interval-days">
          {I18NextService.i18n.t("days")}
        </span>
      </div>
    );
  }
}

function handleTimeIntervalChange(i: TimeIntervalSelect, event: any) {
  const days = Number(event.target.value);
  const secs = daysToSeconds(days);
  i.setState({ days });
  i.props.onChange(secs);
}

function secondsToDays(seconds: number): number {
  return Math.floor(seconds / 86400);
}

function daysToSeconds(days: number): number {
  return days * 86400;
}
