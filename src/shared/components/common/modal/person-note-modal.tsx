import {
  Component,
  InfernoNode,
  RefObject,
  createRef,
  linkEvent,
} from "inferno";
import { I18NextService } from "@services/I18NextService";
import { Spinner } from "@components/common/icon";
import type { Modal } from "bootstrap";
import { NotePerson, PersonId } from "lemmy-js-client";
import { modalMixin } from "@components/mixins/modal-mixin";
import { randomStr } from "@utils/helpers";

interface PersonNoteModalProps {
  children?: InfernoNode;
  note?: string;
  personId: PersonId;
  show: boolean;
  onSubmit: (form: NotePerson) => Promise<void>;
  onCancel: () => void;
}

interface PersonNoteModalState {
  loading: boolean;
  note?: string;
}

@modalMixin
export default class PersonNoteModal extends Component<
  PersonNoteModalProps,
  PersonNoteModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly yesButtonRef: RefObject<HTMLButtonElement>;
  modal?: Modal;
  state: PersonNoteModalState = {
    loading: false,
    note: this.props.note,
  };

  constructor(props: PersonNoteModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.yesButtonRef = createRef();

    this.handleDismiss = this.handleDismiss.bind(this);
  }

  render() {
    const btnText = this.state.loading ? (
      <Spinner />
    ) : (
      I18NextService.i18n.t("save")
    );

    const formId = `person-note-${randomStr()}`;

    // Only disable the form if the initial props note is null.
    // Otherwise you won't be able to remove notes
    const disableForm = !this.props.note && !this.state.note;

    return (
      <div
        className="modal fade"
        id="personNoteModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#personNoteModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h5 className="modal-title" id="personNoteModalTitle">
                {I18NextService.i18n.t("create_user_note")}
              </h5>
            </header>
            <div className="modal-body text-center align-middle text-body">
              <form
                id={formId}
                onSubmit={linkEvent(this, handleSubmit)}
                className="mb-3"
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder={I18NextService.i18n.t("create_user_note")}
                  value={this.state.note}
                  onInput={linkEvent(this, handleNoteChange)}
                />
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="submit"
                className="btn btn-secondary me-3"
                form={formId}
                disabled={disableForm || this.state.loading}
              >
                {btnText}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={this.props.onCancel}
                disabled={this.state.loading}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.yesButtonRef.current?.focus();
  }

  handleDismiss() {
    this.props.onCancel();
    this.modal?.hide();
  }
}

function handleNoteChange(i: PersonNoteModal, event: any) {
  i.setState({ note: event.target.value });
}

async function handleSubmit(i: PersonNoteModal, event: any) {
  event.preventDefault();

  i.setState({ loading: true });

  // Empty string is a delete note
  const note = i.state.note ?? "";

  await i.props.onSubmit({
    note,
    person_id: i.props.personId,
  });

  i.setState({
    loading: false,
  });
}
