import { User_ } from 'lemmy-js-client';
import { Helmet } from 'inferno-helmet';
import { Component } from 'inferno';

interface Props {
  user: User_ | undefined;
}

export class Theme extends Component<Props> {
  render() {
    const { user } = this.props;
    const hasUserTheme = user && user.theme !== 'browser';

    return (
      <Helmet>
        {hasUserTheme ? (
          <link
            rel="stylesheet"
            type="text/css"
            href={`/static/assets/css/themes/${user.theme}.min.css`}
          />
        ) : (
          [
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/litely.min.css"
              id="default-light"
              media="(prefers-color-scheme: light)"
            />,
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/darkly.min.css"
              id="default-dark"
              media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
            />,
          ]
        )}
      </Helmet>
    );
  }
}
