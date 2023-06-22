import { DataType } from "@utils/types";

export default function getDataTypeString(dt: DataType) {
  return dt === DataType.Post ? "Post" : "Comment";
}
