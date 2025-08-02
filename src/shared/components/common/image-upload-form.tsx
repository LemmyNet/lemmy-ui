import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { HttpService, I18NextService } from "../../services";
import { toast } from "@utils/app";
import { Icon, Spinner } from "./icon";
import { RequestState, WrappedLemmyHttp } from "../../services/HttpService";
import {
  CommunityId,
  SuccessResponse,
  UploadImageResponse,
} from "lemmy-js-client";
import ImageUploadConfirmModalModal from "./modal/image-upload-confirm-modal";

type BaseProps = {
  uploadTitle: string;
  imageSrc?: string;
  rounded?: boolean;
  disabled: boolean;
  onImageChange: (imageSrc?: string) => void;
};

type SimpleUploadKeys = keyof Pick<
  WrappedLemmyHttp,
  | "uploadUserAvatar"
  | "uploadUserBanner"
  | "uploadSiteIcon"
  | "uploadSiteBanner"
>;
type SimpleRemoveKeys = keyof Pick<
  WrappedLemmyHttp,
  | "deleteUserAvatar"
  | "deleteUserBanner"
  | "deleteSiteIcon"
  | "deleteSiteBanner"
>;

type UploadKeyProps =
  | {
      uploadKey: SimpleUploadKeys;
      removeKey?: SimpleRemoveKeys;
    }
  | {
      uploadKey: keyof Pick<
        WrappedLemmyHttp,
        "uploadCommunityIcon" | "uploadCommunityBanner"
      >;
      removeKey?: keyof Pick<
        WrappedLemmyHttp,
        "deleteCommunityIcon" | "deleteCommunityBanner"
      >;
      communityId: CommunityId;
    };

type ImageUploadFormProps = BaseProps & UploadKeyProps;

interface ImageUploadFormState {
  loading: boolean;
  pendingUpload?: File;
}

export class ImageUploadForm extends Component<
  ImageUploadFormProps,
  ImageUploadFormState
> {
  private id = `image-upload-form-${randomStr()}`;
  state: ImageUploadFormState = {
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <form className="image-upload-form d-inline">
        {this.state.loading ? (
          <Spinner large />
        ) : (
          <span className="d-inline-block position-relative mb-2">
            {/* TODO: Create "Current Image" translation for alt text */}
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
        {this.state?.pendingUpload && (
          <ImageUploadConfirmModalModal
            onConfirm={() => this.performImageUpload(this)}
            onCancel={() => this.handleRemoveImage(this)}
            pendingImageURL={URL.createObjectURL(this.state.pendingUpload)}
            show={true}
          />
        )}
        <input
          id={this.id}
          type="file"
          accept="image/*,video/*"
          className="small form-control"
          name={this.id}
          disabled={this.props.disabled}
          onChange={linkEvent(this, this.guardedImageUpload)}
        />
      </form>
    );
  }

  async guardedImageUpload(i: ImageUploadForm, event: any) {
    const image = event.target.files[0] as File;
    i.setState({ pendingUpload: image });
  }

  performImageUpload(i: ImageUploadForm) {
    if (!i.state.pendingUpload) {
      return;
    }
    const image = i.state.pendingUpload;

    i.setState({ loading: true, pendingUpload: undefined });

    let uploadPromise: Promise<RequestState<UploadImageResponse>>;
    if (
      i.props.uploadKey === "uploadCommunityIcon" ||
      i.props.uploadKey === "uploadCommunityBanner"
    ) {
      uploadPromise = HttpService.client[i.props.uploadKey](
        { id: i.props.communityId },
        { image },
      );
    } else {
      uploadPromise = HttpService.client[i.props.uploadKey]({ image });
    }

    uploadPromise.then((res: RequestState<UploadImageResponse>) => {
      if (res.state === "success") {
        i.props.onImageChange(res.data.image_url);
        toast(I18NextService.i18n.t("image_uploaded"));
      } else if (res.state === "failed") {
        toast(res.err.message, "danger");
      }

      i.setState({ loading: false });
    });
  }

  async handleRemoveImage(i: ImageUploadForm) {
    if (i.state.pendingUpload) {
      i.setState({ pendingUpload: undefined });
      return;
    }

    if (i.props.removeKey) {
      i.setState({ loading: true });
      let res: RequestState<SuccessResponse>;
      if (
        i.props.removeKey === "deleteCommunityIcon" ||
        i.props.removeKey === "deleteCommunityBanner"
      ) {
        res = await HttpService.client[i.props.removeKey]({
          id: i.props.communityId,
        });
      } else {
        res = await HttpService.client[i.props.removeKey]();
      }
      if (res.state === "success") {
        i.props.onImageChange(undefined);
        toast(I18NextService.i18n.t("image_deleted"));
      } else if (res.state === "failed") {
        toast(res.err.message, "danger");
      }
    }
    i.setState({ loading: false });
  }
}
