class TemplateDesigner {
  constructor(plugin) {
    this.plugin = plugin;
    this.container = null;
    this.elements = [];
    this.selectedElement = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.canvas = null;
    this.toolbox = null;
    this.propertyPanel = null;
    this.undoStack = [];
    this.redoStack = [];
    this.snapToGrid = true;
    this.gridSize = 10;
    this.zoom = 1;
  }

  init(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;

    if (!this.container) {
      throw new Error('Container not found for template designer');
    }

    this.options = {
      canvasWidth: 595,
      canvasHeight: 842,
      showGrid: true,
      showRulers: true,
      elements: [
        'text', 'image', 'line', 'rect', 'table', 'barcode', 'qrcode'
      ],
      ...options,
    };

    this._render();
    this._bindEvents();
    
    return this;
  }

  _render() {
    this.container.innerHTML = `
      <div class="print-designer">
        <div class="print-designer-toolbar">
          <div class="toolbar-left">
            <button class="designer-btn" data-action="undo" title="撤销">
              <span>↶</span>
            </button>
            <button class="designer-btn" data-action="redo" title="重做">
              <span>↷</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="designer-btn" data-action="selectAll" title="全选">
              <span>␣</span>
            </button>
            <button class="designer-btn" data-action="copy" title="复制">
              <span>⧉</span>
            </button>
            <button class="designer-btn" data-action="delete" title="删除">
              <span>⌫</span>
            </button>
            <div class="toolbar-divider"></div>
            <div class="toolbar-group">
              <label>缩放:</label>
              <select class="designer-select" data-action="zoom">
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1" selected>100%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
              </select>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="designer-btn designer-btn-primary" data-action="preview">
              预览
            </button>
            <button class="designer-btn designer-btn-success" data-action="save">
              保存
            </button>
          </div>
        </div>
        
        <div class="print-designer-content">
          <div class="print-designer-toolbox">
            <div class="toolbox-title">元素</div>
            <div class="toolbox-items">
              <div class="toolbox-item" draggable="true" data-type="text">
                <span class="toolbox-icon">T</span>
                <span class="toolbox-label">文本</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="image">
                <span class="toolbox-icon">🖼</span>
                <span class="toolbox-label">图片</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="line">
                <span class="toolbox-icon">―</span>
                <span class="toolbox-label">线条</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="rect">
                <span class="toolbox-icon">▢</span>
                <span class="toolbox-label">矩形</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="table">
                <span class="toolbox-icon">⊞</span>
                <span class="toolbox-label">表格</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="barcode">
                <span class="toolbox-icon">∥</span>
                <span class="toolbox-label">条形码</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="qrcode">
                <span class="toolbox-icon">▣</span>
                <span class="toolbox-label">二维码</span>
              </div>
            </div>
            
            <div class="toolbox-title">数据字段</div>
            <div class="toolbox-items" id="data-fields">
              <div class="toolbox-item" draggable="true" data-type="field" data-field="orderNo">
                <span class="toolbox-icon">{{</span>
                <span class="toolbox-label">订单号</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="field" data-field="customerName">
                <span class="toolbox-icon">{{</span>
                <span class="toolbox-label">客户名称</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="field" data-field="totalAmount">
                <span class="toolbox-icon">{{</span>
                <span class="toolbox-label">总金额</span>
              </div>
              <div class="toolbox-item" draggable="true" data-type="field" data-field="date">
                <span class="toolbox-icon">{{</span>
                <span class="toolbox-label">日期</span>
              </div>
            </div>
          </div>
          
          <div class="print-designer-canvas-wrapper">
            <div class="print-designer-ruler print-designer-ruler-top" id="ruler-top"></div>
            <div class="print-designer-ruler print-designer-ruler-left" id="ruler-left"></div>
            <div class="print-designer-canvas-container" id="canvas-container">
              <div class="print-designer-canvas" id="designer-canvas">
                <div class="print-canvas-background"></div>
              </div>
            </div>
          </div>
          
          <div class="print-designer-properties">
            <div class="properties-title">属性</div>
            <div class="properties-content" id="properties-panel">
              <div class="no-selection-message">
                选择一个元素以编辑其属性
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._addStyles();
    
    this.canvas = this.container.querySelector('#designer-canvas');
    this.toolbox = this.container.querySelector('.print-designer-toolbox');
    this.propertyPanel = this.container.querySelector('#properties-panel');
    
    this._setupCanvas();
    this._setupRulers();
  }

  _addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .print-designer {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #333;
        background: #f5f5f5;
      }

      .print-designer-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: #fff;
        border-bottom: 1px solid #e0e0e0;
        min-height: 48px;
      }

      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .toolbar-divider {
        width: 1px;
        height: 24px;
        background: #e0e0e0;
        margin: 0 8px;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toolbar-group label {
        color: #666;
        font-size: 12px;
      }

      .designer-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 12px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        background: #fff;
        color: #333;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }

      .designer-btn:hover {
        background: #f5f5f5;
        border-color: #b0b0b0;
      }

      .designer-btn:active {
        background: #e8e8e8;
      }

      .designer-btn-primary {
        background: #1890ff;
        border-color: #1890ff;
        color: #fff;
      }

      .designer-btn-primary:hover {
        background: #40a9ff;
        border-color: #40a9ff;
      }

      .designer-btn-success {
        background: #52c41a;
        border-color: #52c41a;
        color: #fff;
      }

      .designer-btn-success:hover {
        background: #73d13d;
        border-color: #73d13d;
      }

      .designer-select {
        padding: 5px 8px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        background: #fff;
        font-size: 13px;
        cursor: pointer;
      }

      .print-designer-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .print-designer-toolbox {
        width: 180px;
        background: #fff;
        border-right: 1px solid #e0e0e0;
        overflow-y: auto;
        flex-shrink: 0;
      }

      .toolbox-title {
        padding: 12px 16px;
        font-weight: 600;
        color: #333;
        border-bottom: 1px solid #e0e0e0;
        background: #fafafa;
      }

      .toolbox-items {
        padding: 8px;
      }

      .toolbox-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 6px;
        cursor: grab;
        transition: all 0.2s;
        margin-bottom: 4px;
      }

      .toolbox-item:hover {
        background: #f0f7ff;
      }

      .toolbox-item:active {
        cursor: grabbing;
      }

      .toolbox-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e6f4ff;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        color: #1890ff;
      }

      .toolbox-label {
        font-size: 13px;
        color: #333;
      }

      .print-designer-canvas-wrapper {
        flex: 1;
        display: flex;
        position: relative;
        overflow: auto;
        background: #e0e0e0;
      }

      .print-designer-ruler {
        background: #fafafa;
        border: 1px solid #e0e0e0;
        position: absolute;
        z-index: 10;
      }

      .print-designer-ruler-top {
        top: 0;
        left: 30px;
        right: 0;
        height: 30px;
      }

      .print-designer-ruler-left {
        top: 30px;
        left: 0;
        width: 30px;
        bottom: 0;
      }

      .print-designer-canvas-container {
        flex: 1;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 60px;
        overflow: auto;
        position: relative;
      }

      .print-designer-canvas {
        position: relative;
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        transform-origin: top left;
      }

      .print-canvas-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        background-image: 
          linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
        background-size: 10px 10px;
      }

      .designer-element {
        position: absolute;
        border: 1px solid transparent;
        cursor: move;
        box-sizing: border-box;
      }

      .designer-element:hover {
        border-color: #1890ff;
      }

      .designer-element.selected {
        border: 2px solid #1890ff;
        outline: none;
      }

      .designer-element.selected .resize-handle {
        display: block;
      }

      .resize-handle {
        display: none;
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border: 1px solid #1890ff;
        border-radius: 1px;
        z-index: 20;
      }

      .resize-handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
      .resize-handle.n  { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
      .resize-handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
      .resize-handle.e  { top: 50%; right: -4px; transform: translateY(-50%); cursor: e-resize; }
      .resize-handle.se { bottom: -4px; right: -4px; cursor: se-resize; }
      .resize-handle.s  { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
      .resize-handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
      .resize-handle.w  { top: 50%; left: -4px; transform: translateY(-50%); cursor: w-resize; }

      .element-text {
        padding: 4px;
        min-width: 80px;
        min-height: 20px;
        line-height: 1.4;
      }

      .element-text.editable {
        outline: none;
      }

      .element-field {
        padding: 4px;
        min-width: 80px;
        min-height: 20px;
        background: #fff3e0;
        border-radius: 2px;
        color: #e65100;
        font-family: monospace;
        font-size: 12px;
      }

      .element-image {
        background: #f5f5f5;
        background-image: linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
                          linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
                          linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      }

      .element-line {
        background: transparent;
        border: none !important;
      }

      .element-line-content {
        position: absolute;
        background: #333;
        transform-origin: left center;
      }

      .element-rect {
        background: transparent;
        border: 2px solid #333;
      }

      .element-table {
        border: 1px solid #e0e0e0;
        font-size: 12px;
      }

      .element-table table {
        width: 100%;
        height: 100%;
        border-collapse: collapse;
      }

      .element-table td,
      .element-table th {
        border: 1px solid #e0e0e0;
        padding: 4px 8px;
        text-align: left;
      }

      .print-designer-properties {
        width: 240px;
        background: #fff;
        border-left: 1px solid #e0e0e0;
        overflow-y: auto;
        flex-shrink: 0;
      }

      .properties-title {
        padding: 12px 16px;
        font-weight: 600;
        color: #333;
        border-bottom: 1px solid #e0e0e0;
        background: #fafafa;
      }

      .properties-content {
        padding: 16px;
      }

      .no-selection-message {
        color: #999;
        text-align: center;
        padding: 40px 0;
        font-size: 13px;
      }

      .property-group {
        margin-bottom: 16px;
      }

      .property-group-title {
        font-size: 12px;
        color: #666;
        font-weight: 600;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #f0f0f0;
      }

      .property-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }

      .property-label {
        width: 70px;
        font-size: 12px;
        color: #666;
        flex-shrink: 0;
      }

      .property-input {
        flex: 1;
        padding: 5px 8px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-size: 12px;
        transition: border-color 0.2s;
      }

      .property-input:focus {
        outline: none;
        border-color: #1890ff;
      }

      .property-select {
        flex: 1;
        padding: 5px 8px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-size: 12px;
        background: #fff;
      }

      .property-color {
        width: 60px;
        height: 28px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
      }
    `;
    
    document.head.appendChild(style);
  }

