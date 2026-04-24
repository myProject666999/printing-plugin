class FormCanvasSupport {
  constructor(plugin) {
    this.plugin = plugin;
  }

  capture(element) {
    if (!element) return element;

    let originalElement;
    if (typeof element === 'string') {
      originalElement = document.querySelector(element);
    } else if (element instanceof HTMLElement) {
      originalElement = element;
    } else {
      return element;
    }

    const clone = originalElement.cloneNode(true);
    
    this._syncFormValues(originalElement, clone);
    this._syncRangeValueSpans(originalElement, clone);
    this._syncCanvasContent(originalElement, clone);
    this._syncSelectElements(originalElement, clone);
    this._syncRadioCheckbox(originalElement, clone);
    this._syncTextareas(originalElement, clone);
    
    return clone;
  }

  _syncFormValues(original, clone) {
    const originalInputs = original.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input[type="tel"], input[type="url"], input[type="search"], input[type="number"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="color"], input[type="range"]');
    
    const clonedInputs = clone.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input[type="tel"], input[type="url"], input[type="search"], input[type="number"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="color"], input[type="range"]');
    
    originalInputs.forEach((input, index) => {
      if (clonedInputs[index]) {
        clonedInputs[index].setAttribute('value', input.value);
        clonedInputs[index].value = input.value;
      }
    });

    const originalHidden = original.querySelectorAll('input[type="hidden"]');
    const clonedHidden = clone.querySelectorAll('input[type="hidden"]');
    originalHidden.forEach((input, index) => {
      if (clonedHidden[index]) {
        clonedHidden[index].setAttribute('value', input.value);
        clonedHidden[index].value = input.value;
      }
    });
  }

  _syncRangeValueSpans(original, clone) {
    const originalRanges = original.querySelectorAll('input[type="range"]');
    const clonedRanges = clone.querySelectorAll('input[type="range"]');
    
    originalRanges.forEach((range, index) => {
      if (clonedRanges[index]) {
        const nextSibling = range.nextElementSibling;
        const clonedNextSibling = clonedRanges[index].nextElementSibling;
        
        if (nextSibling && clonedNextSibling && 
            nextSibling.tagName === 'SPAN' && clonedNextSibling.tagName === 'SPAN') {
          clonedNextSibling.textContent = nextSibling.textContent;
        }
      }
    });
  }

  _syncTextareas(original, clone) {
    const originalTextareas = original.querySelectorAll('textarea');
    const clonedTextareas = clone.querySelectorAll('textarea');
    
    originalTextareas.forEach((textarea, index) => {
      if (clonedTextareas[index]) {
        clonedTextareas[index].value = textarea.value;
        clonedTextareas[index].textContent = textarea.value;
        clonedTextareas[index].innerHTML = this._escapeHtml(textarea.value);
        
        clonedTextareas[index].style.width = '100%';
        clonedTextareas[index].style.minHeight = textarea.offsetHeight + 'px';
        clonedTextareas[index].style.height = 'auto';
        clonedTextareas[index].style.border = '1px solid #ccc';
        clonedTextareas[index].style.padding = '4px';
        clonedTextareas[index].style.boxSizing = 'border-box';
        clonedTextareas[index].style.resize = 'none';
      }
    });
  }

  _syncSelectElements(original, clone) {
    const originalSelects = original.querySelectorAll('select');
    const clonedSelects = clone.querySelectorAll('select');
    
    originalSelects.forEach((select, index) => {
      if (clonedSelects[index]) {
        const clonedSelect = clonedSelects[index];
        
        const selectedIndices = [];
        Array.from(select.options).forEach((opt, i) => {
          if (opt.selected) {
            selectedIndices.push(i);
          }
        });
        
        Array.from(clonedSelect.options).forEach((opt, i) => {
          if (selectedIndices.includes(i)) {
            opt.setAttribute('selected', 'selected');
            opt.selected = true;
          } else {
            opt.removeAttribute('selected');
            opt.selected = false;
          }
        });
        
        clonedSelect.style.appearance = 'none';
        clonedSelect.style.webkitAppearance = 'none';
        clonedSelect.style.backgroundImage = 'none';
        clonedSelect.style.paddingRight = '8px';
        clonedSelect.style.cursor = 'default';
      }
    });
  }

  _syncRadioCheckbox(original, clone) {
    const originalCheckboxes = original.querySelectorAll('input[type="checkbox"]');
    const clonedCheckboxes = clone.querySelectorAll('input[type="checkbox"]');
    
    originalCheckboxes.forEach((checkbox, index) => {
      if (clonedCheckboxes[index]) {
        if (checkbox.checked) {
          clonedCheckboxes[index].setAttribute('checked', 'checked');
          clonedCheckboxes[index].checked = true;
        } else {
          clonedCheckboxes[index].removeAttribute('checked');
          clonedCheckboxes[index].checked = false;
        }
      }
    });

    const originalRadios = original.querySelectorAll('input[type="radio"]');
    const clonedRadios = clone.querySelectorAll('input[type="radio"]');
    
    originalRadios.forEach((radio, index) => {
      if (clonedRadios[index]) {
        if (radio.checked) {
          clonedRadios[index].setAttribute('checked', 'checked');
          clonedRadios[index].checked = true;
        } else {
          clonedRadios[index].removeAttribute('checked');
          clonedRadios[index].checked = false;
        }
      }
    });
  }

  _syncCanvasContent(original, clone) {
    const originalCanvases = original.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    
    originalCanvases.forEach((canvas, index) => {
      const clonedCanvas = clonedCanvases[index];
      if (!clonedCanvas) return;
      
      try {
        const canvasWidth = canvas.width || canvas.offsetWidth || 300;
        const canvasHeight = canvas.height || canvas.offsetHeight || 150;
        
        const dataURL = canvas.toDataURL('image/png');
        
        const img = document.createElement('img');
        img.src = dataURL;
        img.alt = 'Canvas Content';
        img.style.width = canvas.offsetWidth + 'px';
        img.style.height = canvas.offsetHeight + 'px';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.border = 'none';
        img.style.background = 'white';
        
        clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
      } catch (e) {
        console.warn('Failed to capture canvas content:', e);
        
        const fallback = document.createElement('div');
        fallback.style.width = canvas.offsetWidth + 'px';
        fallback.style.height = canvas.offsetHeight + 'px';
        fallback.style.background = '#f5f5f5';
        fallback.style.border = '1px dashed #ccc';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.color = '#999';
        fallback.textContent = 'Canvas 内容';
        
        clonedCanvas.parentNode.replaceChild(fallback, clonedCanvas);
      }
    });
  }

  restore(element) {
    return;
  }

  _escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  createFormSnapshot(formElement) {
    const form = typeof formElement === 'string' 
      ? document.querySelector(formElement) 
      : formElement;

    if (!form || !(form instanceof HTMLElement)) {
      return null;
    }

    const snapshot = {
      elements: [],
      timestamp: Date.now()
    };

    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach((el, index) => {
      const elementData = {
        index: index,
        name: el.name,
        type: el.type,
        tagName: el.tagName
      };

      switch (el.type) {
        case 'text':
        case 'password':
        case 'email':
        case 'tel':
        case 'url':
        case 'search':
        case 'number':
        case 'hidden':
        case 'date':
        case 'time':
        case 'datetime-local':
        case 'month':
        case 'week':
        case 'color':
        case 'range':
          elementData.value = el.value;
          break;
        
        case 'textarea':
          elementData.value = el.value;
          break;
        
        case 'select-one':
          elementData.selectedIndex = el.selectedIndex;
          elementData.value = el.value;
          break;
        
        case 'select-multiple':
          elementData.selectedOptions = Array.from(el.selectedOptions).map(opt => opt.value);
          break;
        
        case 'checkbox':
        case 'radio':
          elementData.checked = el.checked;
          break;
      }

      snapshot.elements.push(elementData);
    });

    return snapshot;
  }

  restoreFormSnapshot(formElement, snapshot) {
    const form = typeof formElement === 'string' 
      ? document.querySelector(formElement) 
      : formElement;

    if (!form || !(form instanceof HTMLElement) || !snapshot) {
      return false;
    }

    const elements = form.querySelectorAll('input, select, textarea');
    
    snapshot.elements.forEach(elementData => {
      const el = elements[elementData.index];
      
      if (!el) return;

      switch (elementData.type) {
        case 'text':
        case 'password':
        case 'email':
        case 'tel':
        case 'url':
        case 'search':
        case 'number':
        case 'hidden':
        case 'textarea':
        case 'date':
        case 'time':
        case 'datetime-local':
        case 'month':
        case 'week':
        case 'color':
        case 'range':
          el.value = elementData.value || '';
          break;
        
        case 'select-one':
          el.selectedIndex = elementData.selectedIndex || 0;
          el.value = elementData.value || '';
          break;
        
        case 'select-multiple':
          Array.from(el.options).forEach(opt => {
            opt.selected = (elementData.selectedOptions || []).includes(opt.value);
          });
          break;
        
        case 'checkbox':
        case 'radio':
          el.checked = elementData.checked || false;
          break;
      }
    });

    return true;
  }

  isFormElement(element) {
    if (!element) return false;
    
    const formElements = [
      'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON',
      'FIELDSET', 'LEGEND', 'LABEL', 'OPTGROUP',
      'OPTION', 'DATALIST', 'OUTPUT', 'PROGRESS', 'METER'
    ];
    
    return formElements.includes(element.tagName);
  }

  getFormValues(formElement) {
    const form = typeof formElement === 'string' 
      ? document.querySelector(formElement) 
      : formElement;

    if (!form || !(form instanceof HTMLElement)) {
      return {};
    }

    const values = {};
    
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
      if (!el.name) return;
      
      switch (el.type) {
        case 'checkbox':
          if (el.checked) {
            if (values[el.name]) {
              if (Array.isArray(values[el.name])) {
                values[el.name].push(el.value);
              } else {
                values[el.name] = [values[el.name], el.value];
              }
            } else {
              values[el.name] = el.value;
            }
          }
          break;
        
        case 'radio':
          if (el.checked) {
            values[el.name] = el.value;
          }
          break;
        
        case 'select-multiple':
          values[el.name] = Array.from(el.selectedOptions).map(opt => opt.value);
          break;
        
        default:
          values[el.name] = el.value;
      }
    });

    return values;
  }

  canvasToImage(canvas, format = 'png', quality = 1.0) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      return null;
    }

    try {
      let mimeType = 'image/png';
      
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
      }

      return canvas.toDataURL(mimeType, quality);
    } catch (e) {
      console.warn('Failed to convert canvas to image:', e);
      return null;
    }
  }
}

export default FormCanvasSupport;
