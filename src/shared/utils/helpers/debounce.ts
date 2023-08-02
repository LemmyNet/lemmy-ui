export default function debounce<T extends any[], R>(
  func: (...e: T) => R,
  wait = 1000,
  immediate = false,
) {
  let timeout: NodeJS.Timeout | null;

  return function () {
    const args = arguments;
    const callNow = immediate && !timeout;

    clearTimeout(timeout ?? undefined);

    timeout = setTimeout(function () {
      timeout = null;

      if (!immediate) {
        func.apply(this, args);
      }
    }, wait);

    if (callNow) func.apply(this, args);
  } as (...e: T) => R;
}
