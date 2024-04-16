import { Component, InfernoNode, linkEvent } from "inferno";
import { ListMediaResponse, LocalImage } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MomentTime } from "./moment-time";
import { PictrsImage } from "./pictrs-image";
import { getHttpBase } from "@utils/env";
import { toast } from "../../toast";

interface Props {
  uploads: ListMediaResponse;
  showUploader?: boolean;
}

@tippyMixin
export class MediaUploads extends Component<Props, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const images = this.props.uploads.images;

    return (
      <div className="media-uploads table-responsive">
        <table className="table">
          <thead>
            <tr>
              {this.props.showUploader && (
                <th>{I18NextService.i18n.t("uploader")}</th>
              )}
              <th colSpan={3}>{I18NextService.i18n.t("time")}</th>
            </tr>
          </thead>
          <tbody>
            {images.map(i => (
              <tr key={i.local_image.pictrs_alias}>
                {this.props.showUploader && (
                  <td>
                    <PersonListing person={i.person} />
                  </td>
                )}
                <td>
                  <MomentTime published={i.local_image.published} />
                </td>
                <td>
                  <PictrsImage
                    src={buildImageUrl(i.local_image.pictrs_alias)}
                  />
                </td>
                <td>{this.deleteImageBtn(i.local_image)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  deleteImageBtn(image: LocalImage) {
    return (
      <button
        onClick={linkEvent({ i: this, image }, this.handleDeleteImage)}
        className="btn btn-danger"
      >
        {I18NextService.i18n.t("delete")}
      </button>
    );
  }

  async handleDeleteImage({ image }: { i: MediaUploads; image: LocalImage }) {
    const form = {
      token: image.pictrs_delete_token,
      filename: image.pictrs_alias,
    };
    const res = await HttpService.client.deleteImage(form);
    const filename = image.pictrs_alias;
    if (res.state === "success") {
      const deletePictureText = I18NextService.i18n.t("picture_deleted", {
        filename,
      });
      toast(deletePictureText);
    } else if (res.state === "failed") {
      const failedDeletePictureText = I18NextService.i18n.t(
        "failed_to_delete_picture",
        {
          filename,
        },
      );
      toast(failedDeletePictureText, "danger");
    }
  }
}

function buildImageUrl(pictrsAlias: string): string {
  return `${getHttpBase()}/pictrs/image/${pictrsAlias}`;
}
