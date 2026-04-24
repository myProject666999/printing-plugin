class RangeSelector {
  constructor(plugin) {
    this.plugin = plugin;
    this.selectionMode = false;
    this.selectedElement = null;
    this.overlay = null;
  }

  select(rangeOptions) {
    const { mode, selector, excludeSelectors } = rangeOptions;

    switch (mode) {
      case 'entire':
        return this._selectEntirePage(excludeSelectors);
      case 'element':
        return this._selectBySelector(selector);
      case 'selection':
        return this._getUserSelection();
      default:
        return this._selectEntirePage(excludeSelectors);
    }
  }

  enableSelectionMode(onSelect, onCancel) {
    this.selectionMode = true;
    this._createOverlay();
    this._bindSelectionEvents(onSelect, onCancel);
  }

  disableSelectionMode() {
    this.selectionMode = false;
    this._removeOverlay();
    this._unbindSelectionEvents();
    this.selectedElement = null;
  }

  _selectEntirePage(excludeSelectors) {
    const clone = document.body.cloneNode(true);
    
    if (excludeSelectors && excludeSelectors.length > 0) {
      excludeSelectors.forEach(selector => {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    }

    return clone;
  }

  _selectBySelector(selector) {
    if (!selector) {
      throw new Error('Selector is required for element mode');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }

    return element.cloneNode(true);
  }

  _getUserSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      throw new Error('No text selected');
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      const wrapper = document.createElement('div');
      const clonedRange = range.cloneContents();
      wrapper.appendChild(clonedRange);
      return wrapper;
    }

    return container.cloneNode(true);
  }

  _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      cursor: crosshair;
      pointer-events: none;
    `;
    document.body.appendChild(this.overlay);
  }

  _removeOverlay() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  _bindSelectionEvents(onSelect, onCancel) {
    this._onMouseMove = (e) => {
      if (!this.selectionMode) return;
      this._highlightElement(e.target);
    };

    this._onClick = (e) => {
      if (!this.selectionMode) return;
      e.preventDefault();
      e.stopPropagation();
      
      if (onSelect) {
        this.selectedElement = e.target;
        onSelect(e.target);
      }
    };

    this._onKeyDown = (e) => {
      if (!this.selectionMode) return;
      
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('keydown', this._onKeyDown);
  }

  _unbindSelectionEvents() {
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this._onClick) {
      document.removeEventListener('click', this._onClick, true);
    }
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
    }
  }

  _highlightElement(element) {
    if (this._highlightedElement) {
      this._highlightedElement.style.outline = '';
    }

    element.style.outline = '2px solid #007bff';
    this._highlightedElement = element;
  }
}

export default RangeSelector;
