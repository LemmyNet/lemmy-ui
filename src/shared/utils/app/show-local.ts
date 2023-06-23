import { IsoData } from "../../interfaces";

export default function showLocal(isoData: IsoData): boolean {
  return isoData.site_res.site_view.local_site.federation_enabled;
}
