// pdf-editor.js
class PdfEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pdfDoc = null; // PDF.js document
    this.pdfLibDoc = null; // PDF-Lib document
    this.currentPage = 1;
    this.canvas = null;
    this.fabricCanvas = null;
    this.uploadedFile = null;
  }

  static get observedAttributes() {
    return ['config'];
  }

  connectedCallback() {
    this.render();
    this.loadDependencies().then(() => {
      this.initializeEditor();
    });
  }

  disconnectedCallback() {
    // Clean up event listeners and Fabric.js canvas
    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'config' && newValue) {
      try {
        const config = JSON.parse(newValue);
        this.applyConfig(config);
      } catch (e) {
        console.error('Invalid config JSON:', e);
      }
    }
  }

  async loadDependencies() {
    // Load external libraries dynamically
    const loadScript = (src) =>
      new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.head.appendChild(script);
      });

    await Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js'),
      loadScript('https://unpkg.com/pdf-lib@1.17.0/dist/pdf-lib.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.0.2/tesseract.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'),
    ]);

    // Configure PDF.js worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 800px;
          font-family: Arial, sans-serif;
        }
        .container {
          display: flex;
          height: 100%;
        }
        .sidebar {
          width: 250px;
          padding: 10px;
          background: #f4f4f4;
          border-right: 1px solid #ddd;
        }
        .main {
          flex: 1;
          padding: 10px;
          position: relative;
        }
        .toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .toolbar button, .toolbar input {
          padding: 8px;
          font-size: 14px;
        }
        #pdf-canvas {
          border: 1px solid #ccc;
          width: 100%;
          height: 600px;
        }
        #page-info {
          margin-top: 10px;
          font-size: 14px;
        }
        .error {
          color: red;
        }
      </style>
      <div class="container">
        <div class="sidebar">
          <h3>PDF Editor</h3>
          <input type="file" id="pdf-upload" accept="application/pdf" />
          <div class="toolbar">
            <button id="add-text">Add Text</button>
            <button id="add-image">Add Image</button>
            <button id="add-table">Add Table</button>
            <button id="remove-selected">Remove Selected</button>
            <button id="ocr-text">Recognize Text</button>
            <button id="download-pdf">Download PDF</button>
          </div>
        </div>
        <div class="main">
          <canvas id="pdf-canvas"></canvas>
          <div id="page-info"></div>
          <div id="error" class="error"></div>
        </div>
      </div>
    `;
  }

  initializeEditor() {
    this.canvas = this.shadowRoot.querySelector('#pdf-canvas');
    this.fabricCanvas = new fabric.Canvas(this.canvas, {
      width: this.canvas.offsetWidth,
      height: this.canvas.offsetHeight,
    });

    // Event listeners
    this.shadowRoot.querySelector('#pdf-upload').addEventListener('change', (e) => this.loadPdf(e));
    this.shadowRoot.querySelector('#add-text').addEventListener('click', () => this.addText());
    this.shadowRoot.querySelector('#add-image').addEventListener('click', () => this.addImage());
    this.shadowRoot.querySelector('#add-table').addEventListener('click', () => this.addTable());
    this.shadowRoot.querySelector('#remove-selected').addEventListener('click', () => this.removeSelected());
    this.shadowRoot.querySelector('#ocr-text').addEventListener('click', () => this.recognizeText());
    this.shadowRoot.querySelector('#download-pdf').addEventListener('click', () => this.downloadPdf());
  }

  async loadPdf(event) {
    const file = event.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      this.showError('Please upload a valid PDF file.');
      return;
    }

    this.uploadedFile = file;
    const arrayBuffer = await file.arrayBuffer();

    // Load with PDF.js for rendering
    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
    this.pdfDoc = pdf;
    this.renderPage(1);

    // Load with PDF-Lib for editing
    this.pdfLibDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
  }

  async renderPage(pageNum) {
    if (!this.pdfDoc) return;
    this.currentPage = pageNum;
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.fabricCanvas.setDimensions({ width: viewport.width, height: viewport.height });

    const context = this.canvas.getContext('2d');
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    this.shadowRoot.querySelector('#page-info').textContent = `Page ${pageNum} of ${this.pdfDoc.numPages}`;
  }

  addText() {
    const text = new fabric.IText('Edit me', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#000',
    });
    this.fabricCanvas.add(text);
    this.fabricCanvas.setActiveObject(text);
  }

  addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const imgUrl = URL.createObjectURL(file);
      fabric.Image.fromURL(imgUrl, (img) => {
        img.scaleToWidth(200);
        img.set({ left: 100, top: 100 });
        this.fabricCanvas.add(img);
        this.fabricCanvas.setActiveObject(img);
      });
    };
    input.click();
  }

  addTable() {
    const table = new fabric.Group([
      new fabric.Rect({ width: 200, height: 100, fill: 'transparent', stroke: 'black', strokeWidth: 1 }),
      new fabric.Line([100, 0, 100, 100], { stroke: 'black', strokeWidth: 1 }),
      new fabric.Line([0, 50, 200, 50], { stroke: 'black', strokeWidth: 1 }),
    ], {
      left: 100,
      top: 100,
    });
    this.fabricCanvas.add(table);
    this.fabricCanvas.setActiveObject(table);
  }

  removeSelected() {
    const activeObject = this.fabricCanvas.getActiveObject();
    if (activeObject) {
      this.fabricCanvas.remove(activeObject);
    }
  }

  async recognizeText() {
    if (!this.canvas) return;
    this.showError('Processing OCR...');
    const { data: { text } } = await Tesseract.recognize(this.canvas.toDataURL(), 'eng');
    this.showError('');
    alert('Recognized Text:\n' + text);

    // Dispatch event to Wix with recognized text
    this.dispatchEvent(new CustomEvent('textRecognized', { detail: { text } }));
  }

  async downloadPdf() {
    if (!this.pdfLibDoc) {
      this.showError('No PDF loaded.');
      return;
    }

    // Add Fabric.js objects to PDF-Lib
    const page = this.pdfLibDoc.getPage(this.currentPage - 1);
    const { width, height } = page.getSize();

    this.fabricCanvas.getObjects().forEach(async (obj) => {
      if (obj.type === 'i-text') {
        page.drawText(obj.text, {
          x: obj.left,
          y: height - obj.top - obj.fontSize,
          size: obj.fontSize,
          color: window.PDFLib.rgb(0, 0, 0),
        });
      } else if (obj.type === 'image') {
        const imgData = obj.toDataURL();
        const img = await this.pdfLibDoc.embedPng(imgData);
        page.drawImage(img, {
          x: obj.left,
          y: height - obj.top - obj.height * obj.scaleY,
          width: obj.width * obj.scaleX,
          height: obj.height * obj.scaleY,
        });
      } else if (obj.type === 'group') {
        // Handle tables (simplified as lines)
        obj.getObjects().forEach((subObj) => {
          if (subObj.type === 'rect' || subObj.type === 'line') {
            page.drawLine({
              start: { x: subObj.left, y: height - subObj.top },
              end: { x: subObj.left + subObj.width, y: height - subObj.top - subObj.height },
              thickness: 1,
              color: window.PDFLib.rgb(0, 0, 0),
            });
          }
        });
      }
    });

    const pdfBytes = await this.pdfLibDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  showError(message) {
    this.shadowRoot.querySelector('#error').textContent = message;
  }

  applyConfig(config) {
    // Apply Wix configuration (e.g., theme, default settings)
    if (config.theme) {
      this.shadowRoot.querySelector('.sidebar').style.background = config.theme.sidebarBg || '#f4f4f4';
    }
  }
}

customElements.define('pdf-editor', PdfEditor);
