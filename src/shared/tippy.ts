import { RefObject } from "inferno";
import {
  DelegateInstance as TippyDelegateInstance,
  Props as TippyProps,
  Instance as TippyInstance,
  delegate as tippyDelegate,
} from "tippy.js";

let instance: TippyDelegateInstance<TippyProps> | undefined;
const tippySelector = "[data-tippy-content]";
const shownInstances: Set<TippyInstance<TippyProps>> = new Set();

const tippyDelegateOptions: Partial<TippyProps> & { target: string } = {
  delay: [500, 0],
  // Display on "long press"
  touch: ["hold", 500],
  target: tippySelector,
  onShow(i: TippyInstance<TippyProps>) {
    shownInstances.add(i);
  },
  onHidden(i: TippyInstance<TippyProps>) {
    shownInstances.delete(i);
  },
};

export function setupTippy(root: RefObject<Element>) {
  if (!instance && root.current) {
    instance = tippyDelegate(root.current, tippyDelegateOptions);
  }
}

let requested = false;
export function cleanupTippy() {
  if (requested) {
    return;
  }
  requested = true;
  queueMicrotask(() => {
    requested = false;
    if (shownInstances.size) {
      // Avoid randomly closing tooltips.
      return;
    }
    // delegate from tippy.js creates tippy instances when needed, but only
    // destroys them when the delegate instance is destroyed.
    const current = instance?.reference ?? null;
    destroyTippy();
    setupTippy({ current });
  });
}

export function destroyTippy() {
  instance?.destroy();
  instance = undefined;
}
