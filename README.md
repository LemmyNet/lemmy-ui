# Lemmy-UI

The official web app for [Lemmy](https://github.com/LemmyNet/lemmy), written in inferno.

Based off of MrFoxPro's [inferno-isomorphic-template](https://github.com/MrFoxPro/inferno-isomorphic-template).

## Development

You need to have [pnpm](https://pnpm.io/installation) installed. Then run the following:

```bash
git clone https://github.com/LemmyNet/lemmy-ui.git
cd lemmy-ui
pnpm install
LEMMY_UI_BACKEND_REMOTE=voyager.lemmy.ml pnpm dev
```

Finally open `http://0.0.0.0:1234` in your browser. This uses the public test instance `https://voyager.lemmy.ml/` as backend. For more details such as developing with a locally compiled Lemmy backend, read the [documentation](https://join-lemmy.org/docs/contributors/01-overview.html).

## Configuration

The following environment variables can be used to configure lemmy-ui:

| `ENV_VAR`                      | type     | default          | description                                                                         |
| ------------------------------ | -------- | ---------------- | ----------------------------------------------------------------------------------- |
| `LEMMY_UI_HOST`                | `string` | `0.0.0.0:1234`   | The IP / port that the lemmy-ui isomorphic node server is hosted at.                |
| `LEMMY_UI_BACKEND_INTERNAL`    | `string` | `0.0.0.0:8536`   | The internal IP / port that lemmy is hosted at. Often `lemmy:8536` if using docker. |
| `LEMMY_UI_BACKEND_EXTERNAL`    | `string` | `0.0.0.0:8536`   | The external IP / port that lemmy is hosted at. Often `DOMAIN.TLD`.                 |
| `LEMMY_UI_BACKEND_REMOTE`      | `string` | `undefined`      | Domain of a remote Lemmy instance to connect for debugging purposes                 |
| `LEMMY_UI_HTTPS`               | `bool`   | `false`          | Whether to use https.                                                               |
| `LEMMY_UI_EXTRA_THEMES_FOLDER` | `string` | `./extra_themes` | A location for additional lemmy css themes.                                         |
| `LEMMY_UI_DEBUG`               | `bool`   | `false`          | Loads the [Eruda](https://github.com/liriliri/eruda) debugging utility.             |
| `LEMMY_UI_DISABLE_CSP`         | `bool`   | `false`          | Disables CSP security headers                                                       |
| `LEMMY_UI_CUSTOM_HTML_HEADER`  | `string` | `undefined`      | Injects a custom script into `<head>`.                                              |