  _setupCanvas() {
    this.canvas.style.width = this.options.canvasWidth + 'px';
    this.canvas.style.height = this.options.canvasHeight + 'px';
  }

  _setupRulers() {
    const rulerTop = this.container.querySelector('#ruler-top');
    const rulerLeft = this.container.querySelector('#ruler-left');
    
    if (rulerTop) {
      rulerTop.innerHTML = this._generateRulerMarks('horizontal', this.options.canvasWidth);
    }
    if (rulerLeft) {
      rulerLeft.innerHTML = this._generateRulerMarks('vertical', this.options.canvasHeight);
    }
  }

  _generateRulerMarks(direction, length) {
    let html = '';
    const step = 10;
    
    for (let i = 0; i <= length; i += step) {
      const isMajor = i % 50 === 0;
      const isMinor = i % 10 === 0;
      
      if (isMajor) {
        if (direction === 'horizontal') {
          html += `<div style="position:absolute;left:${i}px;bottom:0;width:1px;height:15px;background:#999;"></div>`;
          html += `<div style="position:absolute;left:${i + 2}px;top:2px;font-size:10px;color:#666;">${i}</div>`;
        } else {
          html += `<div style="position:absolute;top:${i}px;right:0;width:15px;height:1px;background:#999;"></div>`;
          html += `<div style="position:absolute;top:${i - 6}px;left:2px;font-size:10px;color:#666;writing-mode:vertical-lr;">${i}</div>`;
        }
      } else if (isMinor) {
        if (direction === 'horizontal') {
          html += `<div style="position:absolute;left:${i}px;bottom:0;width:1px;height:8px;background:#ccc;"></div>`;
        } else {
          html += `<div style="position:absolute;top:${i}px;right:0;width:8px;height:1px;background:#ccc;"></div>`;
        }
      }
    }
    
    return html;
  }

