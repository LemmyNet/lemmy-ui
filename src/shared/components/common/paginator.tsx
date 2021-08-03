import { Component, linkEvent } from "inferno";
import { i18n } from "../../i18next";

interface PaginatorProps {
  page: number;
  onChange(val: number): any;
}

export class Paginator extends Component<PaginatorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <div class="my-2">
        <button
          class="btn btn-secondary mr-2"
          disabled={this.props.page == 1}
          onClick={linkEvent(this, this.handlePrev)}
        >
          {i18n.t("prev")}
        </button>
        <button
          class="btn btn-secondary"
          onClick={linkEvent(this, this.handleNext)}
        >
          {i18n.t("next")}
        </button>
      </div>
    );
  }

  handlePrev(i: Paginator) {
    i.props.onChange(i.props.page - 1);
  }

  handleNext(i: Paginator) {
    i.props.onChange(i.props.page + 1);
  }
}
