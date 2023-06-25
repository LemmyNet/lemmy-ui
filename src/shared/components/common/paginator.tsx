import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import styles from "./paginator.module.scss";

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
      <div className={styles.paginator}>
        <button
          className={styles.paginator__button}
          disabled={this.props.page == 1}
          onClick={linkEvent(this, this.handlePrev)}
        >
          {I18NextService.i18n.t("prev")}
        </button>
        <button
          className={styles.paginator__button}
          onClick={linkEvent(this, this.handleNext)}
        >
          {I18NextService.i18n.t("next")}
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
