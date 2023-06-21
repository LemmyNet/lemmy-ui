import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { i18n } from "../../i18next";
import { HttpService, UserService } from "../../services";
import { toast } from "../../toast";
import { Icon } from "./icon";

interface ImageUploadFormProps {
  uploadTitle: string;
  imageSrc?: string;
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
      <form className="image-upload-form d-inline">
        <label
          htmlFor={this.id}
          className="pointer text-muted small font-weight-bold"
        >
          {this.props.imageSrc ? (
            <span className="d-inline-block position-relative">
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
          ) : (
            <span className="btn btn-secondary">{this.props.uploadTitle}</span>
          )}
        </label>
        <input
          id={this.id}
          type="file"
          accept="image/*,video/*"
          name={this.id}
          className="d-none"
          disabled={!UserService.Instance.myUserInfo}
          onChange={linkEvent(this, this.handleImageUpload)}
        />
      </form>
    );
  }

  handleImageUpload(i: ImageUploadForm, event: any) {
    event.preventDefault();
    const image = event.target.files[0] as File;

    i.setState({ loading: true });

    HttpService.client.uploadImage({ image }).then(res => {
      console.log("pictrs upload:");
      console.log(res);
      if (res.state === "success") {
        if (res.data.msg === "ok") {
          i.props.onUpload(res.data.url as string);
        } else {
          toast(JSON.stringify(res), "danger");
        }
      } else if (res.state === "failed") {
        console.error(res.msg);
        toast(res.msg, "danger");
      }

      i.setState({ loading: false });
    });
  }

  handleRemoveImage(i: ImageUploadForm, event: any) {
    event.preventDefault();
    i.setState({ loading: true });
    i.props.onRemove();
  }
}
