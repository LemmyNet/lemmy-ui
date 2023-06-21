export default function saveScrollPosition(context: any) {
  const path: string = context.router.route.location.pathname;
  const y = window.scrollY;
  sessionStorage.setItem(`scrollPosition_${path}`, y.toString());
}
