/**
 * Reusable keyboard navigation controller for list-based components
 * Handles j/k/J/K navigation patterns with automatic scrolling
 */
export class KeyboardNavigationController<T> {
  constructor(
    private getItems: () => T[],
    private getCurrentIndex: () => number,
    private setCurrentIndex: (index: number) => void,
    private scrollToIndex: (index: number) => void,
  ) {}

  /**
   * Handle navigation keys (j/k/J/K)
   * Returns true if key was handled, false otherwise
   */
  handleNavigationKey(event: KeyboardEvent): boolean {
    const items = this.getItems();
    if (items.length === 0) return false;

    const currentIndex = this.getCurrentIndex();

    switch (event.key) {
      case "j": // Next item
        if (currentIndex + 1 === items.length) {
          // At last item, scroll to bottom
          window.scrollTo(0, document.body.scrollHeight);
        } else {
          this.navigateToIndex(currentIndex + 1);
        }
        return true;

      case "k": // Previous item
        if (currentIndex > 0) {
          this.navigateToIndex(currentIndex - 1);
        } else {
          // At first item, scroll to top
          window.scrollTo(0, 0);
        }
        return true;

      case "J": // Last item
        this.navigateToIndex(items.length - 1);
        window.scrollTo(0, document.body.scrollHeight);
        return true;

      case "K": // First item
        this.navigateToIndex(0);
        window.scrollTo(0, 0);
        return true;

      default:
        return false;
    }
  }

  private navigateToIndex(newIndex: number) {
    const items = this.getItems();
    if (newIndex >= 0 && newIndex < items.length) {
      this.setCurrentIndex(newIndex);
      this.scrollToIndex(newIndex);
    }
  }
}
