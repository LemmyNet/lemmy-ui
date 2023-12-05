import { readFile } from "fs/promises";
import { Site } from "lemmy-js-client";
import path from "path";
import { fetchIconPng } from "./fetch-icon-png";

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

const defaultLogoPathDirectory = path.join(
  process.cwd(),
  "dist",
  "assets",
  "icons",
);

export default async function (site: Site) {
  const icon = site.icon ? await fetchIconPng(site.icon) : null;

  return {
    name: site.name,
    description: site.description ?? "A link aggregator for the fediverse",
    start_url: "/",
    scope: "/",
    display: "standalone",
    id: "/",
    background_color: "#222222",
    theme_color: "#222222",
    icons: await Promise.all(
      iconSizes.map(async size => {
        let src = await readFile(
          path.join(defaultLogoPathDirectory, `icon-${size}x${size}.png`),
        ).then(buf => buf.toString("base64"));

        if (icon) {
          const sharp = (await import("sharp")).default;
          src = await sharp(icon)
            .resize(size, size)
            .png()
            .toBuffer()
            .then(buf => buf.toString("base64"));
        }

        return {
          sizes: `${size}x${size}`,
          type: "image/png",
          src: `data:image/png;base64,${src}`,
          purpose: "any maskable",
        };
      }),
    ),
    shortcuts: [
      {
        name: "Search",
        short_name: "Search",
        description: "Perform a search.",
        url: "/search",
      },
      {
        name: "Communities",
        url: "/communities",
        short_name: "Communities",
        description: "Browse communities",
      },
      {
        name: "Create Post",
        url: "/create_post",
        short_name: "Create Post",
        description: "Create a post.",
      },
    ],
    related_applications: [
      {
        platform: "f-droid",
        url: "https://f-droid.org/packages/com.jerboa/",
        id: "com.jerboa",
      },
    ],
  };
}
