import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { HttpService, I18NextService, UserService } from "../../services";
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
        {this.props.imageSrc && (
          <span className="d-inline-block position-relative mb-2">
            {/* TODO: Create "Current Iamge" translation for alt text */}
            <img
              alt=""
              src={this.props.imageSrc}
              height={this.props.rounded ? 60 : ""}
              width={this.props.rounded ? 60 : ""}
              className={classNames({
                "rounded-circle object-fit-cover": this.props.rounded,
                "img-fluid": !this.props.rounded,
              })}
            />
            <button
              className="position-absolute d-block p-0 end-0 border-0 top-0 bg-transparent text-white"
              type="button"
              onClick={linkEvent(this, this.handleRemoveImage)}
              aria-label={I18NextService.i18n.t("remove")}
            >
              <Icon icon="x" classes="mini-overlay" />
            </button>
          </span>
        )}
        <input
          id={this.id}
          type="file"
          accept="image/*,video/*"
          className="small form-control"
          name={this.id}
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
        } else if (res.data.msg === "too_large") {
          toast(I18NextService.i18n.t("upload_too_large"), "danger");
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
