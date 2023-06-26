export default function restoreScrollPosition(context: any) {
  const path: string = context.router.route.location.pathname;
  const y = Number(sessionStorage.getItem(`scrollPosition_${path}`));

  window.scrollTo(0, y);
}
