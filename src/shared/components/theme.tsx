import { User } from 'lemmy-js-client';
import { Helmet } from 'inferno-helmet';
import { Component } from 'inferno';

interface Props {
  user: User | undefined;
}

export class Theme extends Component<Props> {
  render() {
    const { user } = this.props;
    const userTheme = user && user.theme && (
      <link
        rel="stylesheet"
        type="text/css"
        href={`/static/assets/css/themes/${user.theme}.min.css`}
      />
    );

    return (
      <Helmet>
        {userTheme ?? (
          <>
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/litely.min.css"
              id="default-light"
              media="(prefers-color-scheme: light)"
            />
            <link
              rel="stylesheet"
              type="text/css"
              href="/static/assets/css/themes/darkly.min.css"
              id="default-dark"
              media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
            />
          </>
        )}
      </Helmet>
    );
  }
}
