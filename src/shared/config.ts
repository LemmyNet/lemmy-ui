import { COMMIT_HASH } from "./version";

export const favIconUrl = `/static-${COMMIT_HASH}/assets/icons/favicon.svg`;
export const favIconPngUrl = `/static-${COMMIT_HASH}/assets/icons/apple-touch-icon.png`;

export const repoUrl = "https://github.com/LemmyNet";
export const joinLemmyUrl = "https://join-lemmy.org";
export const donateLemmyUrl = `${joinLemmyUrl}/donate`;
export const docsUrl = `${joinLemmyUrl}/docs/en/index.html`;
export const helpGuideUrl = `${joinLemmyUrl}/docs/en/users/01-getting-started.html`; // TODO find a way to redirect to the non-en folder
export const markdownHelpUrl = `${joinLemmyUrl}/docs/en/users/02-media.html`;
export const sortingHelpUrl = `${joinLemmyUrl}/docs/en/users/03-votes-and-ranking.html`;
export const archiveTodayUrl = "https://archive.today";
export const ghostArchiveUrl = "https://ghostarchive.org";
export const webArchiveUrl = "https://web.archive.org";
export const elementUrl = "https://element.io";

export const postRefetchSeconds: number = 60 * 1000;
export const trendingFetchLimit = 6;
export const mentionDropdownFetchLimit = 10;
export const commentTreeMaxDepth = 8;
export const markdownFieldCharacterLimit = 50000;
export const maxUploadImages = 20;
export const concurrentImageUpload = 4;
export const updateUnreadCountsInterval = 30000;
export const fetchLimit = 20;
export const relTags = "noopener nofollow";
export const emDash = "\u2014";

/**
 * Accepted formats:
 * !community@server.com
 * /c/community@server.com
 * /m/community@server.com
 * /u/username@server.com
 */
export const instanceLinkRegex =
  /(\/[cmu]\/|!)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export const testHost = "0.0.0.0:8536";
