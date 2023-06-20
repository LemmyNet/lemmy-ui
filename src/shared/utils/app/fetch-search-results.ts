import { myAuth } from "@utils/app";
import { Search, SearchType } from "lemmy-js-client";
import { HttpService } from "../../services";

export const fetchLimit = 40;

export default function fetchSearchResults(q: string, type_: SearchType) {
  const form: Search = {
    q,
    type_,
    sort: "TopAll",
    listing_type: "All",
    page: 1,
    limit: fetchLimit,
    auth: myAuth(),
  };

  return HttpService.client.search(form);
}
