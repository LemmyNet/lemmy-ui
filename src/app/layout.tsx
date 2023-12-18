import { getIsoData } from "@/server/handlers/catch-all-handler";
import { createSsrHtml } from "@/server/utils/create-ssr-html";
import "../shared/components/app/styles.scss";
import { App } from "@/shared/components/app/app";
import Head from "next/head";

/**
 * todo: this should be replaced with async generateMetadata() and should mostly replace what Helmet is currently used for
 */
export const metadata = {
  title: "lemmy todo",
  description: "...",
};

/**
 * This returns the HTML as JSX that wraps all the websites at the root.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getIsoData("/");
  return createSsrHtml(<App isoData={data}>{children}</App>, data, "TODO");
}
