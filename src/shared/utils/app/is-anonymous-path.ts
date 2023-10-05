export default function isAnonymousPath(pathname: string) {
  return /^\/(login.*|signup|password_change.*|verify_email.*)\b/g.test(
    pathname,
  );
}
