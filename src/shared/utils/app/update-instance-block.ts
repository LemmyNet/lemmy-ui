import { BlockInstanceResponse, Instance, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { toast } from "../../toast";

export default function updateInstanceBlock(
  data: BlockInstanceResponse,
  id: number,
  linkedInstances: Instance[],
  myUserInfo?: MyUserInfo,
) {
  if (myUserInfo) {
    const instance = linkedInstances.find(i => i.id === id)!;

    if (data.blocked) {
      myUserInfo.instance_blocks.push({
        person: myUserInfo.local_user_view.person,
        instance,
      });
      toast(`${I18NextService.i18n.t("blocked")} ${instance.domain}`);
    } else {
      myUserInfo.instance_blocks = myUserInfo.instance_blocks.filter(
        i => i.instance.id !== id,
      );
      toast(`${I18NextService.i18n.t("unblocked")} ${instance.domain}`);
    }
  }
}
