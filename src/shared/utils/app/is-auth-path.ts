export default function isAuthPath(pathname: string) {
  return /^\/(create_.*?|inbox|settings|admin|reports|registration_applications|activitypub.*?)\b/g.test(
    pathname
  );
}
