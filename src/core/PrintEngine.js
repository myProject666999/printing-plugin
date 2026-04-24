import RangeSelector from './RangeSelector.js';
import StyleController from './StyleController.js';
import BrowserCompat from '../modules/BrowserCompat.js';
import ExportManager from '../modules/ExportManager.js';
import DataBinding from '../modules/DataBinding.js';
import SilentPrint from '../modules/SilentPrint.js';
import FormCanvasSupport from '../modules/FormCanvasSupport.js';
import TemplateDesigner from '../modules/TemplateDesigner.js';

class PrintingPlugin {
  constructor(options = {}) {
    this.options = {
      mode: 'popup',
      printMode: 'iframe',
      style: {
        mediaPrint: true,
        customStyles: '',
        hideElements: [],
        pageBreak: 'auto',
      },
      range: {
        mode: 'entire',
        selector: '',
        excludeSelectors: [],
      },
      export: {
        format: 'pdf',
        filename: 'document',
        quality: 1.0,
      },
      data: {
        template: '',
        data: {},
      },
      silent: {
        enabled: false,
        printerName: '',
      },
      designer: {
        enabled: false,
        container: '',
      },
      ...options,
    };

    this.rangeSelector = new RangeSelector(this);
    this.styleController = new StyleController(this);
    this.browserCompat = new BrowserCompat(this);
    this.exportManager = new ExportManager(this);
    this.dataBinding = new DataBinding(this);
    this.silentPrint = new SilentPrint(this);
    this.formCanvasSupport = new FormCanvasSupport(this);
    this.templateDesigner = null;

    this._init();
  }

  _init() {
    this.browserCompat.init();
  }

  setOptions(options) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  print(target = null, options = {}) {
    const mergedOptions = {
      ...this.options,
      ...options,
    };

    return new Promise((resolve, reject) => {
      try {
        const printContent = this._preparePrintContent(target, mergedOptions);
        
        if (mergedOptions.silent.enabled) {
          this.silentPrint.print(printContent, mergedOptions)
            .then(resolve)
            .catch(reject);
        } else {
          this._printContent(printContent, mergedOptions)
            .then(resolve)
            .catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async export(target, format, options = {}) {
    const mergedOptions = {
      ...this.options,
      ...options,
      export: {
        ...this.options.export,
        format,
        ...options.export,
      },
    };

    const printContent = this._preparePrintContent(target, mergedOptions);
    return this.exportManager.export(printContent, format, mergedOptions);
  }

  batchPrint(items, options = {}) {
    return this.silentPrint.batchPrint(items, {
      ...this.options,
      ...options,
    });
  }

  setTemplate(html) {
    this.options.data.template = html;
  }

  bindData(data) {
    this.options.data.data = data;
  }

  renderTemplate(data = this.options.data.data) {
    return this.dataBinding.render(this.options.data.template, data);
  }

  enableDesigner(container, options = {}) {
    if (!this.templateDesigner) {
      this.templateDesigner = new TemplateDesigner(this);
    }
    this.templateDesigner.init(container, options);
    return this.templateDesigner;
  }

  _preparePrintContent(target, options) {
    let content;

    if (target) {
      if (typeof target === 'string') {
        const element = document.querySelector(target);
        content = this.formCanvasSupport.capture(element);
      } else if (target instanceof HTMLElement) {
        content = this.formCanvasSupport.capture(target);
      }
    } else if (options.data.template) {
      const rendered = this.dataBinding.render(options.data.template, options.data.data);
      
      if (typeof rendered === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = rendered;
        content = wrapper;
      } else {
        content = this.formCanvasSupport.capture(rendered);
      }
    } else {
      const selected = this.rangeSelector.select(options.range);
      content = this.formCanvasSupport.capture(selected);
    }

    return content;
  }

  async _printContent(content, options) {
    const styleWrapper = this.styleController.wrapWithStyles(content, options);
    
    if (options.printMode === 'iframe') {
      return this._printWithIframe(styleWrapper, options);
    } else {
      return this._printWithPopup(styleWrapper, options);
    }
  }

  _printWithIframe(content, options) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      doc.open();
      doc.write(this._generatePrintDocument(content, options));
      doc.close();

      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve();
          }, 1000);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };

      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to load print iframe'));
      };
    });
  }

  _printWithPopup(content, options) {
    return new Promise((resolve, reject) => {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      printWindow.document.open();
      printWindow.document.write(this._generatePrintDocument(content, options));
      printWindow.document.close();

      const checkReady = setInterval(() => {
        if (printWindow.document.readyState === 'complete') {
          clearInterval(checkReady);
          
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
              resolve();
            } catch (error) {
              reject(error);
            }
          }, 500);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkReady);
        reject(new Error('Print window timeout'));
      }, 30000);
    });
  }

  _generatePrintDocument(content, options) {
    const styles = this.styleController.generatePrintStyles(options);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print Document</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${content instanceof HTMLElement ? content.outerHTML : content}
</body>
</html>`;
  }
}

export default PrintingPlugin;
