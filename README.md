# lemmy-ui

The official web app for [Lemmy](https://github.com/LemmyNet/lemmy), written in inferno.

Based off of MrFoxPro's [inferno-isomorphic-template](https://github.com/MrFoxPro/inferno-isomorphic-template).

## Configuration

The following environment variables can be used to configure lemmy-ui:

`ENV_VAR` | type | default | description
--- | --- | --- | ---
`LEMMY_UI_HOST` | `string` | `0.0.0.0:1234` | The IP / port that the lemmy-ui isomorphic node server is hosted at.
`LEMMY_UI_LEMMY_INTERNAL_HOST` | `string` | `0.0.0.0:8536` | The internal IP / port that lemmy is hosted at. Often `lemmy:8536` if using docker.
`LEMMY_UI_LEMMY_EXTERNAL_HOST` | `string` | `0.0.0.0:8536` | The external IP / port that lemmy is hosted at. Often `DOMAIN.TLD`.
`LEMMY_UI_LEMMY_WS_HOST` | `string` | `0.0.0.0:8536` | An alternate location for lemmy's websocket address. Not usually necessary.
`LEMMY_UI_HTTPS` | `bool` | `false` | Whether to use https.
`LEMMY_UI_EXTRA_THEMES_FOLDER` | `string` | `./extra_themes` | A location for additional lemmy css themes.
`LEMMY_UI_DEBUG` | `bool` | `false` | Loads the [Eruda](https://github.com/liriliri/eruda) debugging utility.
`LEMMY_UI_DISABLE_CSP` | `bool` | `false` | Disables CSP security headers
`LEMMY_UI_CUSTOM_HTML_HEADER` | `string` | | Injects a custom script into `<head>`.
