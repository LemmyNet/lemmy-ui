import { Site } from "lemmy-js-client";
import { fetchIconPng } from "./fetch-icon-png";
import { getStaticDir } from "@utils/env";

type Icon = { sizes: string; src: string; type: string; purpose: string };
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
let icons: Icon[] | null = null;

function mapIcon(src: string, size: number): Icon {
  return {
    sizes: `${size}x${size}`,
    type: "image/png",
    src,
    purpose: "any maskable",
  };
}

function generateDefaultIcons() {
  return iconSizes.map(size =>
    mapIcon(`${getStaticDir()}/assets/icons/icon-${size}x${size}.png`, size),
  );
}

export default async function (site: Site) {
  if (!icons) {
    try {
      const icon = site.icon ? await fetchIconPng(site.icon) : null;

      if (icon) {
        icons = await Promise.all(
          iconSizes.map(async size => {
            const sharp = (await import("sharp")).default;
            const src = `data:image/png:base64,${await sharp(icon)
              .resize(size, size)
              .png()
              .toBuffer()
              .then(buf => buf.toString("base64"))}`;

            return mapIcon(src, size);
          }),
        );
      } else {
        icons = generateDefaultIcons();
      }
    } catch {
      console.log(
        `Failed to fetch site logo for manifest icon. Using default icon`,
      );
      icons = generateDefaultIcons();
    }
  }

  return {
    name: site.name,
    description: site.description ?? "A link aggregator for the fediverse",
    start_url: "/",
    scope: "/",
    display: "standalone",
    id: "/",
    background_color: "#222222",
    theme_color: "#222222",
    icons,
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
