import { RouteComponentProps } from "inferno-router/dist/Route";

// Intended to allow reloading all the data of the current page by clicking the
// navigation link of the current page.
export default function bareRoutePush<P extends RouteComponentProps<any>>(
  prevProps: P,
  nextProps: P,
) {
  return (
    prevProps.location.pathname === nextProps.location.pathname &&
    !nextProps.location.search &&
    nextProps.history.action === "PUSH"
  );
}
