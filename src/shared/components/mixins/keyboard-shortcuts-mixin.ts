import { Component } from "inferno";
import { isBrowser } from "@utils/browser";
import {
  areKeyboardShortcutsEnabled,
  shouldIgnoreEvent,
} from "@utils/keyboard-shortcuts";
import { handleKeyboardAction } from "@utils/keyboard-shortcuts-handler";
import { KeyboardNavigationController } from "@utils/keyboard-navigation-controller";
import {
  CreatePostLike,
  CreateCommentLike,
  SavePost,
  SaveComment,
  MyUserInfo,
} from "lemmy-js-client";
import { TContextRouter } from "inferno-router/dist/Router";
import type { ContentItem } from "@utils/keyboard-shortcuts-actions";

/**
 * Interface for components that can use keyboard shortcuts for navigation
 * Generic over the item type (PostView, PersonContentCombinedView, etc.)
 */
export interface KeyboardShortcutsComponent<T> {
  // Required: Get the list of items to navigate
  getItems(): T[];

  // Required: Get current highlighted index
  getCurrentIndex(): number;

  // Required: Set highlighted index
  setCurrentIndex(index: number): void;

  // Required: Scroll to item at index
  scrollToIndex(index: number): void;

  // Optional: Handle component-specific custom keys
  // Return true if the key was handled, false otherwise
  handleCustomKeys?(event: KeyboardEvent, currentItem: T): boolean;

  // Optional: Props and context for actions
  props?: {
    myUserInfo?: MyUserInfo;
    viewOnly?: boolean;
    onPostVote?: (form: CreatePostLike) => void;
    onCommentVote?: (form: CreateCommentLike) => void;
    onSavePost?: (form: SavePost) => void;
    onSaveComment?: (form: SaveComment) => void;
  };
  context?: {
    router?: TContextRouter;
  };
}

/**
 * Generic mixin that adds keyboard shortcuts for navigation and actions
 *
 * Usage:
 * ```typescript
 * @keyboardShortcutsMixin
 * export class MyComponent extends Component<Props, State>
 *   implements KeyboardShortcutsComponent<ItemType> {
 *
 *   getItems() { return this.props.items; }
 *   getCurrentIndex() { return this.state.highlightedIndex; }
 *   setCurrentIndex(idx) { this.setState({ highlightedIndex: idx }); }
 *   scrollToIndex(idx) { ... }
 * }
 * ```
 *
 * @typeParam T - The item type (PostView, CommentView, PersonContentCombinedView)
 * @typeParam P - Component props type
 * @typeParam S - Component state type (must include highlightedIndex: number)
 * @typeParam Base - The base component class being decorated
 */
export function keyboardShortcutsMixin<
  T extends ContentItem,
  P,
  S extends { highlightedIndex: number },
  Base extends new (
    ...args: any[]
  ) => Component<P, S> & KeyboardShortcutsComponent<T>,
>(base: Base, _context?: ClassDecoratorContext<Base>) {
  return class extends base {
    private keyboardHandler?: (event: KeyboardEvent) => void;
    private navigationController = new KeyboardNavigationController(
      () => this.getItems(),
      () => this.getCurrentIndex(),
      index => this.setCurrentIndex(index),
      index => this.scrollToIndex(index),
    );

    componentDidMount() {
      super.componentDidMount?.();

      if (isBrowser() && areKeyboardShortcutsEnabled()) {
        this.keyboardHandler = this.handleKeyDown.bind(this);
        document.addEventListener(
          "keydown",
          this.keyboardHandler as EventListener,
        );
      }
    }

    componentWillUnmount() {
      super.componentWillUnmount?.();

      if (this.keyboardHandler) {
        document.removeEventListener(
          "keydown",
          this.keyboardHandler as EventListener,
        );
      }
    }

    handleKeyDown = (event: KeyboardEvent) => {
      if (!areKeyboardShortcutsEnabled() || shouldIgnoreEvent(event)) {
        return;
      }

      const items = this.getItems();

      // Allow custom keys even with no items (for pagination, etc.)
      if (items.length === 0) {
        if (this.handleCustomKeys) {
          // Call with null item since there are no items
          this.handleCustomKeys(event, null as any);
        }
        return;
      }

      // Handle navigation keys with controller
      if (this.navigationController.handleNavigationKey(event)) {
        event.preventDefault();
        return;
      }

      const currentIndex = this.getCurrentIndex();
      const currentItem = items[currentIndex];

      // Handle action keys with shared utility
      handleKeyboardAction(event, currentItem, {
        myUserInfo: this.props?.myUserInfo,
        router: this.context?.router,
        onPostVote: this.props?.onPostVote,
        onCommentVote: this.props?.onCommentVote,
        onSavePost: this.props?.onSavePost,
        onSaveComment: this.props?.onSaveComment,
        viewOnly: this.props?.viewOnly,
        customKeyHandler: this.handleCustomKeys
          ? (e, item) => this.handleCustomKeys!(e, item as T)
          : undefined,
      });
    };
  };
}
