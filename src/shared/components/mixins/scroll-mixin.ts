import { isBrowser, nextUserAction, snapToTop } from "../../utils/browser";
import { Component, InfernoNode } from "inferno";
import { Location } from "history";

function restoreScrollPosition(props: { location: Location }) {
  const key: string = props.location.key;
  const y = sessionStorage.getItem(`scrollPosition_${key}`);

  if (y !== null) {
    window.scrollTo({ left: 0, top: Number(y), behavior: "instant" });
  }
}

function saveScrollPosition(props: { location: Location }) {
  const key: string = props.location.key;

  const y = window.scrollY;

  sessionStorage.setItem(`scrollPosition_${key}`, y.toString());
}

function dropScrollPosition(props: { location: Location }) {
  const key: string = props.location.key;
  sessionStorage.removeItem(`scrollPosition_${key}`);
}

export function scrollMixin<
  P extends { location: Location },
  S,
  Base extends new (
    ...args: any
  ) => Component<P, S> & { loadingSettled(): boolean },
>(base: Base, _context?: ClassDecoratorContext<Base>) {
  return class extends base {
    private stopUserListener: (() => void) | undefined;
    private blocked?: string;

    constructor(...args: any[]) {
      super(...args);

      if (!isBrowser()) {
        return;
      }

      this.reset();
    }

    componentDidMount() {
      this.restoreIfLoaded();
      return super.componentDidMount?.();
    }

    componentDidUpdate(
      prevProps: Readonly<{ children?: InfernoNode } & P>,
      prevState: S,
      snapshot: any,
    ) {
      this.restoreIfLoaded();
      return super.componentDidUpdate?.(prevProps, prevState, snapshot);
    }

    componentWillUnmount() {
      this.saveFinalPosition();
      return super.componentWillUnmount?.();
    }

    componentWillReceiveProps(
      nextProps: Readonly<{ children?: InfernoNode } & P>,
      nextContext: any,
    ) {
      // Currently this is hypothetical. Components unmount before route changes.
      if (this.props.location.key !== nextProps.location.key) {
        this.saveFinalPosition();
        this.reset();
      }
      return super.componentWillReceiveProps?.(nextProps, nextContext);
    }

    unloadListeners = () => {
      // Browsers restore the position after reload, but not after pressing
      // Enter in the url bar. It's hard to distinguish the two, let the
      // browser do its thing.
      window.history.scrollRestoration = "auto";
      dropScrollPosition(this.props);
    };

    reset() {
      this.blocked = undefined;
      this.stopUserListener?.();
      // While inferno is rendering no events are dispatched. This only catches
      // user interactions when network responses are slow/late.
      this.stopUserListener = nextUserAction(() => {
        this.preventRestore();
      });
      window.removeEventListener("beforeunload", this.unloadListeners);
      window.addEventListener("beforeunload", this.unloadListeners);
    }

    savePosition() {
      saveScrollPosition(this.props);
    }

    saveFinalPosition() {
      this.savePosition();
      snapToTop();
      window.removeEventListener("beforeunload", this.unloadListeners);
    }

    preventRestore() {
      this.blocked = this.props.location.key;
      this.stopUserListener?.();
      this.stopUserListener = undefined;
    }

    restore() {
      restoreScrollPosition(this.props);
      this.preventRestore();
    }

    restoreIfLoaded() {
      if (!this.isPending() || !this.loadingSettled()) {
        return;
      }
      this.restore();
    }

    isPending() {
      return this.blocked !== this.props.location.key;
    }
  };
}

export function simpleScrollMixin<
  P extends { location: Location },
  S,
  Base extends new (...args: any) => Component<P, S>,
>(base: Base, _context?: ClassDecoratorContext<Base>) {
  @scrollMixin
  class SimpleScrollMixin extends base {
    loadingSettled() {
      return true;
    }
  }
  return SimpleScrollMixin;
}
