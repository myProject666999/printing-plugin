class StyleController {
  constructor(plugin) {
    this.plugin = plugin;
  }

  wrapWithStyles(content, options) {
    if (typeof content === 'string') {
      return content;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'print-wrapper';
    
    if (content) {
      if (content instanceof HTMLElement) {
        wrapper.appendChild(content.cloneNode(true));
      } else if (typeof content === 'string') {
        wrapper.innerHTML = content;
      }
    }

    return wrapper;
  }

  generatePrintStyles(options) {
    const { style } = options;
    let styles = '';

    styles += this._generateBaseStyles();

    if (style.mediaPrint) {
      styles += this._generateMediaPrintStyles();
    }

    if (style.hideElements && style.hideElements.length > 0) {
      styles += this._generateHideElementsStyles(style.hideElements);
    }

    if (style.customStyles) {
      styles += style.customStyles;
    }

    if (style.pageBreak) {
      styles += this._generatePageBreakStyles(style.pageBreak);
    }

    return styles;
  }

  _generateBaseStyles() {
    return `
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #fff;
      }

      @page {
        margin: 0.75in;
        size: A4;
      }

      @media print {
        @page {
          margin: 0.75in;
        }
        
        body {
          background: white;
        }
        
        .no-print,
        nav,
        header,
        footer,
        aside,
        [data-print="false"],
        .print-hide {
          display: none !important;
        }
        
        .print-only,
        [data-print="only"] {
          display: block !important;
        }
        
        a {
          text-decoration: none;
          color: inherit;
        }
        
        a[href]:after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }
        
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f5f5f5;
        }
        
        pre, code {
          white-space: pre-wrap !important;
          word-wrap: break-word;
        }
        
        input, textarea, select {
          border: none;
          background: transparent;
        }
        
        input[type="checkbox"],
        input[type="radio"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border: 1px solid #000;
          display: inline-block;
          vertical-align: middle;
        }
        
        input[type="checkbox"]:checked::after {
          content: "✓";
          display: block;
          text-align: center;
          font-size: 12px;
          line-height: 14px;
        }
      }
    `;
  }

  _generateMediaPrintStyles() {
    return `
      @media print {
        .print-page-break {
          page-break-before: always;
          break-before: page;
        }
        
        .print-avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .print-section {
          page-break-inside: avoid;
        }
      }
    `;
  }

  _generateHideElementsStyles(selectors) {
    const selectorsStr = selectors.join(',\n    ');
    return `
      ${selectorsStr} {
        display: none !important;
      }
    `;
  }

  _generatePageBreakStyles(mode) {
    switch (mode) {
      case 'auto':
        return `
          @media print {
            .print-auto-break {
              page-break-inside: auto;
            }
          }
        `;
      case 'avoid':
        return `
          @media print {
            body * {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `;
      case 'section':
        return `
          @media print {
            section {
              page-break-after: always;
              break-after: page;
            }
            section:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          }
        `;
      default:
        return '';
    }
  }

  injectStyles(styles) {
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.id = 'print-plugin-styles';
    styleEl.textContent = styles;
    
    const existing = document.getElementById('print-plugin-styles');
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    
    document.head.appendChild(styleEl);
    
    return styleEl;
  }

  removeStyles() {
    const styleEl = document.getElementById('print-plugin-styles');
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  captureComputedStyles(element) {
    if (!element) return '';
    
    const computed = window.getComputedStyle(element);
    const properties = [
      'font-family', 'font-size', 'font-weight', 'font-style',
      'color', 'background-color',
      'margin', 'padding', 'border',
      'line-height', 'text-align',
      'width', 'height',
      'display', 'position',
      'box-shadow', 'border-radius'
    ];

    let styles = '';
    properties.forEach(prop => {
      const value = computed.getPropertyValue(prop);
      if (value) {
        styles += `${prop}: ${value};\n`;
      }
    });

    return styles;
  }
}

export default StyleController;
