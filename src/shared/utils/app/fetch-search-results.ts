import { Search, SearchType } from "lemmy-js-client";
import { fetchLimit } from "../../config";
import { HttpService } from "../../services";

export default function fetchSearchResults(q: string, type_: SearchType) {
  const form: Search = {
    q,
    type_,
    sort: "TopAll",
    listing_type: "All",
    page: 1,
    limit: fetchLimit,
  };

  return HttpService.client.search(form);
}
