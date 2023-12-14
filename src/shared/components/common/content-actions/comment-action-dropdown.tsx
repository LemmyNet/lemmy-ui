import { InfernoNode } from "@/inferno";
import ContentActionDropdown, {
  ContentCommentProps,
} from "./content-action-dropdown";

export default (
  props: Omit<ContentCommentProps, "type" | "postView">,
): InfernoNode => <ContentActionDropdown type="comment" {...props} />;
