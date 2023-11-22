import { InfernoNode } from "inferno";
import ContentActionDropdown, {
  ContentPostProps,
} from "./content-action-dropdown";

export default (
  props: Omit<ContentPostProps, "type" | "commentView">,
): InfernoNode => <ContentActionDropdown type="post" {...props} />;
