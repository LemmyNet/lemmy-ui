import { User } from 'lemmy-js-client';
import { Helmet } from 'inferno-helmet';

export const Theme = (props: { user: User | undefined }) => {
  const user = props.user;
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
};
