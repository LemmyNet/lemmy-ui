import isDark from "./is-dark";

export default function dataBsTheme(user) {
  return (isDark() && user?.local_user_view.local_user.theme === "browser") ||
    (user &&
      ["darkly", "darkly-red", "darkly-pureblack"].includes(
        user.local_user_view.local_user.theme
      ))
    ? "dark"
    : "light";
}
