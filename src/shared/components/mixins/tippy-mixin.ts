import { Component, InfernoNode } from "inferno";
import { cleanupTippy } from "../../tippy";

export function tippyMixin<
  P,
  S,
  Base extends new (...args: any) => Component<P, S>,
>(base: Base, _context?: ClassDecoratorContext<Base>) {
  return class extends base {
    componentDidUpdate(
      prevProps: P & { children?: InfernoNode },
      prevState: S,
      snapshot: any,
    ) {
      // For conditional rendering, old tippy instances aren't reused
      cleanupTippy();
      return super.componentDidUpdate?.(prevProps, prevState, snapshot);
    }

    componentWillUnmount() {
      cleanupTippy();
      return super.componentWillUnmount?.();
    }
  };
}
