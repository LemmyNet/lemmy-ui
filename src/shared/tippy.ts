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
let instanceCounter = 0;

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
  onCreate() {
    instanceCounter++;
  },
  onDestroy(i: TippyInstance<TippyProps>) {
    // Tippy doesn't remove its onDocumentPress listener when destroyed.
    // Instead the listener removes itself after calling hide for hideOnClick.
    const origHide = i.hide;
    // This silences the first warning when hiding a destroyed tippy instance.
    // hide() is otherwise a noop for destroyed instances.
    i.hide = () => {
      i.hide = origHide;
    };
  },
};

export function setupTippy(root: RefObject<Element>) {
  if (!instance && root.current) {
    instance = tippyDelegate(root.current, tippyDelegateOptions);
  }
}

export function cleanupTippy() {
  if (shownInstances.size || instanceCounter < 10) {
    // Avoid randomly closing tooltips.
    return;
  }
  instanceCounter = 0;
  const current = instance?.reference ?? null;
  // delegate from tippy.js creates tippy instances when needed, but only
  // destroys them when the delegate instance is destroyed.
  destroyTippy();
  setupTippy({ current });
}

export function destroyTippy() {
  instance?.destroy();
  instance = undefined;
}
