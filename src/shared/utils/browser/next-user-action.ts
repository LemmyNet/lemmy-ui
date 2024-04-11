const eventTypes = ["mousedown", "keydown", "touchstart", "touchmove", "wheel"];

const scrollThreshold = 2;

type Continue = boolean | void;

export default function nextUserAction(cb: (e: Event) => Continue) {
  const eventTarget = window.document.body;

  let cleanup: (() => void) | undefined = () => {
    cleanup = undefined;
    eventTypes.forEach(ev => {
      eventTarget.removeEventListener(ev, listener);
    });
    window.removeEventListener("scroll", scrollListener);
  };

  const listener = (e: Event) => {
    if (!cb(e)) {
      cleanup?.();
    }
  };
  eventTypes.forEach(ev => {
    eventTarget.addEventListener(ev, listener);
  });

  let remaining = scrollThreshold;
  const scrollListener = (e: Event) => {
    // This only has to cover the scrollbars. The problem is that scroll events
    // are also fired when the document height shrinks below the current bottom
    // edge of the window.
    remaining--;
    if (remaining < 0) {
      if (!cb(e)) {
        cleanup?.();
      } else {
        remaining = scrollThreshold;
      }
    }
  };
  window.addEventListener("scroll", scrollListener);

  return () => {
    cleanup?.();
  };
}
