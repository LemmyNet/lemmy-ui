import { getIsoData } from "@/server/handlers/catch-all-handler";
import { createSsrHtml } from "@/server/utils/create-ssr-html";
import "../shared/components/app/styles.scss";
import { App } from "@/shared/components/app/app";
import Head from "next/head";

export const metadata = {
  title: "lemmy todo",
  description: "...",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getIsoData("/");
  return createSsrHtml(<App isoData={data}>{children}</App>, data, "TODO");
}
