import { Component, InfernoNode, linkEvent } from "inferno";
import { ListMediaResponse, LocalImage, MyUserInfo } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MomentTime } from "./moment-time";
import { PictrsImage } from "./pictrs-image";
import { getHttpBase } from "@utils/env";
import { toast } from "@utils/app";
import { TableHr } from "./tables";

interface Props {
  uploads: ListMediaResponse;
  showUploader?: boolean;
  myUserInfo: MyUserInfo | undefined;
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

    const cols = "col-6 col-md-3";

    return (
      <div className="media-uploads">
        <div className="row">
          {this.props.showUploader && (
            <div className={`${cols} fw-bold`}>
              {I18NextService.i18n.t("uploader")}
            </div>
          )}
          <div className={`${cols} fw-bold`}>
            {I18NextService.i18n.t("time")}
          </div>
        </div>
        <TableHr />
        {images.map(i => (
          <>
            <div className="row" key={i.local_image.pictrs_alias}>
              {this.props.showUploader && (
                <div className={cols}>
                  <PersonListing
                    person={i.person}
                    banned={false}
                    myUserInfo={this.props.myUserInfo}
                  />
                </div>
              )}
              <div className={cols}>
                <MomentTime published={i.local_image.published_at} />
              </div>
              <div className={cols}>
                <PictrsImage src={buildImageUrl(i.local_image.pictrs_alias)} />
              </div>
              <div className={cols}>{this.deleteImageBtn(i.local_image)}</div>
            </div>
            <hr />
          </>
        ))}
      </div>
    );
  }

  deleteImageBtn(image: LocalImage) {
    return (
      <button
        onClick={linkEvent(image, this.handleDeleteImage)}
        className="btn btn-danger"
      >
        {I18NextService.i18n.t("delete")}
      </button>
    );
  }

  async handleDeleteImage(image: LocalImage) {
    const filename = image.pictrs_alias;
    const res = await HttpService.client.deleteMedia({ filename });
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
  return `${getHttpBase()}/api/v4/image/${pictrsAlias}`;
}
