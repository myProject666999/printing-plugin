class SilentPrint {
  constructor(plugin) {
    this.plugin = plugin;
    this.isPrinting = false;
    this.printQueue = [];
    this.printerStatus = {};
  }

  async print(content, options = {}) {
    const { silent } = options;
    
    if (silent.enabled) {
      return this._silentPrint(content, silent);
    } else {
      return this._standardPrint(content, options);
    }
  }

  async _silentPrint(content, options) {
    const { printerName = '', tray = '', copies = 1 } = options;

    if (this._isChromeExtension()) {
      return this._printViaExtension(content, { printerName, tray, copies });
    }

    if (this._hasNativePrintAPI()) {
      return this._printViaNativeAPI(content, { printerName, tray, copies });
    }

    console.warn('Silent print not supported in this environment. Falling back to standard print.');
    return this._standardPrint(content, {});
  }

  _isChromeExtension() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  _hasNativePrintAPI() {
    return typeof navigator !== 'undefined' && 
           navigator.print && 
           typeof navigator.print === 'function';
  }

  async _printViaExtension(content, options) {
    return new Promise((resolve, reject) => {
      try {
        let printContent;
        if (typeof content === 'string') {
          printContent = content;
        } else if (content instanceof HTMLElement) {
          printContent = content.outerHTML;
        }

        chrome.runtime.sendMessage({
          action: 'silentPrint',
          content: printContent,
          options: options
        }, (response) => {
          if (response && response.success) {
            resolve({
              success: true,
              printer: options.printerName,
              copies: options.copies,
              timestamp: Date.now()
            });
          } else {
            reject(new Error(response?.error || 'Print failed via extension'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async _printViaNativeAPI(content, options) {
    return new Promise((resolve, reject) => {
      try {
        const printSettings = {
          printerName: options.printerName,
          tray: options.tray,
          copies: options.copies,
          silent: true,
        };

        if (content instanceof HTMLElement) {
          const iframe = this._createPrintIframe(content);
          
          iframe.contentWindow.print(printSettings);
          
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve({
              success: true,
              printer: options.printerName,
              copies: options.copies,
              timestamp: Date.now()
            });
          }, 1000);
        } else {
          reject(new Error('Invalid content type for native API print'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  _standardPrint(content, options) {
    return new Promise((resolve, reject) => {
      try {
        const iframe = this._createPrintIframe(content);
        
        iframe.contentWindow.onafterprint = () => {
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve({
              success: true,
              method: 'standard',
              timestamp: Date.now()
            });
          }, 500);
        };

        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        reject(error);
      }
    });
  }

  _createPrintIframe(content) {
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
    let htmlContent;

    if (typeof content === 'string') {
      htmlContent = content;
    } else if (content instanceof HTMLElement) {
      htmlContent = content.outerHTML;
    } else {
      htmlContent = '<div></div>';
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    @page {
      margin: 0.75in;
      size: A4;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
    doc.close();

    return iframe;
  }

  async batchPrint(items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Batch print requires an array of items');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const result = await this.print(
          item.content || item.element || item,
          item.options || options
        );
        
        results.push({
          index: i,
          success: true,
          result,
        });

        if (i < items.length - 1) {
          await this._delay(options.batchDelay || 500);
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          item: item,
        });
      }
    }

    return {
      success: errors.length === 0,
      total: items.length,
      printed: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  addToQueue(printJob) {
    this.printQueue.push({
      id: Date.now(),
      status: 'pending',
      ...printJob,
      addedAt: Date.now(),
    });
  }

  async processQueue() {
    if (this.printQueue.length === 0) {
      return { success: true, message: 'Queue is empty' };
    }

    const results = [];
    
    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      job.status = 'processing';

      try {
        const result = await this.print(job.content, job.options);
        job.status = 'completed';
        job.result = result;
        results.push(job);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        results.push(job);
      }

      if (this.printQueue.length > 0) {
        await this._delay(300);
      }
    }

    return {
      success: results.every(j => j.status === 'completed'),
      total: results.length,
      completed: results.filter(j => j.status === 'completed').length,
      failed: results.filter(j => j.status === 'failed').length,
      results,
    };
  }

  getQueueStatus() {
    return {
      total: this.printQueue.length,
      pending: this.printQueue.filter(j => j.status === 'pending').length,
      processing: this.printQueue.filter(j => j.status === 'processing').length,
      queue: [...this.printQueue],
    };
  }

  clearQueue() {
    const count = this.printQueue.length;
    this.printQueue = [];
    return { cleared: count };
  }

  async getAvailablePrinters() {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'printers' });
        
        if (result.state === 'granted') {
          if (navigator.printers) {
            return navigator.printers;
          }
        }
      } catch (e) {
        console.warn('Printer permission not available:', e);
      }
    }

    if (this._isChromeExtension() && chrome.printerProvider) {
      return new Promise((resolve) => {
        chrome.printerProvider.onGetPrintersRequested.addListener((resultCallback) => {
          resultCallback();
          resolve([]);
        });
      });
    }

    console.warn('Cannot enumerate printers in this environment.');
    return [];
  }

  checkSilentPrintSupport() {
    return {
      supported: this._isChromeExtension() || this._hasNativePrintAPI(),
      environment: this._isChromeExtension() ? 'chrome-extension' : 'browser',
      features: {
        silentPrint: this._isChromeExtension() || this._hasNativePrintAPI(),
        printerSelection: this._isChromeExtension(),
        traySelection: this._isChromeExtension(),
        batchPrint: true,
        queueManagement: true,
      },
    };
  }

  configurePrintServer(serverUrl, apiKey = '') {
    this.printServerConfig = {
      url: serverUrl,
      apiKey: apiKey,
    };
  }

  async printViaServer(content, options = {}) {
    if (!this.printServerConfig) {
      throw new Error('Print server not configured. Use configurePrintServer() first.');
    }

    let printContent;
    if (typeof content === 'string') {
      printContent = content;
    } else if (content instanceof HTMLElement) {
      printContent = content.outerHTML;
    }

    try {
      const response = await fetch(`${this.printServerConfig.url}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.printServerConfig.apiKey ? `Bearer ${this.printServerConfig.apiKey}` : '',
        },
        body: JSON.stringify({
          content: printContent,
          options: options,
        }),
      });

      const result = await response.json();
      
      return {
        success: result.success,
        jobId: result.jobId,
        message: result.message,
        printer: options.printerName,
      };
    } catch (error) {
      throw new Error(`Server print failed: ${error.message}`);
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SilentPrint;
