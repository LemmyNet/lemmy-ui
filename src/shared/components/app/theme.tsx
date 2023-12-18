import { Component } from "@/inferno";
import { Helmet } from "react-helmet";
import { UserService } from "../../services";
import { useEffect } from "react";

interface Props {
  defaultTheme: string;
}

/** TODO: this needs to be fixed and handled in a different way */
export function Theme(props: Props) {
  const user = UserService.Instance.myUserInfo;
  const hasTheme = user?.local_user_view.local_user.theme !== "browser";
  useEffect(() => {
    const l = document.createElement("link");
    l.type = "text/css";
    l.rel = "stylesheet";
    l.href = "/css/themes/darkly.css";
    document.head.appendChild(l);
  }, []);
  return <></>;
  /*
  if (user && hasTheme) {
    return (
      <Helmet>
        <link
          rel="stylesheet"
          type="text/css"
          href={`/css/themes/${user.local_user_view.local_user.theme}.css`}
        />
      </Helmet>
    );
  } else if (
    this.props.defaultTheme !== "browser" &&
    this.props.defaultTheme !== "browser-compact"
  ) {
    return (
      <Helmet>
        <link
          rel="stylesheet"
          type="text/css"
          href={`/css/themes/${this.props.defaultTheme}.css`}
        />
      </Helmet>
    );
  } else if (this.props.defaultTheme === "browser-compact") {
    return (
      <Helmet>
        <link
          rel="stylesheet"
          type="text/css"
          href="/css/themes/litely-compact.css"
          id="default-light"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="/css/themes/darkly-compact.css"
          id="default-dark"
          media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
        />
      </Helmet>
    );
  } else {
    return (
      <Helmet>
        <link
          rel="stylesheet"
          type="text/css"
          href="/css/themes/litely.css"
          id="default-light"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="/css/themes/darkly.css"
          id="default-dark"
          media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
        />
      </Helmet>
    );
  }*/
}
