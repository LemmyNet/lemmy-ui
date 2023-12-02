import { UserService } from "../../services";

// Warning, do not use this in fetchInitialData
export default function myAuth(): string | undefined {
  return UserService.Instance.auth();
}
