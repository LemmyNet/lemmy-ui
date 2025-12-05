<div align="center">

[![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/LemmyNet/lemmy-ui.svg)](https://github.com/LemmyNet/lemmy/releases)
[![Build Status](https://woodpecker.join-lemmy.org/api/badges/LemmyNet/lemmy-ui/status.svg)](https://woodpecker.join-lemmy.org/LemmyNet/lemmy)
[![GitHub issues](https://img.shields.io/github/issues-raw/LemmyNet/lemmy-ui.svg)](https://github.com/LemmyNet/lemmy/issues)
[![Docker Pulls](https://img.shields.io/docker/pulls/dessalines/lemmy-ui.svg)](https://cloud.docker.com/repository/docker/dessalines/lemmy/)
[![Translation status](http://weblate.join-lemmy.org/widgets/lemmy/-/lemmy/svg-badge.svg)](http://weblate.join-lemmy.org/engage/lemmy/)
[![License](https://img.shields.io/github/license/LemmyNet/lemmy-ui.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/LemmyNet/lemmy?style=social)](https://github.com/LemmyNet/lemmy-ui/stargazers)
<a href="https://endsoftwarepatents.org/innovating-without-patents"><img style="height: 20px;" src="https://static.fsf.org/nosvn/esp/logos/patent-free.svg"></a>

</div>

<p align="center">
  <a href="https://join-lemmy.org/" rel="noopener">
 <img width=200px height=200px src="https://raw.githubusercontent.com/LemmyNet/lemmy-ui/main/src/assets/icons/favicon.svg"></a>

 <h3 align="center"><a href="https://join-lemmy.org">Lemmy UI</a></h3>
  <p align="center">
    A link aggregator and forum for the fediverse.
    <br />
    <br />
    <a href="https://join-lemmy.org">Join Lemmy</a>
    ·
    <a href="https://join-lemmy.org/docs/index.html">Documentation</a>
    ·
    <a href="https://matrix.to/#/#lemmy-space:matrix.org">Matrix Chat</a>
    ·
    <a href="https://github.com/LemmyNet/lemmy-ui/issues">Report Bug</a>
    ·
    <a href="https://github.com/LemmyNet/lemmy-ui/issues">Request Feature</a>
    ·
    <a href="https://github.com/LemmyNet/lemmy/blob/main/RELEASES.md">Releases</a>
    ·
    <a href="https://join-lemmy.org/docs/code_of_conduct.html">Code of Conduct</a>
  </p>
</p>

## About The Project

| Desktop                                                                                                         | Mobile                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ![desktop](https://raw.githubusercontent.com/LemmyNet/joinlemmy-site/main/src/assets/images/main_screen_2.webp) | ![mobile](https://raw.githubusercontent.com/LemmyNet/joinlemmy-site/main/src/assets/images/mobile_pic.webp) |

[Lemmy](https://github.com/LemmyNet/lemmy) is similar to sites like [Reddit](https://reddit.com), [Lobste.rs](https://lobste.rs), or [Hacker News](https://news.ycombinator.com/): you subscribe to forums you're interested in, post links and discussions, then vote, and comment on them. Behind the scenes, it is very different; anyone can easily run a server, and all these servers are federated (think email), and connected to the same universe, called the [Fediverse](https://en.wikipedia.org/wiki/Fediverse).

For a link aggregator, this means a user registered on one server can subscribe to forums on any other server, and can have discussions with users registered elsewhere.

It is an easily self-hostable, decentralized alternative to Reddit and other link aggregators, outside of their corporate control and meddling.

Each Lemmy server can set its own moderation policy; appointing site-wide admins, and community moderators to keep out the trolls, and foster a healthy, non-toxic environment where all can feel comfortable contributing.

You can find more information in the [Backend Repository](https://github.com/LemmyNet/lemmy).

## Development

You need to have [pnpm](https://pnpm.io/installation) installed. Then run the following:

```bash
git clone https://github.com/LemmyNet/lemmy-ui.git
cd lemmy-ui
pnpm install
LEMMY_UI_BACKEND=https://voyager.lemmy.ml pnpm dev
```

Finally open `http://localhost:1234` in your browser. This uses the public test instance `https://voyager.lemmy.ml/` as backend. For more details such as developing with a locally compiled Lemmy backend, read the [documentation](https://join-lemmy.org/docs/contributors/01-overview.html).

## Configuration

The following environment variables can be used to configure lemmy-ui:

| `ENV_VAR`                      | type     | default            | description                                                                                                                        |
| ------------------------------ | -------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `LEMMY_UI_HOST`                | `string` | `0.0.0.0:1234`     | The IP / port that the lemmy-ui isomorphic node server is hosted at.                                                               |
| `LEMMY_UI_FRONTEND`            | `string` | `undefined`        | The base url where browsers can reach the lemmy-ui server, is inferred from request headers when undefined. (Protocol is optional) |
| `LEMMY_UI_BACKEND`             | `string` | `localhost:8536`   | The base url for lemmy-ui in the browser to connect to the lemmy backend server. (Protocol is optional)                            |
| `LEMMY_UI_BACKEND_INTERNAL`    | `string` | `LEMMY_UI_BACKEND` | The base url for the lemmy-ui server to connect to the lemmy backend server. (Protocol is optional)                                |
| `LEMMY_UI_HTTPS`               | `bool`   | `false`            | Uses `https://` as the default protocol for base urls.                                                                             |
| `LEMMY_UI_EXTRA_THEMES_FOLDER` | `string` | `./extra_themes`   | A location for additional lemmy css themes.                                                                                        |
| `LEMMY_UI_DISABLE_CSP`         | `bool`   | `false`            | Disables CSP security headers                                                                                                      |
| `LEMMY_UI_CUSTOM_HTML_HEADER`  | `string` | `undefined`        | Injects a custom script into `<head>`.                                                                                             |

### Debugging

These environment variables are for debugging purposes and are disabled by default for production builds, but can be enabled explicitly.

| `ENV_VAR`                 | type   | default | evaluation | description                                                                                                           |
| ------------------------- | ------ | ------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `LEMMY_UI_ERUDA`          | `bool` | `true`  | runtime    | Enables Eruda, the console for mobile browsers. (In production Eruda partially violates the CSP, but remains useful.) |
| `LEMMY_UI_SOURCE_MAPS`    | `bool` | `true`  | buildtime  | Gives browsers and node the ability to report accurate stack traces.                                                  |
| `LEMMY_UI_SERVE_CSS_MAPS` | `bool` | `false` | runtime    | Serves `.css.map` files when requested. Map files are untracked, run `pnpm themes:build` to generate and update them. |
| `LEMMY_UI_COMPRESSION`    | `bool` | `true`  | runtime    | Enables response body compression, useful to test on slow connections.                                                |

## Credits

Icons from [Feather Icons](https://feathericons.com/).

Code template based off of MrFoxPro's [inferno-isomorphic-template](https://github.com/MrFoxPro/inferno-isomorphic-template).
