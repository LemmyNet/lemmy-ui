import { Component, linkEvent } from "inferno";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { randomStr, toast } from "../../utils";
import { Icon } from "./icon";

interface ImageUploadFormProps {
  uploadTitle: string;
  imageSrc: string;
  onUpload(url: string): any;
  onRemove(): any;
  rounded?: boolean;
}

interface ImageUploadFormState {
  loading: boolean;
}

export class ImageUploadForm extends Component<
  ImageUploadFormProps,
  ImageUploadFormState
> {
  private id = `image-upload-form-${randomStr()}`;
  private emptyState: ImageUploadFormState = {
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  render() {
    return (
      <form class="d-inline">
        <label
          htmlFor={this.id}
          class="pointer text-muted small font-weight-bold"
        >
          {!this.props.imageSrc ? (
            <span class="btn btn-secondary">{this.props.uploadTitle}</span>
          ) : (
            <span class="d-inline-block position-relative">
              <img
                src={this.props.imageSrc}
                height={this.props.rounded ? 60 : ""}
                width={this.props.rounded ? 60 : ""}
                className={`img-fluid ${
                  this.props.rounded ? "rounded-circle" : ""
                }`}
              />
              <a
                onClick={linkEvent(this, this.handleRemoveImage)}
                aria-label={i18n.t("remove")}
              >
                <Icon icon="x" classes="mini-overlay" />
              </a>
            </span>
          )}
        </label>
        <input
          id={this.id}
          type="file"
          accept="image/*,video/*"
          name={this.id}
          class="d-none"
          disabled={!UserService.Instance.myUserInfo}
          onChange={linkEvent(this, this.handleImageUpload)}
        />
      </form>
    );
  }

  handleImageUpload(i: ImageUploadForm, event: any) {
    event.preventDefault();
    let file = event.target.files[0];
    const formData = new FormData();
    formData.append("images[]", file);

    i.state.loading = true;
    i.setState(i.state);

    fetch(pictrsUri, {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(res => {
        console.log("pictrs upload:");
        console.log(res);
        if (res.msg == "ok") {
          let hash = res.files[0].file;
          let url = `${pictrsUri}/${hash}`;
          i.state.loading = false;
          i.setState(i.state);
          i.props.onUpload(url);
        } else {
          i.state.loading = false;
          i.setState(i.state);
          toast(JSON.stringify(res), "danger");
        }
      })
      .catch(error => {
        i.state.loading = false;
        i.setState(i.state);
        console.error(error);
        toast(error, "danger");
      });
  }

  handleRemoveImage(i: ImageUploadForm, event: any) {
    event.preventDefault();
    i.state.loading = true;
    i.setState(i.state);
    i.props.onRemove();
  }
}
