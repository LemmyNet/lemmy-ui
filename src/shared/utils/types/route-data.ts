import { RequestState } from "../../services/HttpService";

export type RouteData = Record<string, RequestState<any>>;
