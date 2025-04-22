/**
 * Wix Studio Custom Element: Advanced PDF Editor
 * 
 * File: wix-pdf-editor.js
 * Custom Element Tag: wix-pdf-editor
 */

class WixPdfEditor extends HTMLElement {
  constructor() {
    super();
    
    // Initialize properties
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1.0;
    this.pdfDocument = null;
    this.fabricCanvas = null;
    this.currentPdfBytes = null;
    this.undoStack = [];
    this.redoStack = [];
    this.selectedObject = null;
    
    // Mode flags
    this.textEditMode = false;
    this.imageEditMode = false;
    this.shapeEditMode = false;
    this.tableEditMode = false;
    this.annotationMode = false;
    
    // Create a shadow DOM for encapsulation
    this.attachShadow({ mode: 'open' });
  }
  
  // Called when the element is added to the DOM
  connectedCallback() {
    // Render the initial UI
    this.render();
    
    // Load required libraries
    this.loadLibraries().then(() => {
      // Initialize event listeners
      this.initializeEventListeners();
      console.log('PDF Editor initialized successfully');
    }).catch(error => {
      console.error('Failed to initialize PDF Editor:', error);
      this.showError('Failed to initialize the PDF Editor. Please refresh the page and try again.');
    });
  }
  
  // Render the UI
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 600px;
          font-family: Arial, sans-serif;
          --primary-color: #4A90E2;
          --secondary-color: #F5F5F5;
          --accent-color: #FFA500;
          --danger-color: #FF6B6B;
          --success-color: #66BB6A;
          --text-color: #333333;
          --border-color: #E0E0E0;
          --hover-color: #E8F4FD;
        }
        
        .pdf-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          background-color: white;
        }
        
        .toolbar {
          display: flex;
          align-items: center;
          padding: 10px;
          background-color: var(--secondary-color);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
        }
        
        .toolbar-group {
          display: flex;
          align-items: center;
          margin-right: 15px;
        }
        
        .toolbar button {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 6px 12px;
          margin: 0 2px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .toolbar button:hover {
          background-color: var(--hover-color);
        }
        
        .toolbar button.active {
          background-color: var(--primary-color);
          color: white;
        }
        
        .toolbar select, .toolbar input {
          padding: 6px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          margin: 0 2px;
        }
        
        .editor-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .canvas-container {
          flex: 1;
          overflow: auto;
          position: relative;
          background-color: #f0f0f0;
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        
        .properties-panel {
          width: 250px;
          background-color: white;
          border-left: 1px solid var(--border-color);
          padding: 15px;
          overflow-y: auto;
        }
        
        .properties-panel h3 {
          margin-top: 0;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        
        .properties-group {
          margin-bottom: 15px;
        }
        
        .properties-group label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .properties-group input, .properties-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .color-picker {
          width: 100%;
          padding: 0;
          height: 30px;
        }
        
        .page-controls {
          display: flex;
          align-items: center;
        }
        
        .page-indicator {
          margin: 0 10px;
        }
        
        .file-upload {
          display: none;
        }
        
        .upload-btn {
          background-color: var(--primary-color);
          color: white;
        }
        
        .save-btn {
          background-color: var(--success-color);
          color: white;
        }
        
        .no-document {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
          text-align: center;
        }
        
        .no-document p {
          margin-bottom: 20px;
          color: var(--text-color);
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          position: absolute;
          background: rgba(255, 255, 255, 0.8);
          z-index: 100;
        }
        
        .spinner {
          border: 5px solid var(--secondary-color);
          border-top: 5px solid var(--primary-color);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pdf-canvas-container {
          position: relative;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          background-color: white;
        }
        
        #pdf-canvas, #fabric-canvas {
          position: absolute;
          top: 0;
          left: 0;
        }
        
        .hidden {
          display: none !important;
        }
        
        .font-select {
          width: 100%;
        }
      </style>
      
      <div class="pdf-editor">
        <div class="toolbar">
          <div class="toolbar-group">
            <button class="upload-btn" id="upload-button">Open PDF</button>
            <input type="file" accept=".pdf" class="file-upload" id="file-upload">
            <button class="save-btn" id="save-button">Save PDF</button>
          </div>
          
          <div class="toolbar-group">
            <button id="undo-button" title="Undo">↩</button>
            <button id="redo-button" title="Redo">↪</button>
          </div>
          
          <div class="toolbar-group">
            <button id="text-button" title="Add Text">T</button>
            <button id="image-button" title="Add Image">📷</button>
            <button id="shape-button" title="Add Shape">◻</button>
            <button id="table-button" title="Add Table">⊞</button>
            <button id="annotation-button" title="Add Annotation">✎</button>
          </div>
          
          <div class="toolbar-group">
            <button id="prev-page" title="Previous Page">◀</button>
            <span class="page-indicator" id="page-indicator">0 / 0</span>
            <button id="next-page" title="Next Page">▶</button>
          </div>
          
          <div class="toolbar-group">
            <button id="zoom-out" title="Zoom Out">−</button>
            <select id="zoom-level">
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1" selected>100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
            <button id="zoom-in" title="Zoom In">+</button>
          </div>
        </div>
        
        <div class="editor-container">
          <div class="canvas-container" id="canvas-container">
            <div class="no-document" id="no-document">
              <p>No PDF document loaded. Please open a PDF file to start editing.</p>
              <button class="upload-btn" id="upload-prompt">Open PDF</button>
            </div>
            <div class="loading hidden" id="loading">
              <div class="spinner"></div>
            </div>
          </div>
          
          <div class="properties-panel" id="properties-panel">
            <h3>Properties</h3>
            
            <div id="text-properties" class="properties-group hidden">
              <label for="font-family">Font:</label>
              <select id="font-family" class="font-select">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
              
              <label for="font-size">Size:</label>
              <input type="number" id="font-size" value="16" min="8" max="72">
              
              <label for="text-color">Color:</label>
              <input type="color" id="text-color" class="color-picker" value="#000000">
              
              <div>
                <button id="text-bold">B</button>
                <button id="text-italic">I</button>
                <button id="text-underline">U</button>
              </div>
            </div>
            
            <div id="image-properties" class="properties-group hidden">
              <label for="image-width">Width:</label>
              <input type="number" id="image-width" value="100">
              
              <label for="image-height">Height:</label>
              <input type="number" id="image-height" value="100">
              
              <label for="image-opacity">Opacity:</label>
              <input type="range" id="image-opacity" min="0" max="1" step="0.1" value="1">
              
              <button id="bring-front">Bring to Front</button>
              <button id="send-back">Send to Back</button>
            </div>
            
            <div id="shape-properties" class="properties-group hidden">
              <label for="shape-type">Shape:</label>
              <select id="shape-type">
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="line">Line</option>
              </select>
              
              <label for="shape-fill">Fill Color:</label>
              <input type="color" id="shape-fill" class="color-picker" value="#ffffff">
              
              <label for="shape-stroke">Stroke Color:</label>
              <input type="color" id="shape-stroke" class="color-picker" value="#000000">
              
              <label for="stroke-width">Stroke Width:</label>
              <input type="number" id="stroke-width" value="1" min="0" max="20">
            </div>
            
            <div id="table-properties" class="properties-group hidden">
              <label for="table-rows">Rows:</label>
              <input type="number" id="table-rows" value="3" min="1" max="20">
              
              <label for="table-cols">Columns:</label>
              <input type="number" id="table-cols" value="3" min="1" max="10">
              
              <label for="table-border">Border Width:</label>
              <input type="number" id="table-border" value="1" min="0" max="10">
              
              <label for="table-border-color">Border Color:</label>
              <input type="color" id="table-border-color" class="color-picker" value="#000000">
              
              <button id="create-table">Create Table</button>
            </div>
            
            <div id="annotation-properties" class="properties-group hidden">
              <label for="annotation-type">Type:</label>
              <select id="annotation-type">
                <option value="highlight">Highlight</option>
                <option value="underline">Underline</option>
                <option value="strikethrough">Strikethrough</option>
                <option value="note">Note</option>
              </select>
              
              <label for="annotation-color">Color:</label>
              <input type="color" id="annotation-color" class="color-picker" value="#ffff00">
            </div>
            
            <div id="no-selection" class="properties-group">
              <p>No object selected. Select an object on the canvas or use the toolbar to add a new element.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Show loading indicator
    this.showLoading(true);
  }
  
  // Method to load required libraries
  loadLibraries() {
    return new Promise(async (resolve, reject) => {
      try {
        // Create script elements and load libraries
        const createScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };
        
        // First, load PDF.js with its specific version
        console.log('Loading PDF.js...');
        await createScript('https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js');
        
        // Wait a moment to ensure script is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if PDF.js was loaded properly
        if (typeof window.pdfjsLib === 'undefined' || !window.pdfjsLib) {
          console.error('PDF.js failed to initialize properly');
          throw new Error('PDF.js failed to initialize properly');
        }
        
        // Set up PDF.js worker
        console.log('Setting up PDF.js worker...');
        if (!window.pdfjsLib.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions = {};
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
        
        // Verify that getDocument function exists
        if (typeof window.pdfjsLib.getDocument !== 'function') {
          console.error('PDF.js getDocument function not found');
          throw new Error('PDF.js getDocument function not found');
        }
        
        // Load other libraries in parallel
        console.log('Loading remaining libraries...');
        await Promise.all([
          createScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
          createScript('https://unpkg.com/fabric@5.3.1/dist/fabric.min.js'),
          createScript('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js')
        ]);
        
        console.log('All libraries loaded successfully');
        this.showLoading(false);
        resolve();
      } catch (error) {
        console.error('Error loading libraries:', error);
        this.showError('Failed to load required libraries. Please refresh the page and try again.');
        this.showLoading(false);
        reject(error);
      }
    });
  }
  
  // Initialize event listeners
  initializeEventListeners() {
    // File upload
    const uploadButton = this.shadowRoot.getElementById('upload-button');
    const uploadPrompt = this.shadowRoot.getElementById('upload-prompt');
    const fileUpload = this.shadowRoot.getElementById('file-upload');
    
    uploadButton.addEventListener('click', () => fileUpload.click());
    uploadPrompt.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', this.handleFileUpload.bind(this));
    
    // Page navigation
    this.shadowRoot.getElementById('prev-page').addEventListener('click', () => this.goToPage(this.currentPage - 1));
    this.shadowRoot.getElementById('next-page').addEventListener('click', () => this.goToPage(this.currentPage + 1));
    
    // Zoom controls
    this.shadowRoot.getElementById('zoom-in').addEventListener('click', this.zoomIn.bind(this));
    this.shadowRoot.getElementById('zoom-out').addEventListener('click', this.zoomOut.bind(this));
    this.shadowRoot.getElementById('zoom-level').addEventListener('change', (e) => {
      this.scale = parseFloat(e.target.value);
      this.renderPage();
    });
    
    // Tools
    this.shadowRoot.getElementById('text-button').addEventListener('click', () => this.handleModeSelection('text'));
    this.shadowRoot.getElementById('image-button').addEventListener('click', () => this.handleModeSelection('image'));
    this.shadowRoot.getElementById('shape-button').addEventListener('click', () => this.handleModeSelection('shape'));
    this.shadowRoot.getElementById('table-button').addEventListener('click', () => this.handleModeSelection('table'));
    this.shadowRoot.getElementById('annotation-button').addEventListener('click', () => this.handleModeSelection('annotation'));
    
    // Undo/Redo
    this.shadowRoot.getElementById('undo-button').addEventListener('click', this.undo.bind(this));
    this.shadowRoot.getElementById('redo-button').addEventListener('click', this.redo.bind(this));
    
    // Save
    this.shadowRoot.getElementById('save-button').addEventListener('click', this.saveDocument.bind(this));
    
    // Property changes
    const textProperties = this.shadowRoot.getElementById('text-properties');
    textProperties.addEventListener('change', this.updateObjectProperties.bind(this));
    textProperties.addEventListener('click', this.updateObjectProperties.bind(this));
    
    const imageProperties = this.shadowRoot.getElementById('image-properties');
    imageProperties.addEventListener('change', this.updateObjectProperties.bind(this));
    imageProperties.addEventListener('input', this.updateObjectProperties.bind(this));
    
    const shapeProperties = this.shadowRoot.getElementById('shape-properties');
    shapeProperties.addEventListener('change', this.updateObjectProperties.bind(this));
    
    // Create table button
    this.shadowRoot.getElementById('create-table').addEventListener('click', this.addTable.bind(this));
    
    // Layer controls
    this.shadowRoot.getElementById('bring-front').addEventListener('click', () => {
      if (this.selectedObject) {
        this.selectedObject.bringToFront();
        this.fabricCanvas.renderAll();
        this.saveCurrentState();
      }
    });
    
    this.shadowRoot.getElementById('send-back').addEventListener('click', () => {
      if (this.selectedObject) {
        this.selectedObject.sendToBack();
        this.fabricCanvas.renderAll();
        this.saveCurrentState();
      }
    });
  }
  
  // Handle file upload
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      this.showError('Please select a valid PDF file.');
      return;
    }
    
    this.showLoading(true);
    
    try {
      console.log('Reading PDF file...');
      // Verify PDF.js is loaded
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded correctly');
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      this.currentPdfBytes = pdfBytes;
      
      console.log('PDF file read successfully, creating document task...');
      
      // Load PDF using PDF.js with explicit version
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfBytes,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
        cMapPacked: true,
      });
      
      console.log('Waiting for PDF to load...');
      this.pdfDocument = await loadingTask.promise;
      console.log('PDF document loaded successfully');
      
      this.totalPages = this.pdfDocument.numPages;
      this.currentPage = 1;
      
      // Update page indicator
      this.shadowRoot.getElementById('page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
      
      // Hide the "no document" message
      this.shadowRoot.getElementById('no-document').classList.add('hidden');
      
      // Render the first page
      console.log('Rendering first page...');
      await this.renderPage();
      
      // Extract text for later use
      console.log('Extracting text from PDF...');
      await this.extractTextFromPDF();
      console.log('PDF loaded and processed successfully');
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError(`Failed to load the PDF file: ${error.message || 'Unknown error'}`);
    } finally {
      this.showLoading(false);
    }
  }
  
  // Render PDF page
  async renderPage() {
    if (!this.pdfDocument) {
      console.warn('No PDF document loaded yet');
      return;
    }
    
    this.showLoading(true);
    
    try {
      console.log(`Rendering page ${this.currentPage}...`);
      
      // Verify fabric.js is loaded
      if (typeof fabric === 'undefined') {
        throw new Error('Fabric.js library not loaded correctly');
      }
      
      // Get the page
      const page = await this.pdfDocument.getPage(this.currentPage);
      console.log('PDF page fetched successfully');
      
      // Calculate dimensions
      const viewport = page.getViewport({ scale: this.scale });
      const canvasWidth = viewport.width;
      const canvasHeight = viewport.height;
      
      // Remove previous canvas if it exists
      const canvasContainer = this.shadowRoot.getElementById('canvas-container');
      const oldContainer = this.shadowRoot.querySelector('.pdf-canvas-container');
      if (oldContainer) {
        canvasContainer.removeChild(oldContainer);
      }
      
      // Create a new container for the canvases
      const newContainer = document.createElement('div');
      newContainer.className = 'pdf-canvas-container';
      newContainer.style.width = `${canvasWidth}px`;
      newContainer.style.height = `${canvasHeight}px`;
      canvasContainer.appendChild(newContainer);
      
      // Create PDF rendering canvas
      const pdfCanvas = document.createElement('canvas');
      pdfCanvas.id = 'pdf-canvas';
      pdfCanvas.width = canvasWidth;
      pdfCanvas.height = canvasHeight;
      newContainer.appendChild(pdfCanvas);
      
      // Create Fabric.js canvas for editing
      const fabricCanvas = document.createElement('canvas');
      fabricCanvas.id = 'fabric-canvas';
      fabricCanvas.width = canvasWidth;
      fabricCanvas.height = canvasHeight;
      newContainer.appendChild(fabricCanvas);
      
      // Get 2D context with alpha composite
      const pdfContext = pdfCanvas.getContext('2d', { alpha: false });
      pdfContext.fillStyle = 'white';
      pdfContext.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Render PDF page on canvas
      console.log('Starting PDF rendering...');
      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      console.log('PDF page rendered successfully');
      
      // Initialize Fabric.js canvas
      console.log('Initializing Fabric.js canvas...');
      this.fabricCanvas = new fabric.Canvas('fabric-canvas', {
        width: canvasWidth,
        height: canvasHeight,
        preserveObjectStacking: true,
        selection: true,
        interactive: true
      });
      
      // Setup fabric canvas event listeners
      this.setupFabricEventListeners();
      console.log('Fabric canvas initialized');
      
      // Save initial state
      this.saveCurrentState();
      
    } catch (error) {
      console.error('Error rendering page:', error);
      this.showError(`Failed to render the PDF page: ${error.message || 'Unknown error'}`);
    } finally {
      this.showLoading(false);
    }
  }
  
  // Setup fabric canvas event listeners
  setupFabricEventListeners() {
    if (!this.fabricCanvas) return;
    
    // Object selection
    this.fabricCanvas.on('selection:created', this.handleCanvasObjectSelection.bind(this));
    this.fabricCanvas.on('selection:updated', this.handleCanvasObjectSelection.bind(this));
    this.fabricCanvas.on('selection:cleared', () => {
      this.selectedObject = null;
      this.showPropertiesPanel('none');
    });
    
    // Object modification
    this.fabricCanvas.on('object:modified', () => {
      this.saveCurrentState();
    });
  }
  
  // Handle canvas object selection
  handleCanvasObjectSelection(options) {
    const activeObject = options.selected[0];
    if (!activeObject) return;
    
    this.selectedObject = activeObject;
    
    // Determine the type of the selected object and show appropriate properties panel
    if (activeObject.type === 'textbox' || activeObject.type === 'i-text') {
      this.showPropertiesPanel('text');
      
      // Update properties panel with current text values
      this.shadowRoot.getElementById('font-family').value = activeObject.fontFamily;
      this.shadowRoot.getElementById('font-size').value = activeObject.fontSize;
      this.shadowRoot.getElementById('text-color').value = activeObject.fill;
      
    } else if (activeObject.type === 'image') {
      this.showPropertiesPanel('image');
      
      // Update properties panel with current image values
      this.shadowRoot.getElementById('image-width').value = Math.round(activeObject.width * activeObject.scaleX);
      this.shadowRoot.getElementById('image-height').value = Math.round(activeObject.height * activeObject.scaleY);
      this.shadowRoot.getElementById('image-opacity').value = activeObject.opacity;
      
    } else if (activeObject.type === 'rect' || activeObject.type === 'circle' || 
              activeObject.type === 'triangle' || activeObject.type === 'line') {
      this.showPropertiesPanel('shape');
      
      // Update properties panel with current shape values
      this.shadowRoot.getElementById('shape-fill').value = activeObject.fill || '#ffffff';
      this.shadowRoot.getElementById('shape-stroke').value = activeObject.stroke || '#000000';
      this.shadowRoot.getElementById('stroke-width').value = activeObject.strokeWidth || 1;
      
      // Set shape type
      const shapeTypeSelect = this.shadowRoot.getElementById('shape-type');
      if (activeObject.type === 'rect') shapeTypeSelect.value = 'rect';
      else if (activeObject.type === 'circle') shapeTypeSelect.value = 'circle';
      else if (activeObject.type === 'triangle') shapeTypeSelect.value = 'triangle';
      else if (activeObject.type === 'line') shapeTypeSelect.value = 'line';
    }
  }
  
  // Update object properties
  updateObjectProperties(event) {
    if (!this.selectedObject) return;
    
    const target = event.target;
    
    // Text properties
    if (target.id === 'font-family') {
      this.selectedObject.set('fontFamily', target.value);
    } else if (target.id === 'font-size') {
      this.selectedObject.set('fontSize', parseInt(target.value, 10));
    } else if (target.id === 'text-color') {
      this.selectedObject.set('fill', target.value);
    } else if (target.id === 'text-bold') {
      this.selectedObject.set('fontWeight', this.selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
    } else if (target.id === 'text-italic') {
      this.selectedObject.set('fontStyle', this.selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
    } else if (target.id === 'text-underline') {
      this.selectedObject.set('underline', !this.selectedObject.underline);
    }
    
    // Image properties
    else if (target.id === 'image-width') {
      const width = parseInt(target.value, 10);
      this.selectedObject.set('scaleX', width / this.selectedObject.width);
    } else if (target.id === 'image-height') {
      const height = parseInt(target.value, 10);
      this.selectedObject.set('scaleY', height / this.selectedObject.height);
    } else if (target.id === 'image-opacity') {
      this.selectedObject.set('opacity', parseFloat(target.value));
    }
    
    // Shape properties
    else if (target.id === 'shape-fill') {
      this.selectedObject.set('fill', target.value);
    } else if (target.id === 'shape-stroke') {
      this.selectedObject.set('stroke', target.value);
    } else if (target.id === 'stroke-width') {
      this.selectedObject.set('strokeWidth', parseInt(target.value, 10));
    }
    
    this.fabricCanvas.renderAll();
    
    // Don't save state on every change to avoid filling the undo stack
    // Only save on mouseup or other significant events
    if (event.type === 'change') {
      this.saveCurrentState();
    }
  }
  
  // Navigate to page
  goToPage(pageNum) {
    if (!this.pdfDocument) return;
    
    if (pageNum < 1 || pageNum > this.totalPages) return;
    
    this.currentPage = pageNum;
    this.shadowRoot.getElementById('page-indicator').textContent = `${this.currentPage} / ${this.totalPages}`;
    this.renderPage();
  }
  
  // Zoom in
  zoomIn() {
    this.scale = Math.min(this.scale + 0.25, 3.0);
    this.shadowRoot.getElementById('zoom-level').value = this.scale.toString();
    this.renderPage();
  }
  
  // Zoom out
  zoomOut() {
    this.scale = Math.max(this.scale - 0.25, 0.25);
    this.shadowRoot.getElementById('zoom-level').value = this.scale.toString();
    this.renderPage();
  }
  
  // Handle mode selection
  handleModeSelection(mode) {
    // Reset all mode buttons
    const buttons = [
      this.shadowRoot.getElementById('text-button'),
      this.shadowRoot.getElementById('image-button'),
      this.shadowRoot.getElementById('shape-button'),
      this.shadowRoot.getElementById('table-button'),
      this.shadowRoot.getElementById('annotation-button')
    ];
    
    buttons.forEach(button => button.classList.remove('active'));
    
    // Reset all mode flags
    this.textEditMode = false;
    this.imageEditMode = false;
    this.shapeEditMode = false;
    this.tableEditMode = false;
    this.annotationMode = false;
    
    // Set active mode
    switch(mode) {
      case 'text':
        this.textEditMode = true;
        this.shadowRoot.getElementById('text-button').classList.add('active');
        this.addText();
        break;
      case 'image':
        this.imageEditMode = true;
        this.shadowRoot.getElementById('image-button').classList.add('active');
        this.addImage();
        break;
      case 'shape':
        this.shapeEditMode = true;
        this.shadowRoot.getElementById('shape-button').classList.add('active');
        this.addShape();
        break;
      case 'table':
        this.tableEditMode = true;
        this.shadowRoot.getElementById('table-button').classList.add('active');
        // Table creation is handled by the Create Table button
        this.showPropertiesPanel('table');
        break;
      case 'annotation':
        this.annotationMode = true;
        this.shadowRoot.getElementById('annotation-button').classList.add('active');
        this.addAnnotation();
        break;
    }
  }
  
  // Show properties panel
  showPropertiesPanel(type) {
    const panels = {
      text: this.shadowRoot.getElementById('text-properties'),
      image: this.shadowRoot.getElementById('image-properties'),
      shape: this.shadowRoot.getElementById('shape-properties'),
      table: this.shadowRoot.getElementById('table-properties'),
      annotation: this.shadowRoot.getElementById('annotation-properties'),
      none: this.shadowRoot.getElementById('no-selection')
    };
    
    // Hide all panels
    Object.values(panels).forEach(panel => {
      if (panel) panel.classList.add('hidden');
    });
    
    // Show selected panel
    if (panels[type]) {
      panels[type].classList.remove('hidden');
    }
  }
  
  // Add text
  addText() {
    if (!this.fabricCanvas) return;
    
    const text = new fabric.IText('Double click to edit text', {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
      editable: true
    });
    
    this.fabricCanvas.add(text);
    this.fabricCanvas.setActiveObject(text);
    this.selectedObject = text;
    this.showPropertiesPanel('text');
    this.saveCurrentState();
  }
  
  // Add image
  addImage() {
    if (!this.fabricCanvas) return;
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          // Scale image to fit within the canvas
          const maxWidth = this.fabricCanvas.width * 0.5;
          const maxHeight = this.fabricCanvas.height * 0.5;
          
          if (img.width > maxWidth || img.height > maxHeight) {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            img.scale(scale);
          }
          
          img.set({
            left: 50,
            top: 50
          });
          
          this.fabricCanvas.add(img);
          this.fabricCanvas.setActiveObject(img);
          this.selectedObject = img;
          this.showPropertiesPanel('image');
          this.saveCurrentState();
        });
      };
      reader.readAsDataURL(file);
    });
    
    fileInput.click();
  }
  
  // Add shape
  addShape() {
    if (!this.fabricCanvas) return;
    
    const shapeType = this.shadowRoot.getElementById('shape-type').value;
    const fill = this.shadowRoot.getElementById('shape-fill').value;
    const stroke = this.shadowRoot.getElementById('shape-stroke').value;
    const strokeWidth = parseInt(this.shadowRoot.getElementById('stroke-width').value, 10);
    
    let shape;
    
    switch(shapeType) {
      case 'rect':
        shape = new fabric.Rect({
          left: 50,
          top: 50,
          width: 100,
          height: 80,
          fill,
          stroke,
          strokeWidth
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 50,
          top: 50,
          radius: 50,
          fill,
          stroke,
          strokeWidth
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 50,
          top: 50,
          width: 100,
          height: 80,
          fill,
          stroke,
          strokeWidth
        });
        break;
      case 'line':
        shape = new fabric.Line([0, 0, 100, 0], {
          left: 50,
          top: 50,
          stroke,
          strokeWidth
        });
        break;
    }
    
    if (shape) {
      this.fabricCanvas.add(shape);
      this.fabricCanvas.setActiveObject(shape);
      this.selectedObject = shape;
      this.showPropertiesPanel('shape');
      this.saveCurrentState();
    }
  }
  
  // Add table
  addTable() {
    if (!this.fabricCanvas) return;
    
    const rows = parseInt(this.shadowRoot.getElementById('table-rows').value, 10);
    const cols = parseInt(this.shadowRoot.getElementById('table-cols').value, 10);
    const borderWidth = parseInt(this.shadowRoot.getElementById('table-border').value, 10);
    const borderColor = this.shadowRoot.getElementById('table-border-color').value;
    
    const cellWidth = 80;
    const cellHeight = 40;
    const tableWidth = cellWidth * cols;
    const tableHeight = cellHeight * rows;
    
    // Create table group
    const tableGroup = new fabric.Group([], {
      left: 50,
      top: 50,
      width: tableWidth,
      height: tableHeight,
      originX: 'left',
      originY: 'top'
    });
    
    // Create cells
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // Create cell rectangle
        const cell = new fabric.Rect({
          left: j * cellWidth,
          top: i * cellHeight,
          width: cellWidth,
          height: cellHeight,
          fill: '#ffffff',
          stroke: borderColor,
          strokeWidth: borderWidth
        });
        
        // Create cell text
        const text = new fabric.IText(`Cell ${i+1},${j+1}`, {
          left: j * cellWidth + cellWidth / 2,
          top: i * cellHeight + cellHeight / 2,
          fontSize: 12,
          fontFamily: 'Arial',
          originX: 'center',
          originY: 'center',
          textAlign: 'center'
        });
        
        tableGroup.addWithUpdate(cell);
        tableGroup.addWithUpdate(text);
      }
    }
    
    this.fabricCanvas.add(tableGroup);
    this.fabricCanvas.setActiveObject(tableGroup);
    this.selectedObject = tableGroup;
    this.saveCurrentState();
  }
  
  // Add annotation
  addAnnotation() {
    if (!this.fabricCanvas || !this.annotationMode) return;
    
    const annotationType = this.shadowRoot.getElementById('annotation-type').value;
    const color = this.shadowRoot.getElementById('annotation-color').value;
    
    switch(annotationType) {
      case 'highlight':
        this.createHighlightAnnotation(color);
        break;
      case 'underline':
        this.createUnderlineAnnotation(color);
        break;
      case 'strikethrough':
        this.createStrikethroughAnnotation(color);
        break;
      case 'note':
        this.createNoteAnnotation(color);
        break;
    }
  }
  
  // Create highlight annotation
  createHighlightAnnotation(color) {
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 30,
      fill: color,
      opacity: 0.5,
      selectable: true
    });
    
    this.fabricCanvas.add(rect);
    this.fabricCanvas.setActiveObject(rect);
    this.selectedObject = rect;
    this.saveCurrentState();
  }
  
  // Create underline annotation
  createUnderlineAnnotation(color) {
    const line = new fabric.Line([0, 0, 200, 0], {
      left: 50,
      top: 70,
      stroke: color,
      strokeWidth: 3,
      selectable: true
    });
    
    this.fabricCanvas.add(line);
    this.fabricCanvas.setActiveObject(line);
    this.selectedObject = line;
    this.saveCurrentState();
  }
  
  // Create strikethrough annotation
  createStrikethroughAnnotation(color) {
    const line = new fabric.Line([0, 0, 200, 0], {
      left: 50,
      top: 50,
      stroke: color,
      strokeWidth: 2,
      selectable: true
    });
    
    this.fabricCanvas.add(line);
    this.fabricCanvas.setActiveObject(line);
    this.selectedObject = line;
    this.saveCurrentState();
  }
  
  // Create note annotation
  createNoteAnnotation(color) {
    const noteGroup = new fabric.Group([], {
      left: 50,
      top: 50,
      selectable: true
    });
    
    const icon = new fabric.Rect({
      width: 30,
      height: 30,
      fill: color,
      rx: 5,
      ry: 5
    });
    
    const text = new fabric.IText('Note', {
      left: 40,
      top: 5,
      fontSize: 14,
      fontFamily: 'Arial'
    });
    
    noteGroup.addWithUpdate(icon);
    noteGroup.addWithUpdate(text);
    
    this.fabricCanvas.add(noteGroup);
    this.fabricCanvas.setActiveObject(noteGroup);
    this.selectedObject = noteGroup;
    this.saveCurrentState();
  }
  
  // Extract text from PDF
  async extractTextFromPDF() {
    if (!this.pdfDocument) return;
    
    try {
      this.pdfTextContent = [];
      
      for (let i = 1; i <= this.totalPages; i++) {
        const page = await this.pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        this.pdfTextContent.push(textContent);
      }
      
      console.log('Extracted text content from PDF');
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
    }
  }
  
  // Save document
  async saveDocument() {
    if (!this.pdfDocument || !this.currentPdfBytes) {
      this.showError('No PDF document is loaded.');
      return;
    }
    
    this.showLoading(true);
    
    try {
      // Load the PDF document with pdf-lib
      const pdfDoc = await PDFLib.PDFDocument.load(this.currentPdfBytes);
      
      // Get the canvas data
      const canvasDataUrl = this.fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0
      });
      
      // Convert data URL to Uint8Array
      const base64Data = canvasDataUrl.split(',')[1];
      const imageBytes = PDFLib.base64ToBytes(base64Data);
      
      // Embed the PNG image
      const image = await pdfDoc.embedPng(imageBytes);
      
      // Get page dimensions
      const pages = pdfDoc.getPages();
      const currentPdfPage = pages[this.currentPage - 1];
      const { width, height } = currentPdfPage.getSize();
      
      // Draw the image on the page (covering the existing content)
      currentPdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
      
      // Save the document
      const modifiedPdfBytes = await pdfDoc.save();
      
      // Create blob and download
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'edited_document.pdf';
      link.click();
      
      // Update the current PDF bytes
      this.currentPdfBytes = modifiedPdfBytes;
      
    } catch (error) {
      console.error('Error saving PDF:', error);
      this.showError('Failed to save the document. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }
  
  // Save current state for undo/redo
  saveCurrentState() {
    if (!this.fabricCanvas) return;
    
    // Save current state for undo
    const json = JSON.stringify(this.fabricCanvas);
    this.undoStack.push(json);
    
    // Clear redo stack when a new action is performed
    this.redoStack = [];
    
    // Limit stack size to prevent memory issues
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }
  
  // Undo
  undo() {
    if (!this.fabricCanvas || this.undoStack.length <= 1) return;
    
    // Save current state to redo stack
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    
    // Restore previous state
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.fabricCanvas.loadFromJSON(previousState, () => {
      this.fabricCanvas.renderAll();
    });
  }
  
  // Redo
  redo() {
    if (!this.fabricCanvas || this.redoStack.length === 0) return;
    
    // Get state from redo stack
    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);
    
    // Restore state
    this.fabricCanvas.loadFromJSON(nextState, () => {
      this.fabricCanvas.renderAll();
    });
  }
  
  // Show loading indicator
  showLoading(show) {
    const loading = this.shadowRoot.getElementById('loading');
    if (loading) {
      if (show) {
        loading.classList.remove('hidden');
      } else {
        loading.classList.add('hidden');
      }
    }
  }
  
  // Show error message
  showError(message) {
    const noDocumentDiv = this.shadowRoot.getElementById('no-document');
    if (noDocumentDiv) {
      noDocumentDiv.innerHTML = `
        <p style="color: #ff3b30;">${message}</p>
        <p>Please ensure you have a stable internet connection and try again.</p>
        <button class="upload-btn" id="upload-prompt">Try Again</button>
      `;
      noDocumentDiv.classList.remove('hidden');
      
      // Re-attach event listener to the new button
      const uploadPrompt = this.shadowRoot.getElementById('upload-prompt');
      if (uploadPrompt) {
        uploadPrompt.addEventListener('click', () => {
          this.shadowRoot.getElementById('file-upload').click();
        });
      }
    } else {
      alert(message);
    }
  }
  
  // Load PDF from URL (public method)
  loadPdfFromUrl(url) {
    if (!url) {
      this.showError('Invalid URL provided');
      return;
    }
    
    this.showLoading(true);
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        const pdfBytes = new Uint8Array(arrayBuffer);
        this.currentPdfBytes = pdfBytes;
        
        // Create a file object from the bytes
        const file = new File([pdfBytes], 'document.pdf', { type: 'application/pdf' });
        
        // Create a FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Create a fake event
        const event = {
          target: {
            files: dataTransfer.files
          }
        };
        
        // Use the existing file upload handler
        this.handleFileUpload(event);
      })
      .catch(error => {
        console.error('Error loading PDF from URL:', error);
        this.showError(`Failed to load the PDF from URL: ${error.message || 'Unknown error'}`);
        this.showLoading(false);
      });
  }
  
  // Public methods that can be called from outside
  clearEdits() {
    if (!this.fabricCanvas) return;
    
    // Clear all objects on the canvas
    this.fabricCanvas.clear();
    
    // Render the page again without edits
    this.renderPage();
  }
}

// Register the custom element
customElements.define('wix-pdf-editor', WixPdfEditor);
