import { BlockPersonResponse, MyUserInfo } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { toast } from "../../toast";

export default function updatePersonBlock(
  data: BlockPersonResponse,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo,
) {
  if (myUserInfo) {
    if (data.blocked) {
      myUserInfo.person_blocks.push(data.person_view.person);
      toast(
        `${I18NextService.i18n.t("blocked")} ${data.person_view.person.name}`,
      );
    } else {
      myUserInfo.person_blocks = myUserInfo.person_blocks.filter(
        p => p.id !== data.person_view.person.id,
      );
      toast(
        `${I18NextService.i18n.t("unblocked")} ${data.person_view.person.name}`,
      );
    }
  }
}
