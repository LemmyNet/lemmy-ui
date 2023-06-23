import { UserService } from "../../services";

export default function myAuth(): string | undefined {
  return UserService.Instance.auth();
}