  _bindEvents() {
    const toolboxItems = this.toolbox.querySelectorAll('.toolbox-item');
    
    toolboxItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('type', item.dataset.type);
        e.dataTransfer.setData('field', item.dataset.field || '');
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('type');
      const field = e.dataTransfer.getData('field');
      
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.zoom;
      const y = (e.clientY - rect.top) / this.zoom;
      
      this._addElement(type, x, y, field);
    });

    this.canvas.addEventListener('click', (e) => {
      if (e.target === this.canvas || e.target.classList.contains('print-canvas-background')) {
        this._deselectAll();
      }
    });

    const toolbar = this.container.querySelector('.print-designer-toolbar');
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.designer-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      switch (action) {
        case 'undo':
          this.undo();
          break;
        case 'redo':
          this.redo();
          break;
        case 'selectAll':
          this._selectAll();
          break;
        case 'copy':
          this._copySelected();
          break;
        case 'delete':
          this._deleteSelected();
          break;
        case 'preview':
          this._preview();
          break;
        case 'save':
          this._save();
          break;
      }
    });

    const zoomSelect = toolbar.querySelector('[data-action="zoom"]');
    if (zoomSelect) {
      zoomSelect.addEventListener('change', (e) => {
        this.setZoom(parseFloat(e.target.value));
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            break;
          case 'c':
            if (this.selectedElement) {
              this._copySelected();
            }
            break;
          case 'v':
            this._pasteClipboard();
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            if (this.selectedElement && !e.target.matches('input, textarea')) {
              this._deleteSelected();
            }
            break;
          case 'ArrowLeft':
            if (this.selectedElement) {
              e.preventDefault();
              this._nudgeElement(this.selectedElement, -1, 0);
            }
            break;
          case 'ArrowRight':
            if (this.selectedElement) {
              e.preventDefault();
              this._nudgeElement(this.selectedElement, 1, 0);
            }
            break;
          case 'ArrowUp':
            if (this.selectedElement) {
              e.preventDefault();
              this._nudgeElement(this.selectedElement, 0, -1);
            }
            break;
          case 'ArrowDown':
            if (this.selectedElement) {
              e.preventDefault();
              this._nudgeElement(this.selectedElement, 0, 1);
            }
            break;
        }
      }
    });
  }

  _addElement(type, x, y, field = '') {
    this._saveState();

    const id = 'element-' + Date.now();
    let element;
    
    const defaultStyles = {
      position: 'absolute',
      left: this.snapToGrid ? Math.round(x / this.gridSize) * this.gridSize : x,
      top: this.snapToGrid ? Math.round(y / this.gridSize) * this.gridSize : y,
      boxSizing: 'border-box',
    };

    switch (type) {
      case 'text':
        element = this._createTextElement(id, defaultStyles);
        break;
      
      case 'field':
        element = this._createFieldElement(id, defaultStyles, field);
        break;
      
      case 'image':
        element = this._createImageElement(id, defaultStyles);
        break;
      
      case 'line':
        element = this._createLineElement(id, defaultStyles);
        break;
      
      case 'rect':
        element = this._createRectElement(id, defaultStyles);
        break;
      
      case 'table':
        element = this._createTableElement(id, defaultStyles);
        break;
      
      case 'barcode':
        element = this._createBarcodeElement(id, defaultStyles);
        break;
      
      case 'qrcode':
        element = this._createQRCodeElement(id, defaultStyles);
        break;
      
      default:
        return;
    }

    this.canvas.appendChild(element);
    
    const elementData = {
      id,
      type,
      field,
      element,
      x: defaultStyles.left,
      y: defaultStyles.top,
      width: parseInt(element.style.width) || 100,
      height: parseInt(element.style.height) || 30,
    };
    
    this.elements.push(elementData);
    this._selectElement(element);
  }

  _createTextElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-text editable';
    el.contentEditable = 'true';
    el.textContent = '双击编辑文本';
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 150px;
      height: 30px;
      font-size: 14px;
      color: #333;
      line-height: 1.4;
    `;
    
    this._addResizeHandles(el);
    
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      el.focus();
    });
    
    el.addEventListener('blur', () => {
      this._updatePropertyPanel();
    });

    return el;
  }

  _createFieldElement(id, styles, field) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-field';
    el.textContent = `{{ ${field} }}`;
    el.dataset.field = field;
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 120px;
      height: 24px;
      font-size: 12px;
      font-family: monospace;
      color: #e65100;
      background: #fff3e0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 4px 8px;
    `;
    
    this._addResizeHandles(el);
    return el;
  }

  _createImageElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-image';
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 100px;
      height: 100px;
      border: 1px dashed #ccc;
    `;
    
    this._addResizeHandles(el);
    
    el.addEventListener('dblclick', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            el.style.backgroundImage = `url(${ev.target.result})`;
            el.style.backgroundSize = 'contain';
            el.style.backgroundPosition = 'center';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.border = 'none';
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });

    return el;
  }

  _createLineElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-line';
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 100px;
      height: 30px;
    `;
    
    const line = document.createElement('div');
    line.className = 'element-line-content';
    line.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: #333;
      transform: translateY(-50%);
    `;
    el.appendChild(line);
    
    this._addResizeHandles(el);
    return el;
  }

  _createRectElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-rect';
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 100px;
      height: 60px;
      border: 2px solid #333;
      background: transparent;
    `;
    
    this._addResizeHandles(el);
    return el;
  }

  _createTableElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element element-table';
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 200px;
      height: 80px;
    `;
    
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>列1</th>
          <th>列2</th>
          <th>列3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>数据1</td>
          <td>数据2</td>
          <td>数据3</td>
        </tr>
        <tr>
          <td>数据4</td>
          <td>数据5</td>
          <td>数据6</td>
        </tr>
      </tbody>
    `;
    el.appendChild(table);
    
    this._addResizeHandles(el);
    return el;
  }

  _createBarcodeElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element';
    el.dataset.type = 'barcode';
    el.dataset.content = '1234567890';
    
    const content = el.dataset.content;
    const barcodeHTML = this._generateBarcodeHTML(content);
    
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 150px;
      height: 50px;
      background: #fff;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4px;
      font-size: 12px;
      color: #333;
    `;
    el.innerHTML = `${barcodeHTML}<div style="margin-top: 4px; font-size: 10px; font-family: monospace;">${content}</div>`;
    
    this._addResizeHandles(el);
    return el;
  }
  
  _generateBarcodeHTML(content) {
    if (!content) return '';
    
    let bars = '';
    for (let i = 0; i < content.length; i++) {
      const charCode = content.charCodeAt(i);
      const pattern = (charCode % 7) + 1;
      for (let j = 0; j < pattern; j++) {
        bars += (i + j) % 2 === 0 ? '1' : '0';
      }
    }
    
    bars = '101' + bars + '101';
    
    let html = '<div style="display: flex; align-items: center; height: 30px;">';
    for (let i = 0; i < bars.length; i++) {
      const isBar = bars[i] === '1';
      const width = (i % 3 === 0) ? 2 : 1;
      html += `<div style="width: ${width}px; height: 100%; background: ${isBar ? '#000' : '#fff'};"></div>`;
    }
    html += '</div>';
    
    return html;
  }
  
  _updateBarcodeDisplay(element) {
    if (!element) return;
    
    const content = element.dataset.content || '1234567890';
    const barcodeHTML = this._generateBarcodeHTML(content);
    element.innerHTML = `${barcodeHTML}<div style="margin-top: 4px; font-size: 10px; font-family: monospace;">${content}</div>`;
  }

  _createQRCodeElement(id, styles) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'designer-element';
    el.dataset.type = 'qrcode';
    el.dataset.content = 'https://example.com';
    
    const content = el.dataset.content;
    const qrHTML = this._generateQRCodeHTML(content);
    
    el.style.cssText = `
      position: absolute;
      left: ${styles.left}px;
      top: ${styles.top}px;
      width: 80px;
      height: 80px;
      background: #fff;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4px;
      font-size: 12px;
      color: #333;
    `;
    el.innerHTML = qrHTML;
    
    this._addResizeHandles(el);
    return el;
  }
  
  _generateQRCodeHTML(content) {
    if (!content) return '';
    
    const size = 21;
    const moduleSize = 3;
    
    let modules = [];
    for (let i = 0; i < size; i++) {
      modules[i] = [];
      for (let j = 0; j < size; j++) {
        modules[i][j] = false;
      }
    }
    
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isCorner = (i < 7 && j < 7) || (i < 7 && j >= size - 7) || (i >= size - 7 && j < 7);
        if (isCorner) {
          const distance = Math.max(Math.abs(i % 7 - 3), Math.abs(j % 7 - 3));
          if (distance <= 2 && distance !== 1) {
            if (i < 7 && j < 7) modules[i][j] = true;
            if (i < 7 && j >= size - 7) modules[i][j] = true;
            if (i >= size - 7 && j < 7) modules[i][j] = true;
          }
          if (distance === 3) {
            if (i < 7 && j < 7) modules[i][j] = true;
            if (i < 7 && j >= size - 7) modules[i][j] = true;
            if (i >= size - 7 && j < 7) modules[i][j] = true;
          }
        }
      }
    }
    
    for (let i = 0; i < content.length && i < 150; i++) {
      const charCode = content.charCodeAt(i);
      const row = 7 + (i * 3) % (size - 14);
      const col = 7 + (i * 5) % (size - 14);
      if (row < size - 7 && col < size - 7) {
        modules[row][col] = (charCode % 2) === 1;
        if (row + 1 < size - 7 && col + 1 < size - 7) {
          modules[row + 1][col + 1] = (charCode % 3) === 0;
        }
      }
    }
    
    let html = `<div style="display: grid; grid-template-columns: repeat(${size}, ${moduleSize}px); gap: 0; background: #fff;">`;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        html += `<div style="width: ${moduleSize}px; height: ${moduleSize}px; background: ${modules[i][j] ? '#000' : '#fff'};"></div>`;
      }
    }
    html += '</div>';
    
    return html;
  }
  
  _updateQRCodeDisplay(element) {
    if (!element) return;
    
    const content = element.dataset.content || 'https://example.com';
    const qrHTML = this._generateQRCodeHTML(content);
    element.innerHTML = qrHTML;
  }

  _addResizeHandles(element) {
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    
    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.handle = pos;
      
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this._startResize(element, pos, e);
      });
      
      element.appendChild(handle);
    });

    element.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      this._startDrag(element, e);
    });

    element.addEventListener('click', (e) => {
      e.stopPropagation();
      this._selectElement(element);
    });
  }

  _startDrag(element, e) {
    this.isDragging = true;
    this.dragElement = element;
    
    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const onMouseMove = (moveEvent) => {
      if (!this.isDragging) return;
      
      const canvasRect = this.canvas.getBoundingClientRect();
      let x = (moveEvent.clientX - canvasRect.left - this.dragOffset.x) / this.zoom;
      let y = (moveEvent.clientY - canvasRect.top - this.dragOffset.y) / this.zoom;
      
      if (this.snapToGrid) {
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
      }
      
      element.style.left = Math.max(0, x) + 'px';
      element.style.top = Math.max(0, y) + 'px';
      
      this._updatePropertyPanel();
    };

    const onMouseUp = () => {
      if (this.isDragging) {
        this._saveState();
      }
      this.isDragging = false;
      this.dragElement = null;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  _startResize(element, handle, e) {
    this.isResizing = true;
    this.resizeElement = element;
    this.resizeHandle = handle;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = parseInt(element.style.left) || 0;
    const startTop = parseInt(element.style.top) || 0;
    const startWidth = parseInt(element.style.width) || element.offsetWidth;
    const startHeight = parseInt(element.style.height) || element.offsetHeight;

    const onMouseMove = (moveEvent) => {
      if (!this.isResizing) return;
      
      let dx = (moveEvent.clientX - startX) / this.zoom;
      let dy = (moveEvent.clientY - startY) / this.zoom;
      
      if (this.snapToGrid) {
        dx = Math.round(dx / this.gridSize) * this.gridSize;
        dy = Math.round(dy / this.gridSize) * this.gridSize;
      }
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      switch (handle) {
        case 'e':
          newWidth = Math.max(20, startWidth + dx);
          break;
        case 'w':
          newWidth = Math.max(20, startWidth - dx);
          if (newWidth !== startWidth) {
            newLeft = startLeft + dx;
          }
          break;
        case 's':
          newHeight = Math.max(20, startHeight + dy);
          break;
        case 'n':
          newHeight = Math.max(20, startHeight - dy);
          if (newHeight !== startHeight) {
            newTop = startTop + dy;
          }
          break;
        case 'se':
          newWidth = Math.max(20, startWidth + dx);
          newHeight = Math.max(20, startHeight + dy);
          break;
        case 'sw':
          newWidth = Math.max(20, startWidth - dx);
          newHeight = Math.max(20, startHeight + dy);
          if (newWidth !== startWidth) {
            newLeft = startLeft + dx;
          }
          break;
        case 'ne':
          newWidth = Math.max(20, startWidth + dx);
          newHeight = Math.max(20, startHeight - dy);
          if (newHeight !== startHeight) {
            newTop = startTop + dy;
          }
          break;
        case 'nw':
          newWidth = Math.max(20, startWidth - dx);
          newHeight = Math.max(20, startHeight - dy);
          if (newWidth !== startWidth) {
            newLeft = startLeft + dx;
          }
          if (newHeight !== startHeight) {
            newTop = startTop + dy;
          }
          break;
      }

      element.style.width = newWidth + 'px';
      element.style.height = newHeight + 'px';
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
      
      this._updatePropertyPanel();
    };

    const onMouseUp = () => {
      if (this.isResizing) {
        this._saveState();
      }
      this.isResizing = false;
      this.resizeElement = null;
      this.resizeHandle = null;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  _selectElement(element) {
    this._deselectAll();
    
    element.classList.add('selected');
    this.selectedElement = element;
    
    this._updatePropertyPanel();
  }

  _deselectAll() {
    const selected = this.canvas.querySelectorAll('.selected');
    selected.forEach(el => el.classList.remove('selected'));
    this.selectedElement = null;
    
    this._updatePropertyPanel();
  }

  _selectAll() {
    const allElements = this.canvas.querySelectorAll('.designer-element');
    allElements.forEach(el => el.classList.add('selected'));
    this._updatePropertyPanel();
  }

  _updatePropertyPanel() {
    if (!this.selectedElement) {
      this.propertyPanel.innerHTML = `
        <div class="no-selection-message">
          选择一个元素以编辑其属性
        </div>
      `;
      return;
    }

    const elementData = this.elements.find(e => e.id === this.selectedElement.id);
    const rect = this.selectedElement.getBoundingClientRect();
    const left = parseInt(this.selectedElement.style.left) || 0;
    const top = parseInt(this.selectedElement.style.top) || 0;
    const width = parseInt(this.selectedElement.style.width) || this.selectedElement.offsetWidth;
    const height = parseInt(this.selectedElement.style.height) || this.selectedElement.offsetHeight;

    let contentHTML = '';
    
    if (this.selectedElement.classList.contains('element-text') || 
        this.selectedElement.classList.contains('element-field')) {
      contentHTML = `
        <div class="property-group">
          <div class="property-group-title">内容</div>
          <div class="property-row">
            <label class="property-label">文本</label>
            <input type="text" class="property-input" id="prop-text" value="${this.selectedElement.textContent.replace(/"/g, '&quot;')}">
          </div>
        </div>
      `;
    }
    
    if (this.selectedElement.dataset.type === 'barcode') {
      const barcodeContent = this.selectedElement.dataset.content || '1234567890';
      contentHTML = `
        <div class="property-group">
          <div class="property-group-title">条形码设置</div>
          <div class="property-row">
            <label class="property-label">内容</label>
            <input type="text" class="property-input" id="prop-barcode-content" value="${barcodeContent.replace(/"/g, '&quot;')}">
          </div>
        </div>
      `;
    }
    
    if (this.selectedElement.dataset.type === 'qrcode') {
      const qrContent = this.selectedElement.dataset.content || 'https://example.com';
      contentHTML = `
        <div class="property-group">
          <div class="property-group-title">二维码设置</div>
          <div class="property-row">
            <label class="property-label">内容</label>
            <input type="text" class="property-input" id="prop-qrcode-content" value="${qrContent.replace(/"/g, '&quot;')}">
          </div>
        </div>
      `;
    }

    this.propertyPanel.innerHTML = `
      <div class="property-group">
        <div class="property-group-title">位置 & 尺寸</div>
        <div class="property-row">
          <label class="property-label">X</label>
          <input type="number" class="property-input" id="prop-x" value="${left}">
        </div>
        <div class="property-row">
          <label class="property-label">Y</label>
          <input type="number" class="property-input" id="prop-y" value="${top}">
        </div>
        <div class="property-row">
          <label class="property-label">宽度</label>
          <input type="number" class="property-input" id="prop-width" value="${width}">
        </div>
        <div class="property-row">
          <label class="property-label">高度</label>
          <input type="number" class="property-input" id="prop-height" value="${height}">
        </div>
      </div>
      
      <div class="property-group">
        <div class="property-group-title">外观</div>
        <div class="property-row">
          <label class="property-label">字体</label>
          <select class="property-select" id="prop-font">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="sans-serif">无衬线</option>
          </select>
        </div>
        <div class="property-row">
          <label class="property-label">字号</label>
          <input type="number" class="property-input" id="prop-font-size" value="${parseInt(getComputedStyle(this.selectedElement).fontSize) || 14}">
        </div>
        <div class="property-row">
          <label class="property-label">颜色</label>
          <input type="color" class="property-color" id="prop-color" value="#000000">
        </div>
      </div>
      
      ${contentHTML}
    `;

    const inputs = ['x', 'y', 'width', 'height', 'font-size', 'text'];
    inputs.forEach(prop => {
      const input = this.propertyPanel.querySelector(`#prop-${prop}`);
      if (input) {
        input.addEventListener('change', () => {
          this._applyPropertyChange(prop, input.value);
        });
      }
    });
    
    const barcodeInput = this.propertyPanel.querySelector('#prop-barcode-content');
    if (barcodeInput) {
      barcodeInput.addEventListener('change', () => {
        this._saveState();
        this.selectedElement.dataset.content = barcodeInput.value;
        this._updateBarcodeDisplay(this.selectedElement);
      });
      barcodeInput.addEventListener('input', () => {
        this.selectedElement.dataset.content = barcodeInput.value;
        this._updateBarcodeDisplay(this.selectedElement);
      });
    }
    
    const qrcodeInput = this.propertyPanel.querySelector('#prop-qrcode-content');
    if (qrcodeInput) {
      qrcodeInput.addEventListener('change', () => {
        this._saveState();
        this.selectedElement.dataset.content = qrcodeInput.value;
        this._updateQRCodeDisplay(this.selectedElement);
      });
      qrcodeInput.addEventListener('input', () => {
        this.selectedElement.dataset.content = qrcodeInput.value;
        this._updateQRCodeDisplay(this.selectedElement);
      });
    }
  }

  _applyPropertyChange(prop, value) {
    if (!this.selectedElement) return;

    this._saveState();

    switch (prop) {
      case 'x':
        this.selectedElement.style.left = value + 'px';
        break;
      case 'y':
        this.selectedElement.style.top = value + 'px';
        break;
      case 'width':
        this.selectedElement.style.width = value + 'px';
        break;
      case 'height':
        this.selectedElement.style.height = value + 'px';
        break;
      case 'font-size':
        this.selectedElement.style.fontSize = value + 'px';
        break;
      case 'text':
        this.selectedElement.textContent = value;
        break;
    }
  }

  _nudgeElement(element, dx, dy) {
    this._saveState();
    
    let x = parseInt(element.style.left) || 0;
    let y = parseInt(element.style.top) || 0;
    
    x += dx;
    y += dy;
    
    element.style.left = Math.max(0, x) + 'px';
    element.style.top = Math.max(0, y) + 'px';
    
    this._updatePropertyPanel();
  }

  _copySelected() {
    if (!this.selectedElement) return;
    
    const clone = this.selectedElement.cloneNode(true);
    clone.id = 'element-' + Date.now();
    
    this.clipboardElement = {
      html: clone.outerHTML,
      offset: { x: 10, y: 10 },
    };
  }

  _pasteClipboard() {
    if (!this.clipboardElement) return;
    
    this._saveState();
    
    const temp = document.createElement('div');
    temp.innerHTML = this.clipboardElement.html;
    const element = temp.firstChild;
    
    element.id = 'element-' + Date.now();
    
    let x = parseInt(this.selectedElement?.style.left) || 0;
    let y = parseInt(this.selectedElement?.style.top) || 0;
    
    x += this.clipboardElement.offset.x;
    y += this.clipboardElement.offset.y;
    
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    
    this._addResizeHandles(element);
    this.canvas.appendChild(element);
    
    const elementData = {
      id: element.id,
      type: 'copied',
      element,
      x,
      y,
      width: parseInt(element.style.width) || 100,
      height: parseInt(element.style.height) || 30,
    };
    
    this.elements.push(elementData);
    this._selectElement(element);
  }

  _deleteSelected() {
    if (!this.selectedElement) return;
    
    this._saveState();
    
    const index = this.elements.findIndex(e => e.id === this.selectedElement.id);
    if (index > -1) {
      this.elements.splice(index, 1);
    }
    
    this.selectedElement.remove();
    this.selectedElement = null;
    this._updatePropertyPanel();
  }

  _saveState() {
    const state = {
      elements: this.canvas.innerHTML,
      zoom: this.zoom,
    };
    
    this.undoStack.push(state);
    this.redoStack = [];
    
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    
    const current = {
      elements: this.canvas.innerHTML,
      zoom: this.zoom,
    };
    this.redoStack.push(current);
    
    const state = this.undoStack.pop();
    this.canvas.innerHTML = state.elements;
    this.zoom = state.zoom;
    this.setZoom(this.zoom);
    
    this.selectedElement = null;
    this._updatePropertyPanel();
    
    this._rebindElementEvents();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    const current = {
      elements: this.canvas.innerHTML,
      zoom: this.zoom,
    };
    this.undoStack.push(current);
    
    const state = this.redoStack.pop();
    this.canvas.innerHTML = state.elements;
    this.zoom = state.zoom;
    this.setZoom(this.zoom);
    
    this.selectedElement = null;
    this._updatePropertyPanel();
    
    this._rebindElementEvents();
  }

  _rebindElementEvents() {
    const elements = this.canvas.querySelectorAll('.designer-element');
    elements.forEach(el => {
      el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle')) return;
        this._startDrag(el, e);
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectElement(el);
      });

      const handles = el.querySelectorAll('.resize-handle');
      handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          this._startResize(el, handle.dataset.handle, e);
        });
      });
    });
  }

  setZoom(zoom) {
    this.zoom = zoom;
    if (this.canvas) {
      this.canvas.style.transform = `scale(${zoom})`;
      this.canvas.style.transformOrigin = 'top left';
    }
  }

  setGridSize(size) {
    this.gridSize = size;
  }

  enableSnapToGrid(enabled) {
    this.snapToGrid = enabled;
  }

  _preview() {
    const template = this.getTemplate();
    
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>模板预览</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 20px; background: #f0f0f0; font-family: sans-serif; }
    .preview-container {
      background: white;
      padding: 40px;
      margin: 0 auto;
      max-width: 800px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .toolbar { margin-bottom: 20px; text-align: center; }
    button { padding: 10px 20px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">打印</button>
  </div>
  <div class="preview-container">
    ${template}
  </div>
</body>
</html>`);
      previewWindow.document.close();
    }
  }

  _save() {
    const template = this.getTemplate();
    const data = this.getJSON();
    
    if (typeof this.options.onSave === 'function') {
      this.options.onSave({
        template,
        data,
        elements: this.elements,
      });
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  getTemplate() {
    let html = '';
    
    const elements = this.canvas.querySelectorAll('.designer-element');
    
    elements.forEach(el => {
      const style = `
        position: absolute;
        left: ${el.style.left};
        top: ${el.style.top};
        width: ${el.style.width};
        height: ${el.style.height};
      `;
      
      const content = el.classList.contains('element-field') 
        ? el.textContent 
        : el.innerHTML.replace(/<div class="resize-handle[^>]*><\/div>/g, '');
      
      html += `<div style="${style}">${content}</div>`;
    });
    
    return html;
  }

  getJSON() {
    const elementsData = [];
    
    const elements = this.canvas.querySelectorAll('.designer-element');
    elements.forEach(el => {
      elementsData.push({
        id: el.id,
        type: el.dataset.type || 'text',
        x: parseInt(el.style.left) || 0,
        y: parseInt(el.style.top) || 0,
        width: parseInt(el.style.width) || el.offsetWidth,
        height: parseInt(el.style.height) || el.offsetHeight,
        content: el.textContent,
        field: el.dataset.field,
        style: {
          fontSize: el.style.fontSize,
          color: el.style.color,
        },
      });
    });
    
    return {
      version: '1.0',
      canvasWidth: this.options.canvasWidth,
      canvasHeight: this.options.canvasHeight,
      elements: elementsData,
      createdAt: new Date().toISOString(),
    };
  }

  loadJSON(data) {
    if (!data || !data.elements) return;
    
    this._saveState();
    
    const background = this.canvas.querySelector('.print-canvas-background');
    this.canvas.innerHTML = '';
    if (background) {
      this.canvas.appendChild(background);
    }
    
    this.elements = [];
    
    data.elements.forEach(elementData => {
      const el = document.createElement('div');
      el.id = elementData.id;
      el.className = `designer-element element-${elementData.type || 'text'}`;
      
      el.style.left = elementData.x + 'px';
      el.style.top = elementData.y + 'px';
      el.style.width = elementData.width + 'px';
      el.style.height = elementData.height + 'px';
      el.textContent = elementData.content || '';
      
      if (elementData.field) {
        el.dataset.field = elementData.field;
        el.classList.add('element-field');
      }
      
      this._addResizeHandles(el);
      this.canvas.appendChild(el);
      
      this.elements.push({
        id: elementData.id,
        type: elementData.type,
        element: el,
        x: elementData.x,
        y: elementData.y,
        width: elementData.width,
        height: elementData.height,
      });
    });
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.elements = [];
    this.selectedElement = null;
    this.undoStack = [];
    this.redoStack = [];
  }
}

export default TemplateDesigner;
