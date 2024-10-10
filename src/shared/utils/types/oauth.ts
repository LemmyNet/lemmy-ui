import { CreateOAuthProvider } from "lemmy-js-client";

export type ProviderToEdit = Omit<
  CreateOAuthProvider,
  "client_id" | "client_secret"
>;
