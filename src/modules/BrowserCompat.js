class BrowserCompat {
  constructor(plugin) {
    this.plugin = plugin;
    this.browser = this._detectBrowser();
  }

  init() {
    this._applyCompatibilityFixes();
  }

  _detectBrowser() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Firefox')) {
      return { name: 'firefox', version: this._parseVersion(userAgent, 'Firefox/') };
    }
    
    if (userAgent.includes('Edg/')) {
      return { name: 'edge', version: this._parseVersion(userAgent, 'Edg/') };
    }
    
    if (userAgent.includes('Chrome')) {
      return { name: 'chrome', version: this._parseVersion(userAgent, 'Chrome/') };
    }
    
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return { name: 'safari', version: this._parseVersion(userAgent, 'Version/') };
    }
    
    if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
      return { name: 'opera', version: this._parseVersion(userAgent, 'OPR/') };
    }
    
    return { name: 'unknown', version: 0 };
  }

  _parseVersion(userAgent, prefix) {
    const index = userAgent.indexOf(prefix);
    if (index === -1) return 0;
    
    const versionStart = index + prefix.length;
    const versionEnd = userAgent.indexOf('.', versionStart);
    
    if (versionEnd === -1) return 0;
    
    return parseInt(userAgent.substring(versionStart, versionEnd), 10);
  }

  _applyCompatibilityFixes() {
    switch (this.browser.name) {
      case 'firefox':
        this._applyFirefoxFixes();
        break;
      case 'safari':
        this._applySafariFixes();
        break;
      case 'edge':
        this._applyEdgeFixes();
        break;
      case 'chrome':
        this._applyChromeFixes();
        break;
    }
  }

  _applyFirefoxFixes() {
    if (!window.printStyles) {
      window.printStyles = () => {
        return `
          @media print {
            @page {
              margin: 0.75in;
            }
          }
        `;
      };
    }
  }

  _applySafariFixes() {
    if (this.browser.version < 14) {
      this._patchPrintFunction();
    }
  }

  _applyEdgeFixes() {
    if (this.browser.version < 80) {
      this._patchCanvasSupport();
    }
  }

  _applyChromeFixes() {
    if (this.browser.version >= 80) {
      this._enablePrintBackground();
    }
  }

  _patchPrintFunction() {
    const originalPrint = window.print;
    
    window.print = function(...args) {
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `;
      document.head.appendChild(style);
      
      setTimeout(() => {
        originalPrint.apply(window, args);
        setTimeout(() => {
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }
        }, 500);
      }, 100);
    };
  }

  _patchCanvasSupport() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      try {
        return originalToDataURL.call(this, type, quality);
      } catch (e) {
        const ctx = this.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        return originalToDataURL.call(tempCanvas, type, quality);
      }
    };
  }

  _enablePrintBackground() {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  getPrintMethod() {
    switch (this.browser.name) {
      case 'safari':
        if (this.browser.version < 10) {
          return 'popup';
        }
        return 'iframe';
      case 'firefox':
        return 'iframe';
      default:
        return 'iframe';
    }
  }

  supportsSilentPrint() {
    if (this.browser.name === 'chrome' && this.browser.version >= 18) {
      return true;
    }
    if (this.browser.name === 'edge' && this.browser.version >= 79) {
      return true;
    }
    return false;
  }

  supportsBackgroundColors() {
    return this.browser.name === 'chrome' || 
           this.browser.name === 'edge' ||
           (this.browser.name === 'firefox' && this.browser.version >= 48);
  }

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  getInfo() {
    return {
      ...this.browser,
      isMobile: this.isMobile(),
      supportsSilentPrint: this.supportsSilentPrint(),
      supportsBackgroundColors: this.supportsBackgroundColors(),
      printMethod: this.getPrintMethod(),
    };
  }

  checkFeature(feature) {
    switch (feature) {
      case 'canvas-to-image':
        return typeof HTMLCanvasElement !== 'undefined' &&
               typeof HTMLCanvasElement.prototype.toDataURL === 'function';
      
      case 'media-print':
        return true;
      
      case 'iframe-print':
        return true;
      
      case 'popup-print':
        return true;
      
      case 'blob':
        return typeof Blob !== 'undefined';
      
      case 'url-createobjecturl':
        return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
      
      case 'download-attribute':
        const a = document.createElement('a');
        return 'download' in a;
      
      default:
        return false;
    }
  }
}

export default BrowserCompat;
