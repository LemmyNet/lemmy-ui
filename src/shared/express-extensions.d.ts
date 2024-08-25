import { wrapClient } from "./services/HttpService";

declare global {
  namespace Express {
    export interface Request {
      client: ReturnType<typeof wrapClient>;
    }
  }
}
