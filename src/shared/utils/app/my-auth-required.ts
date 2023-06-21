import { UserService } from "../../services";

export default function myAuthRequired(): string {
  return UserService.Instance.auth(true) ?? "";
}
