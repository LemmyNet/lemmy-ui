import { DataType } from "shared/interfaces";

export default function getDataTypeString(dt: DataType) {
  return dt === DataType.Post ? "Post" : "Comment";
}
