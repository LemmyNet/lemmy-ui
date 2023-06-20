import { Component, linkEvent } from "inferno";
import { i18n } from "../../i18next";
import { DataType } from "../../interfaces";

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
      <div className="btn-group btn-group-toggle flex-wrap">
        <label
          className={`pointer btn btn-outline-secondary 
            ${this.state.type_ == DataType.Post && "active"}
          `}
        >
          <input
            type="radio"
            className="btn-check"
            value={DataType.Post}
            checked={this.state.type_ == DataType.Post}
            onChange={linkEvent(this, this.handleTypeChange)}
          />
          {i18n.t("posts")}
        </label>
        <label
          className={`pointer btn btn-outline-secondary ${
            this.state.type_ == DataType.Comment && "active"
          }`}
        >
          <input
            type="radio"
            className="btn-check"
            value={DataType.Comment}
            checked={this.state.type_ == DataType.Comment}
            onChange={linkEvent(this, this.handleTypeChange)}
          />
          {i18n.t("comments")}
        </label>
      </div>
    );
  }

  handleTypeChange(i: DataTypeSelect, event: any) {
    i.props.onChange?.(Number(event.target.value));
  }
}
