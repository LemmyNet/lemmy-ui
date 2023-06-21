import { DataType } from "../../interfaces";

export default function getDataTypeString(dt: DataType) {
  return dt === DataType.Post ? "Post" : "Comment";
}
