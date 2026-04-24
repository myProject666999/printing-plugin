import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

class ExportManager {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async export(content, format, options = {}) {
    const { export: exportOptions } = options;
    const formatLower = format.toLowerCase();

    let elementToExport;
    if (typeof content === 'string') {
      elementToExport = document.querySelector(content);
      if (!elementToExport) {
        throw new Error(`Element not found for selector: ${content}`);
      }
    } else if (content instanceof HTMLElement) {
      elementToExport = content;
    } else {
      throw new Error('Invalid content for export');
    }

    switch (formatLower) {
      case 'pdf':
        return this._exportToPDF(elementToExport, exportOptions);
      
      case 'png':
        return this._exportToImage(elementToExport, 'png', exportOptions);
      
      case 'jpg':
      case 'jpeg':
        return this._exportToImage(elementToExport, 'jpeg', exportOptions);
      
      case 'html':
        return this._exportToHTML(elementToExport, exportOptions);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async _exportToPDF(content, options = {}) {
    const {
      filename = 'document',
      orientation = 'portrait',
      unit = 'mm',
      format = 'a4',
      quality = 1.0,
      margins = { top: 10, right: 10, bottom: 10, left: 10 },
      pageBreak = 'auto',
    } = options;

    let element;
    if (typeof content === 'string') {
      element = document.querySelector(content);
    } else if (content instanceof HTMLElement) {
      element = content;
    } else {
      throw new Error('Invalid content for PDF export');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);
    
    const pdf = new jsPDF({
      orientation: orientation,
      unit: unit,
      format: format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = pageHeight - margins.top - margins.bottom;
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    const x = margins.left + (contentWidth - finalWidth) / 2;
    const y = margins.top;

    pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
    
    if (pageBreak === 'auto') {
      const heightPerPage = contentHeight;
      let currentHeight = finalHeight;
      let currentPage = 1;
      
      while (currentHeight > heightPerPage) {
        pdf.addPage();
        const offsetY = currentPage * heightPerPage;
        const remainingHeight = currentHeight - heightPerPage;
        const nextPageHeight = Math.min(remainingHeight, heightPerPage);
        
        pdf.addImage(imgData, 'JPEG', x, margins.top - offsetY, finalWidth, finalHeight);
        
        currentHeight -= heightPerPage;
        currentPage++;
      }
    }

    const pdfBlob = pdf.output('blob');
    this._downloadBlob(pdfBlob, `${filename}.pdf`);
    
    return {
      success: true,
      format: 'pdf',
      filename: `${filename}.pdf`,
      blob: pdfBlob,
      size: pdfBlob.size,
    };
  }

  async _exportToImage(content, format = 'png', options = {}) {
    const {
      filename = 'document',
      quality = 1.0,
      scale = 2,
      backgroundColor = '#ffffff',
    } = options;

    let element;
    if (typeof content === 'string') {
      element = document.querySelector(content);
    } else if (content instanceof HTMLElement) {
      element = content;
    } else {
      throw new Error('Invalid content for image export');
    }

    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: backgroundColor,
      allowTaint: true,
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataURL = canvas.toDataURL(mimeType, quality);
    
    const blob = this._dataURLToBlob(dataURL);
    const extension = format === 'jpeg' ? 'jpg' : format;
    this._downloadBlob(blob, `${filename}.${extension}`);

    return {
      success: true,
      format: format,
      filename: `${filename}.${extension}`,
      blob: blob,
      dataURL: dataURL,
      size: blob.size,
      width: canvas.width,
      height: canvas.height,
    };
  }

  _exportToHTML(content, options = {}) {
    const {
      filename = 'document',
      includeStyles = true,
      includeScripts = false,
    } = options;

    let html = '';
    
    if (typeof content === 'string') {
      const element = document.querySelector(content);
      if (element) {
        html = element.outerHTML;
      }
    } else if (content instanceof HTMLElement) {
      html = content.outerHTML;
    }

    let styles = '';
    if (includeStyles) {
      const styleSheets = document.styleSheets;
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const styleSheet = styleSheets[i];
          if (styleSheet.cssRules) {
            for (let j = 0; j < styleSheet.cssRules.length; j++) {
              styles += styleSheet.cssRules[j].cssText + '\n';
            }
          }
        } catch (e) {
          console.warn('Could not access style sheet:', e);
        }
      }
    }

    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  ${styles ? `<style>${styles}</style>` : ''}
</head>
<body>
  ${html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    this._downloadBlob(blob, `${filename}.html`);

    return {
      success: true,
      format: 'html',
      filename: `${filename}.html`,
      blob: blob,
      html: fullHTML,
      size: blob.size,
    };
  }

  _downloadBlob(blob, filename) {
    if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  _dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }

  async printAsPDF(element, options = {}) {
    return this._exportToPDF(element, options);
  }

  async captureScreenshot(element, options = {}) {
    const {
      filename = 'screenshot',
      format = 'png',
      quality = 1.0,
    } = options;

    return this._exportToImage(element, format, {
      filename,
      quality,
    });
  }

  generatePDFFromHTML(htmlContent, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = htmlContent;
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.zIndex = '-1';
        
        document.body.appendChild(tempContainer);

        const result = await this._exportToPDF(tempContainer, options);
        
        document.body.removeChild(tempContainer);
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  getSupportedFormats() {
    return [
      { format: 'pdf', name: 'PDF Document', description: 'Portable Document Format', mime: 'application/pdf' },
      { format: 'png', name: 'PNG Image', description: 'Portable Network Graphics', mime: 'image/png' },
      { format: 'jpg', name: 'JPEG Image', description: 'Joint Photographic Experts Group', mime: 'image/jpeg' },
      { format: 'html', name: 'HTML Document', description: 'HyperText Markup Language', mime: 'text/html' },
    ];
  }

  canExport(format) {
    const supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'html'];
    return supportedFormats.includes(format.toLowerCase());
  }
}

export default ExportManager;
