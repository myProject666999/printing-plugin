class DataBinding {
  constructor(plugin) {
    this.plugin = plugin;
    this.delimiters = ['{{', '}}'];
    this.helpers = {};
    this._initHelpers();
  }

  _initHelpers() {
    this.registerHelper('formatDate', (value, format = 'YYYY-MM-DD') => {
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    });

    this.registerHelper('formatNumber', (value, decimals = 2) => {
      if (value === null || value === undefined) return '';
      const num = Number(value);
      if (isNaN(num)) return value;
      return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    });

    this.registerHelper('formatCurrency', (value, currency = 'CNY') => {
      if (value === null || value === undefined) return '';
      const num = Number(value);
      if (isNaN(num)) return value;
      return num.toLocaleString(undefined, {
        style: 'currency',
        currency: currency,
      });
    });

    this.registerHelper('uppercase', (value) => {
      return value ? String(value).toUpperCase() : '';
    });

    this.registerHelper('lowercase', (value) => {
      return value ? String(value).toLowerCase() : '';
    });

    this.registerHelper('default', (value, defaultValue) => {
      return value === null || value === undefined || value === '' ? defaultValue : value;
    });

    this.registerHelper('length', (value) => {
      if (Array.isArray(value) || typeof value === 'string') {
        return value.length;
      }
      return 0;
    });

    this.registerHelper('join', (value, separator = ',') => {
      if (Array.isArray(value)) {
        return value.join(separator);
      }
      return value || '';
    });
  }

  registerHelper(name, fn) {
    this.helpers[name] = fn;
  }

  setDelimiters(start, end) {
    this.delimiters = [start, end];
  }

  render(template, data) {
    if (!template) {
      return '';
    }

    let result = template;

    result = this._renderVariables(result, data);
    result = this._renderConditionals(result, data);
    result = this._renderLoops(result, data);
    result = this._renderHelpers(result, data);

    return this._cleanUp(result);
  }

  _renderVariables(template, data) {
    const [start, end] = this.delimiters;
    const regex = new RegExp(`${this._escapeRegex(start)}\\s*(\\w+(?:\\.\\w+)*)\\s*${this._escapeRegex(end)}`, 'g');

    return template.replace(regex, (match, path) => {
      const value = this._getValueByPath(data, path);
      return value !== undefined ? this._escapeHtml(String(value)) : '';
    });
  }

  _renderConditionals(template, data) {
    let result = template;
    
    let changed = true;
    while (changed) {
      changed = false;
      
      const ifRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
      
      result = result.replace(ifRegex, (match, path, trueContent, falseContent) => {
        changed = true;
        const value = this._getValueByPath(data, path);
        return this._isTruthy(value) ? trueContent : (falseContent || '');
      });
    }

    return result;
  }

  _renderLoops(template, data) {
    let result = template;
    
    let changed = true;
    while (changed) {
      changed = false;
      
      const eachRegex = /\{\{#each\s+(\w+(?:\.\w+)*)(?:\s+as\s+(\w+)(?:\s*,\s*(\w+))?)?\}\}([\s\S]*?)\{\{\/each\}\}/g;
      
      result = result.replace(eachRegex, (match, path, itemName, indexName, content) => {
        changed = true;
        const array = this._getValueByPath(data, path);
        const itemVar = itemName || 'item';
        const indexVar = indexName || 'index';
        
        if (!Array.isArray(array)) {
          return '';
        }
        
        return array.map((item, index) => {
          const itemData = {
            ...data,
            [itemVar]: item,
            [indexVar]: index,
          };
          
          let itemContent = content;
          
          itemContent = itemContent.replace(
            new RegExp(`\\{\\{\\s*@${this._escapeRegex(itemVar)}\\s*\\}\\}`, 'g'),
            '{{' + itemVar + '}}'
          );
          
          itemContent = itemContent.replace(
            new RegExp(`\\{\\{\\s*@${this._escapeRegex(indexVar)}\\s*\\}\\}`, 'g'),
            '{{' + indexVar + '}}'
          );
          
          return this._renderVariables(itemContent, itemData);
        }).join('');
      });
    }

    return result;
  }

  _renderHelpers(template, data) {
    const [start, end] = this.delimiters;
    
    for (const helperName in this.helpers) {
      const regex = new RegExp(
        `${this._escapeRegex(start)}\\s*${this._escapeRegex(helperName)}\\(([^)]+)\\)\\s*${this._escapeRegex(end)}`,
        'g'
      );
      
      template = template.replace(regex, (match, argsStr) => {
        const args = this._parseHelperArgs(argsStr, data);
        const helper = this.helpers[helperName];
        
        try {
          return helper.apply(null, args);
        } catch (e) {
          console.error(`Helper error: ${helperName}`, e);
          return '';
        }
      });
    }

    return template;
  }

  _parseHelperArgs(argsStr, data) {
    const args = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          args.push(current);
          current = '';
        }
      } else if (char === ',' && !inString) {
        if (current.trim()) {
          args.push(this._resolveArgValue(current.trim(), data));
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(this._resolveArgValue(current.trim(), data));
    }
    
    return args;
  }

  _resolveArgValue(value, data) {
    value = value.trim();
    
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1).replace(/\\(['"])/g, '$1');
    }
    
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    return this._getValueByPath(data, value);
  }

  _getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  _isTruthy(value) {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false;
    }
    return !!value;
  }

  _escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _cleanUp(template) {
    const [start, end] = this.delimiters;
    const regex = new RegExp(`${this._escapeRegex(start)}\\s*\\w+\\s*${this._escapeRegex(end)}`, 'g');
    
    return template.replace(regex, '');
  }

  renderToElement(template, data, container) {
    const html = this.render(template, data);
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container instanceof HTMLElement) {
      container.innerHTML = html;
    }
    
    return html;
  }

  compile(template) {
    return (data) => this.render(template, data);
  }
}

export default DataBinding;
