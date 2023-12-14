import { ReactNode } from "react";
// shim from inferno to react

export {
  Component,
  createRef,
  type RefObject,
  type MouseEvent as InfernoMouseEvent,
  type KeyboardEvent as InfernoKeyboardEvent,
  type MouseEventHandler,
  type FormEventHandler,
  type ChangeEvent,
} from "react";

/** mhh curry */
export function linkEvent<T, E, R>(t: T, fn: (t: T, ev: E) => R): (ev: E) => R {
  return ev => fn(t, ev);
}

export type InfernoNode = ReactNode;
