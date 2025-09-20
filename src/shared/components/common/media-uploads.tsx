import { Component, InfernoNode, linkEvent } from "inferno";
import { ListMediaResponse, LocalImage, MyUserInfo } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MomentTime } from "./moment-time";
import { PictrsImage } from "./pictrs-image";
import { getHttpBase } from "@utils/env";
import { toast } from "@utils/app";

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

    return images.map(i => (
      <ul className="list-inline">
        {this.props.showUploader && (
          <li className="list-inline-item">
            <PersonListing
              person={i.person}
              myUserInfo={this.props.myUserInfo}
            />
          </li>
        )}
        <li className="list-inline-item">
          <MomentTime published={i.local_image.published_at} />
        </li>
        <li className="list-inline-item">
          <PictrsImage src={buildImageUrl(i.local_image.pictrs_alias)} />
        </li>
        <li className="list-inline-item">
          {this.deleteImageBtn(i.local_image)}
        </li>
      </ul>
    ));
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
