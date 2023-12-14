import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "@/inferno";
import { DataType } from "../../interfaces";
import { I18NextService } from "../../services";

interface DataTypeSelectProps {
  type_: DataType;
  onChange?(val: DataType): any;
}

interface DataTypeSelectState {
  type_: DataType;
}

export class DataTypeSelect extends Component<
  DataTypeSelectProps,
  DataTypeSelectState
> {
  private id = `listing-type-input-${randomStr()}`;

  state: DataTypeSelectState = {
    type_: this.props.type_,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(props: any): DataTypeSelectProps {
    return {
      type_: props.type_,
    };
  }

  render() {
    return (
      <div
        className="data-type-select btn-group btn-group-toggle flex-wrap"
        role="group"
      >
        <input
          id={`${this.id}-posts`}
          type="radio"
          className="btn-check"
          value={DataType.Post}
          checked={this.state.type_ === DataType.Post}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          htmlFor={`${this.id}-posts`}
          className={classNames("pointer btn btn-outline-secondary", {
            active: this.state.type_ === DataType.Post,
          })}
        >
          {I18NextService.i18n.t("posts")}
        </label>

        <input
          id={`${this.id}-comments`}
          type="radio"
          className="btn-check"
          value={DataType.Comment}
          checked={this.state.type_ === DataType.Comment}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          htmlFor={`${this.id}-comments`}
          className={classNames("pointer btn btn-outline-secondary", {
            active: this.state.type_ === DataType.Comment,
          })}
        >
          {I18NextService.i18n.t("comments")}
        </label>
      </div>
    );
  }

  handleTypeChange(i: DataTypeSelect, event: any) {
    i.props.onChange?.(Number(event.target.value));
  }
}
