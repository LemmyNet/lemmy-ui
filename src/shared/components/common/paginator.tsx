import { I18NextService } from "../../services";

interface PaginatorProps {
  onNext(): void;
  onPrev(): void;
  nextDisabled: boolean;
  disabled?: boolean;
}

const Paginator = ({
  nextDisabled,
  onNext,
  onPrev,
  disabled,
}: PaginatorProps) => (
  <div className="paginator my-2">
    <button
      className="btn btn-secondary me-2"
      onClick={onPrev}
      disabled={disabled}
    >
      {I18NextService.i18n.t("prev")}
    </button>
    {!nextDisabled && (
      <button
        className="btn btn-secondary"
        onClick={onNext}
        disabled={disabled}
      >
        {I18NextService.i18n.t("next")}
      </button>
    )}
  </div>
);

export default Paginator;
