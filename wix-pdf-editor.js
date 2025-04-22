/**
 * Wix Studio Custom Element: Advanced PDF Editor
 * 
 * This custom element allows website visitors to edit PDF files directly in the browser:
 * - Add, edit, and remove text
 * - Insert and manipulate images
 * - Create and edit tables
 * - Add shapes and annotations
 * - Save edited PDFs
 * 
 * File: wix-pdf-editor.js
 * Custom Element Tag: wix-pdf-editor
 */

import { defineCustomElement } from 'wix-custom-elements';

export default defineCustomElement({
  name: 'wix-pdf-editor',
  
  props: {
    // Customization properties
    primaryColor: {
      type: String,
      default: '#4A90E2'
    },
    buttonBackgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    buttonTextColor: {
      type: String,
      default: '#333333'
    },
    editorHeight: {
      type: String,
      default: '600px'
    },
    showToolbar: {
      type: Boolean,
      default: true
    },
    disableFileUpload: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    // Public methods that can be called from Wix code
    loadPdfFromUrl(url) {
      this._loadPdfFromUrl(url);
    },
    
    savePdf() {
      return this._savePdf();
    },
    
    getCurrentPage() {
      return this._currentPage;
    },
    
    getTotalPages() {
      return this._totalPages;
    },
    
    goToPage(pageNumber) {
      this._goToPage(pageNumber);
    },
    
    addText(options = {}) {
      this._addText(options);
    },
    
    addImage(imageUrl, options = {}) {
      this._addImage(imageUrl, options);
    },
    
    addShape(type, options = {}) {
      this._addShape(type, options);
    },
    
    clearEdits() {
      this._clearEdits();
    }
  },
  
  events: {
    'pdf-loaded': {},
    'pdf-saved': {},
    'page-changed': {},
    'edit-made': {},
    'error': {}
  },
  
  render({ props }) {
    const container = document.createElement('div');
    container.className = 'wix-pdf-editor-container';
    container.style.height = props.editorHeight;
    container.style.width = '100%';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Add CSS variables for styling
    container.style.setProperty('--primary-color', props.primaryColor);
    container.style.setProperty('--button-bg-color', props.buttonBackgroundColor);
    container.style.setProperty('--button-text-color', props.buttonTextColor);
    
    // Basic HTML structure
    container.innerHTML = `
      <style>
        .wix-pdf-editor-container {
          display: flex;
          flex-direction: column;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background-color: #fff;
        }
        
        .toolbar {
          display: ${props.showToolbar ? 'flex' : 'none'};
          align-items: center;
          padding: 10px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          flex-wrap: wrap;
        }
        
        .toolbar-group {
          display: flex;
          align-items: center;
          margin-right: 15px;
        }
        
        .toolbar button {
          background-color: var(--button-bg-color);
          color: var(--button-text-color);
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 6px 12px;
          margin: 0 2px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .toolbar button:hover {
          background-color: #e8f4fd;
        }
        
        .toolbar button.active {
          background-color: var(--primary-color);
          color: white;
        }
        
        .toolbar select, .toolbar input {
          padding: 6px;
          border: 1px solid #e0e0e0;
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
          border-left: 1px solid #e0e0e0;
          padding: 15px;
          overflow-y: auto;
        }
        
        .properties-panel h3 {
          margin-top: 0;
          border-bottom: 1px solid #e0e0e0;
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
          border: 1px solid #e0e0e0;
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
          background-color: #66BB6A;
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
          color: #333333;
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
          border: 5px solid #f5f5f5;
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
      </style>
      
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="upload-btn" id="upload-button" ${props.disableFileUpload ? 'disabled' : ''}>Open PDF</button>
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
            <button class="upload-btn" id="upload-prompt" ${props.disableFileUpload ? 'style="display:none"' : ''}>Open PDF</button>
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
    `;
    
    return container;
  },
  
  connected({ props, methods, emit, element }) {
    // Store references to key elements
    this._element = element;
    this._emit = emit;
    this._props = props;
    
    // Initialize state
    this._currentPage = 1;
    this._totalPages = 0;
    this._scale = 1.0;
    this._pdfDocument = null;
    this._fabricCanvas = null;
    this._currentPdfBytes = null;
    this._undoStack = [];
    this._redoStack = [];
    this._selectedObject = null;
    
    // Mode flags
    this._textEditMode = false;
    this._imageEditMode = false;
    this._shapeEditMode = false;
    this._tableEditMode = false;
    this._annotationMode = false;
    
    // Load required libraries
    this._loadLibraries().then(() => {
      // Initialize event listeners
      this._initializeEventListeners();
      console.log('PDF Editor initialized successfully');
    }).catch(error => {
      console.error('Failed to initialize PDF Editor:', error);
      this._showError('Failed to initialize the PDF Editor. Please refresh the page and try again.');
      emit('error', { message: 'Failed to initialize', details: error.message });
    });
  },
  
  disconnected() {
    // Clean up resources when element is removed
    if (this._fabricCanvas) {
      this._fabricCanvas.dispose();
    }
    
    if (this._pdfDocument) {
      this._pdfDocument.destroy();
    }
  },
  
  propsChanged({ changedProps }) {
    // Handle prop changes
    if (changedProps.has('primaryColor')) {
      this._element.style.setProperty('--primary-color', this._props.primaryColor);
    }
    
    if (changedProps.has('buttonBackgroundColor')) {
      this._element.style.setProperty('--button-bg-color', this._props.buttonBackgroundColor);
    }
    
    if (changedProps.has('buttonTextColor')) {
      this._element.style.setProperty('--button-text-color', this._props.buttonTextColor);
    }
    
    if (changedProps.has('editorHeight')) {
      this._element.style.height = this._props.editorHeight;
    }
    
    if (changedProps.has('showToolbar')) {
      const toolbar = this._element.querySelector('.toolbar');
      if (toolbar) {
        toolbar.style.display = this._props.showToolbar ? 'flex' : 'none';
      }
    }
    
    if (changedProps.has('disableFileUpload')) {
      const uploadButton = this._element.querySelector('#upload-button');
      const uploadPrompt = this._element.querySelector('#upload-prompt');
      
      if (uploadButton) {
        uploadButton.disabled = this._props.disableFileUpload;
      }
      
      if (uploadPrompt) {
        uploadPrompt.style.display = this._props.disableFileUpload ? 'none' : 'block';
      }
    }
  },
  
  // Private methods
  _loadLibraries() {
    const libraries = {
      pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
      pdfworker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
      pdflib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
      fabric: 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
      jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    };
    
    const loadScript = (url) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = (e) => {
          console.error(`Failed to load script: ${url}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    };
    
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Loading PDF.js...');
        await loadScript(libraries.pdfjs);
        
        console.log('Setting up PDF.js worker...');
        // Must set the worker before loading other libraries
        window.pdfjsLib = window.pdfjsLib || {};
        window.pdfjsLib.GlobalWorkerOptions = window.pdfjsLib.GlobalWorkerOptions || {};
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = libraries.pdfworker;
        
        console.log('Loading remaining libraries...');
        // Load the rest of the libraries in parallel
        await Promise.all([
          loadScript(libraries.pdflib),
          loadScript(libraries.fabric),
          loadScript(libraries.jspdf)
        ]);
        
        console.log('All libraries loaded successfully');
        resolve(true);
      } catch (error) {
        console.error('Error loading libraries:', error);
        reject(error);
      }
    });
  },
  
  _initializeEventListeners() {
    // File upload
    const uploadButton = this._element.querySelector('#upload-button');
    const uploadPrompt = this._element.querySelector('#upload-prompt');
    const fileUpload = this._element.querySelector('#file-upload');
    
    if (uploadButton) {
      uploadButton.addEventListener('click', () => fileUpload.click());
    }
    
    if (uploadPrompt) {
      uploadPrompt.addEventListener('click', () => fileUpload.click());
    }
    
    if (fileUpload) {
      fileUpload.addEventListener('change', this._handleFileUpload.bind(this));
    }
    
    // Page navigation
    const prevPageBtn = this._element.querySelector('#prev-page');
    const nextPageBtn = this._element.querySelector('#next-page');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => this._goToPage(this._currentPage - 1));
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => this._goToPage(this._currentPage + 1));
    }
    
    // Zoom controls
    const zoomInBtn = this._element.querySelector('#zoom-in');
    const zoomOutBtn = this._element.querySelector('#zoom-out');
    const zoomLevel = this._element.querySelector('#zoom-level');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', this._zoomIn.bind(this));
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', this._zoomOut.bind(this));
    }
    
    if (zoomLevel) {
      zoomLevel.addEventListener('change', (e) => {
        this._scale = parseFloat(e.target.value);
        this._renderPage();
      });
    }
    
    // Tools
    const textBtn = this._element.querySelector('#text-button');
    const imageBtn = this._element.querySelector('#image-button');
    const shapeBtn = this._element.querySelector('#shape-button');
    const tableBtn = this._element.querySelector('#table-button');
    const annotationBtn = this._element.querySelector('#annotation-button');
    
    if (textBtn) {
      textBtn.addEventListener('click', () => this._handleModeSelection('text'));
    }
    
    if (imageBtn) {
      imageBtn.addEventListener('click', () => this._handleModeSelection('image'));
    }
    
    if (shapeBtn) {
      shapeBtn.addEventListener('click', () => this._handleModeSelection('shape'));
    }
    
    if (tableBtn) {
      tableBtn.addEventListener('click', () => this._handleModeSelection('table'));
    }
    
    if (annotationBtn) {
      annotationBtn.addEventListener('click', () => this._handleModeSelection('annotation'));
    }
    
    // Undo/Redo
    const undoBtn = this._element.querySelector('#undo-button');
    const redoBtn = this._element.querySelector('#redo-button');
    
    if (undoBtn) {
      undoBtn.addEventListener('click', this._undo.bind(this));
    }
    
    if (redoBtn) {
      redoBtn.addEventListener('click', this._redo.bind(this));
    }
    
    // Save
    const saveBtn = this._element.querySelector('#save-button');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._savePdf().then(result => {
          this._emit('pdf-saved', { success: true, result });
        }).catch(error => {
          this._emit('error', { message: 'Failed to save PDF', details: error.message });
        });
      });
    }
    
    // Property changes
    const textProperties = this._element.querySelector('#text-properties');
    const imageProperties = this._element.querySelector('#image-properties');
    const shapeProperties = this._element.querySelector('#shape-properties');
    const createTableBtn = this._element.querySelector('#create-table');
    const bringFrontBtn = this._element.querySelector('#bring-front');
    const sendBackBtn = this._element.querySelector('#send-back');
    
    if (textProperties) {
      textProperties.addEventListener('change', this._updateObjectProperties.bind(this));
      textProperties.addEventListener('click', this._updateObjectProperties.bind(this));
    }
    
    if (imageProperties) {
      imageProperties.addEventListener('change', this._updateObjectProperties.bind(this));
      imageProperties.addEventListener('input', this._updateObjectProperties.bind(this));
    }
    
    if (shapeProperties) {
      shapeProperties.addEventListener('change', this._updateObjectProperties.bind(this));
    }
    
    if (createTableBtn) {
      createTableBtn.addEventListener('click', this._addTable.bind(this));
    }
    
    if (bringFrontBtn) {
      bringFrontBtn.addEventListener('click', () => {
        if (this._selectedObject) {
          this._selectedObject.bringToFront();
          this._fabricCanvas.renderAll();
          this._saveCurrentState();
        }
      });
    }
    
    if (sendBackBtn) {
      sendBackBtn.addEventListener('click', () => {
        if (this._selectedObject) {
          this._selectedObject.sendToBack();
          this._fabricCanvas.renderAll();
          this._saveCurrentState();
        }
      });
    }
  },
  
  async _handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      this._showError('Please select a valid PDF file.');
      this._emit('error', { message: 'Invalid file type', details: 'Please select a valid PDF file.' });
      return;
    }
    
    this._showLoading(true);
    
    try {
      console.log('Reading PDF file...');
      // Verify PDF.js is loaded
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded correctly');
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      this._currentPdfBytes = pdfBytes;
      
      console.log('PDF file read successfully, creating document task...');
      
      // Load PDF using PDF.js with explicit version
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfBytes,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
        cMapPacked: true,
        enableXfa: true
      });
      
      console.log('Waiting for PDF to load...');
      this._pdfDocument = await loadingTask.promise;
      console.log('PDF document loaded successfully');
      
      this._totalPages = this._pdfDocument.numPages;
      this._currentPage = 1;
      
      // Update page indicator
      const pageIndicator = this._element.querySelector('#page-indicator');
      if (pageIndicator) {
        pageIndicator.textContent = `${this._currentPage} / ${this._totalPages}`;
      }
      
      // Hide the "no document" message
      const noDocument = this._element.querySelector('#no-document');
      if (noDocument) {
        noDocument.classList.add('hidden');
      }
      
      // Render the first page
      console.log('Rendering first page...');
      await this._renderPage();
      
      // Extract text for later use
      console.log('Extracting text from PDF...');
      await this._extractTextFromPDF();
      console.log('PDF loaded and processed successfully');
      
      // Emit event
      this._emit('pdf-loaded', { 
        fileName: file.name,
        totalPages: this._totalPages,
        currentPage: this._currentPage
      });
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this._showError(`Failed to load the PDF file: ${error.message || 'Unknown error'}`);
      this._emit('error', { message: 'Failed to load PDF', details: error.message });
    } finally {
      this._showLoading(false);
    }
  },
  
  async _loadPdfFromUrl(url) {
    if (!url) {
      this._showError('Invalid URL provided');
      this._emit('error', { message: 'Invalid URL', details: 'No URL provided' });
      return;
    }
    
    this._showLoading(true);
    
    try {
      console.log(`Loading PDF from URL: ${url}`);
      
      // Verify PDF.js is loaded
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded correctly');
      }
      
      // Fetch the PDF
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      this._currentPdfBytes = pdfBytes;
      
      // Load PDF using PDF.js
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfBytes,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
        cMapPacked: true,
        enableXfa: true
      });
      
      this._pdfDocument = await loadingTask.promise;
      
      this._totalPages = this._pdfDocument.numPages;
      this._currentPage = 1;
      
      // Update page indicator
      const pageIndicator = this._element.querySelector('#page-indicator');
      if (pageIndicator) {
        pageIndicator.textContent = `${this._currentPage} / ${this._totalPages}`;
      }
      
      // Hide the "no document" message
      const noDocument = this._element.querySelector('#no-document');
      if (noDocument) {
        noDocument.classList.add('hidden');
      }
      
      // Render the first page
      await this._renderPage();
      
      // Extract text for later use
      await this._extractTextFromPDF();
      
      // Emit event
      this._emit('pdf-loaded', { 
        url: url,
        totalPages: this._totalPages,
        currentPage: this._currentPage
      });
      
    } catch (error) {
      console.error('Error loading PDF from URL:', error);
      this._showError(`Failed to load the PDF from URL: ${error.message || 'Unknown error'}`);
      this._emit('error', { message: 'Failed to load PDF from URL', details: error.message });
    } finally {
      this._showLoading(false);
    }
  },
  
  async _renderPage() {
    if (!this._pdfDocument) {
      console.warn('No PDF document loaded yet');
      return;
    }
    
    this._showLoading(true);
    
    try {
      console.log(`Rendering page ${this._currentPage}...`);
      
      // Verify fabric.js is loaded
      if (typeof fabric === 'undefined') {
        throw new Error('Fabric.js library not loaded correctly');
      }
      
      // Get the page
      const page = await this._pdfDocument.getPage(this._currentPage);
      console.log('PDF page fetched successfully');
      
      // Calculate dimensions
      const viewport = page.getViewport({ scale: this._scale });
      const canvasWidth = viewport.width;
      const canvasHeight = viewport.height;
      
      // Remove previous canvas if it exists
      const canvasContainer = this._element.querySelector('#canvas-container');
      const oldContainer = this._element.querySelector('.pdf-canvas-container');
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
        enableWebGL: true
      };
      
      await page.render(renderContext).promise;
      console.log('PDF page rendered successfully');
      
      // Initialize Fabric.js canvas
      console.log('Initializing Fabric.js canvas...');
      this._fabricCanvas = new fabric.Canvas('fabric-canvas', {
        width: canvasWidth,
        height: canvasHeight,
        preserveObjectStacking: true,
        selection: true,
        interactive: true
      });
      
      // Setup fabric canvas event listeners
      this._setupFabricEventListeners();
      console.log('Fabric canvas initialized');
      
      // Save initial state
      this._saveCurrentState();
      
      // Emit page changed event
      this._emit('page-changed', {
        currentPage: this._currentPage,
        totalPages: this._totalPages
      });
      
    } catch (error) {
      console.error('Error rendering page:', error);
      this._showError(`Failed to render the PDF page: ${error.message || 'Unknown error'}`);
      this._emit('error', { message: 'Failed to render PDF page', details: error.message });
    } finally {
      this._showLoading(false);
    }
  },
  
  _setupFabricEventListeners() {
    if (!this._fabricCanvas) return;
    
    // Object selection
    this._fabricCanvas.on('selection:created', this._handleCanvasObjectSelection.bind(this));
    this._fabricCanvas.on('selection:updated', this._handleCanvasObjectSelection.bind(this));
    this._fabricCanvas.on('selection:cleared', () => {
      this._selectedObject = null;
      this._showPropertiesPanel('none');
    });
    
    // Object modification
    this._fabricCanvas.on('object:modified', () => {
      this._saveCurrentState();
      this._emit('edit-made', { type: 'object-modified' });
    });
  },
  
  _handleCanvasObjectSelection(options) {
    const activeObject = options.selected[0];
    if (!activeObject) return;
    
    this._selectedObject = activeObject;
    
    // Determine the type of the selected object and show appropriate properties panel
    if (activeObject.type === 'textbox' || activeObject.type === 'i-text') {
      this._showPropertiesPanel('text');
      
      // Update properties panel with current text values
      const fontFamily = this._element.querySelector('#font-family');
      const fontSize = this._element.querySelector('#font-size');
      const textColor = this._element.querySelector('#text-color');
      
      if (fontFamily) fontFamily.value = activeObject.fontFamily;
      if (fontSize) fontSize.value = activeObject.fontSize;
      if (textColor) textColor.value = activeObject.fill;
      
    } else if (activeObject.type === 'image') {
      this._showPropertiesPanel('image');
      
      // Update properties panel with current image values
      const imageWidth = this._element.querySelector('#image-width');
      const imageHeight = this._element.querySelector('#image-height');
      const imageOpacity = this._element.querySelector('#image-opacity');
      
      if (imageWidth) imageWidth.value = Math.round(activeObject.width * activeObject.scaleX);
      if (imageHeight) imageHeight.value = Math.round(activeObject.height * activeObject.scaleY);
      if (imageOpacity) imageOpacity.value = activeObject.opacity;
      
    } else if (activeObject.type === 'rect' || activeObject.type === 'circle' || 
              activeObject.type === 'triangle' || activeObject.type === 'line') {
      this._showPropertiesPanel('shape');
      
      // Update properties panel with current shape values
      const shapeFill = this._element.querySelector('#shape-fill');
      const shapeStroke = this._element.querySelector('#shape-stroke');
      const strokeWidth = this._element.querySelector('#stroke-width');
      const shapeType = this._element.querySelector('#shape-type');
      
      if (shapeFill) shapeFill.value = activeObject.fill || '#ffffff';
      if (shapeStroke) shapeStroke.value = activeObject.stroke || '#000000';
      if (strokeWidth) strokeWidth.value = activeObject.strokeWidth || 1;
      
      // Set shape type
      if (shapeType) {
        if (activeObject.type === 'rect') shapeType.value = 'rect';
        else if (activeObject.type === 'circle') shapeType.value = 'circle';
        else if (activeObject.type === 'triangle') shapeType.value = 'triangle';
        else if (activeObject.type === 'line') shapeType.value = 'line';
      }
    }
  },
  
  _updateObjectProperties(event) {
    if (!this._selectedObject) return;
    
    const target = event.target;
    
    // Text properties
    if (target.id === 'font-family') {
      this._selectedObject.set('fontFamily', target.value);
    } else if (target.id === 'font-size') {
      this._selectedObject.set('fontSize', parseInt(target.value, 10));
    } else if (target.id === 'text-color') {
      this._selectedObject.set('fill', target.value);
    } else if (target.id === 'text-bold') {
      this._selectedObject.set('fontWeight', this._selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
    } else if (target.id === 'text-italic') {
      this._selectedObject.set('fontStyle', this._selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
    } else if (target.id === 'text-underline') {
      this._selectedObject.set('underline', !this._selectedObject.underline);
    }
    
    // Image properties
    else if (target.id === 'image-width') {
      const width = parseInt(target.value, 10);
      this._selectedObject.set('scaleX', width / this._selectedObject.width);
    } else if (target.id === 'image-height') {
      const height = parseInt(target.value, 10);
      this._selectedObject.set('scaleY', height / this._selectedObject.height);
    } else if (target.id === 'image-opacity') {
      this._selectedObject.set('opacity', parseFloat(target.value));
    }
    
    // Shape properties
    else if (target.id === 'shape-fill') {
      this._selectedObject.set('fill', target.value);
    } else if (target.id === 'shape-stroke') {
      this._selectedObject.set('stroke', target.value);
    } else if (target.id === 'stroke-width') {
      this._selectedObject.set('strokeWidth', parseInt(target.value, 10));
    }
    
    this._fabricCanvas.renderAll();
    
    // Don't save state on every change to avoid filling the undo stack
    // Only save on mouseup or other significant events
    if (event.type === 'change') {
      this._saveCurrentState();
      this._emit('edit-made', { type: 'property-changed', property: target.id });
    }
  },
  
  _goToPage(pageNum) {
    if (!this._pdfDocument) return;
    
    if (pageNum < 1 || pageNum > this._totalPages) return;
    
    this._currentPage = pageNum;
    
    const pageIndicator = this._element.querySelector('#page-indicator');
    if (pageIndicator) {
      pageIndicator.textContent = `${this._currentPage} / ${this._totalPages}`;
    }
    
    this._renderPage();
  },
  
  _zoomIn() {
    this._scale = Math.min(this._scale + 0.25, 3.0);
    
    const zoomLevel = this._element.querySelector('#zoom-level');
    if (zoomLevel) {
      zoomLevel.value = this._scale.toString();
    }
    
    this._renderPage();
  },
  
  _zoomOut() {
    this._scale = Math.max(this._scale - 0.25, 0.25);
    
    const zoomLevel = this._element.querySelector('#zoom-level');
    if (zoomLevel) {
      zoomLevel.value = this._scale.toString();
    }
    
    this._renderPage();
  },
  
  _handleModeSelection(mode) {
    // Reset all mode buttons
    const buttons = [
      this._element.querySelector('#text-button'),
      this._element.querySelector('#image-button'),
      this._element.querySelector('#shape-button'),
      this._element.querySelector('#table-button'),
      this._element.querySelector('#annotation-button')
    ];
    
    buttons.forEach(button => {
      if (button) button.classList.remove('active');
    });
    
    // Reset all mode flags
    this._textEditMode = false;
    this._imageEditMode = false;
    this._shapeEditMode = false;
    this._tableEditMode = false;
    this._annotationMode = false;
    
    // Set active mode
    switch(mode) {
      case 'text':
        this._textEditMode = true;
        const textBtn = this._element.querySelector('#text-button');
        if (textBtn) textBtn.classList.add('active');
        this._addText();
        break;
      case 'image':
        this._imageEditMode = true;
        const imageBtn = this._element.querySelector('#image-button');
        if (imageBtn) imageBtn.classList.add('active');
        this._addImage();
        break;
      case 'shape':
        this._shapeEditMode = true;
        const shapeBtn = this._element.querySelector('#shape-button');
        if (shapeBtn) shapeBtn.classList.add('active');
        this._addShape();
        break;
      case 'table':
        this._tableEditMode = true;
        const tableBtn = this._element.querySelector('#table-button');
        if (tableBtn) tableBtn.classList.add('active');
        // Table creation is handled by the Create Table button
        this._showPropertiesPanel('table');
        break;
      case 'annotation':
        this._annotationMode = true;
        const annotationBtn = this._element.querySelector('#annotation-button');
        if (annotationBtn) annotationBtn.classList.add('active');
        this._addAnnotation();
        break;
    }
  },
  
  _showPropertiesPanel(type) {
    const panels = {
      text: this._element.querySelector('#text-properties'),
      image: this._element.querySelector('#image-properties'),
      shape: this._element.querySelector('#shape-properties'),
      table: this._element.querySelector('#table-properties'),
      annotation: this._element.querySelector('#annotation-properties'),
      none: this._element.querySelector('#no-selection')
    };
    
    // Hide all panels
    Object.values(panels).forEach(panel => {
      if (panel) panel.classList.add('hidden');
    });
    
    // Show selected panel
    if (panels[type]) {
      panels[type].classList.remove('hidden');
    }
  },
  
  _addText(options = {}) {
    if (!this._fabricCanvas) return;
    
    const defaultOptions = {
      text: 'Double click to edit text',
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false
    };
    
    const textOptions = { ...defaultOptions, ...options };
    
    const text = new fabric.IText(textOptions.text, {
      left: textOptions.left,
      top: textOptions.top,
      fontFamily: textOptions.fontFamily,
      fontSize: textOptions.fontSize,
      fill: textOptions.fill,
      fontWeight: textOptions.fontWeight,
      fontStyle: textOptions.fontStyle,
      underline: textOptions.underline,
      editable: true
    });
    
    this._fabricCanvas.add(text);
    this._fabricCanvas.setActiveObject(text);
    this._selectedObject = text;
    this._showPropertiesPanel('text');
    this._saveCurrentState();
    this._emit('edit-made', { type: 'text-added' });
  },
  
  _addImage(imageUrl, options = {}) {
    if (!this._fabricCanvas) return;
    
    const defaultOptions = {
      left: 50,
      top: 50,
      maxWidth: this._fabricCanvas.width * 0.5,
      maxHeight: this._fabricCanvas.height * 0.5,
      opacity: 1
    };
    
    const imageOptions = { ...defaultOptions, ...options };
    
    if (imageUrl) {
      // Load image from URL
      fabric.Image.fromURL(imageUrl, (img) => {
        // Scale image to fit within the canvas
        if (img.width > imageOptions.maxWidth || img.height > imageOptions.maxHeight) {
          const scale = Math.min(imageOptions.maxWidth / img.width, imageOptions.maxHeight / img.height);
          img.scale(scale);
        }
        
        img.set({
          left: imageOptions.left,
          top: imageOptions.top,
          opacity: imageOptions.opacity
        });
        
        this._fabricCanvas.add(img);
        this._fabricCanvas.setActiveObject(img);
        this._selectedObject = img;
        this._showPropertiesPanel('image');
        this._saveCurrentState();
        this._emit('edit-made', { type: 'image-added' });
      });
    } else {
      // Create a file input element for user to select image
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
            if (img.width > imageOptions.maxWidth || img.height > imageOptions.maxHeight) {
              const scale = Math.min(imageOptions.maxWidth / img.width, imageOptions.maxHeight / img.height);
              img.scale(scale);
            }
            
            img.set({
              left: imageOptions.left,
              top: imageOptions.top,
              opacity: imageOptions.opacity
            });
            
            this._fabricCanvas.add(img);
            this._fabricCanvas.setActiveObject(img);
            this._selectedObject = img;
            this._showPropertiesPanel('image');
            this._saveCurrentState();
            this._emit('edit-made', { type: 'image-added' });
          });
        };
        reader.readAsDataURL(file);
      });
      
      fileInput.click();
    }
  },
  
  _addShape(type, options = {}) {
    if (!this._fabricCanvas) return;
    
    // If type not provided, get it from UI
    if (!type) {
      const shapeTypeSelect = this._element.querySelector('#shape-type');
      type = shapeTypeSelect ? shapeTypeSelect.value : 'rect';
    }
    
    const defaultOptions = {
      left: 50,
      top: 50,
      width: 100,
      height: 80,
      radius: 50, // for circle
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1
    };
    
    const shapeOptions = { ...defaultOptions, ...options };
    
    let shape;
    
    switch(type) {
      case 'rect':
        shape = new fabric.Rect({
          left: shapeOptions.left,
          top: shapeOptions.top,
          width: shapeOptions.width,
          height: shapeOptions.height,
          fill: shapeOptions.fill,
          stroke: shapeOptions.stroke,
          strokeWidth: shapeOptions.strokeWidth
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: shapeOptions.left,
          top: shapeOptions.top,
          radius: shapeOptions.radius,
          fill: shapeOptions.fill,
          stroke: shapeOptions.stroke,
          strokeWidth: shapeOptions.strokeWidth
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: shapeOptions.left,
          top: shapeOptions.top,
          width: shapeOptions.width,
          height: shapeOptions.height,
          fill: shapeOptions.fill,
          stroke: shapeOptions.stroke,
          strokeWidth: shapeOptions.strokeWidth
        });
        break;
      case 'line':
        shape = new fabric.Line([0, 0, shapeOptions.width, 0], {
          left: shapeOptions.left,
          top: shapeOptions.top,
          stroke: shapeOptions.stroke,
          strokeWidth: shapeOptions.strokeWidth
        });
        break;
    }
    
    if (shape) {
      this._fabricCanvas.add(shape);
      this._fabricCanvas.setActiveObject(shape);
      this._selectedObject = shape;
      this._showPropertiesPanel('shape');
      this._saveCurrentState();
      this._emit('edit-made', { type: 'shape-added', shapeType: type });
    }
  },
  
  _addTable() {
    if (!this._fabricCanvas) return;
    
    const rowsInput = this._element.querySelector('#table-rows');
    const colsInput = this._element.querySelector('#table-cols');
    const borderWidthInput = this._element.querySelector('#table-border');
    const borderColorInput = this._element.querySelector('#table-border-color');
    
    const rows = rowsInput ? parseInt(rowsInput.value, 10) : 3;
    const cols = colsInput ? parseInt(colsInput.value, 10) : 3;
    const borderWidth = borderWidthInput ? parseInt(borderWidthInput.value, 10) : 1;
    const borderColor = borderColorInput ? borderColorInput.value : '#000000';
    
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
    
    this._fabricCanvas.add(tableGroup);
    this._fabricCanvas.setActiveObject(tableGroup);
    this._selectedObject = tableGroup;
    this._saveCurrentState();
    this._emit('edit-made', { type: 'table-added', rows, cols });
  },
  
  _addAnnotation() {
    if (!this._fabricCanvas || !this._annotationMode) return;
    
    const annotationTypeSelect = this._element.querySelector('#annotation-type');
    const colorInput = this._element.querySelector('#annotation-color');
    
    const annotationType = annotationTypeSelect ? annotationTypeSelect.value : 'highlight';
    const color = colorInput ? colorInput.value : '#ffff00';
    
    switch(annotationType) {
      case 'highlight':
        this._createHighlightAnnotation(color);
        break;
      case 'underline':
        this._createUnderlineAnnotation(color);
        break;
      case 'strikethrough':
        this._createStrikethroughAnnotation(color);
        break;
      case 'note':
        this._createNoteAnnotation(color);
        break;
    }
  },
  
  _createHighlightAnnotation(color) {
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 30,
      fill: color,
      opacity: 0.5,
      selectable: true
    });
    
    this._fabricCanvas.add(rect);
    this._fabricCanvas.setActiveObject(rect);
    this._selectedObject = rect;
    this._saveCurrentState();
    this._emit('edit-made', { type: 'annotation-added', annotationType: 'highlight' });
  },
  
  _createUnderlineAnnotation(color) {
    const line = new fabric.Line([0, 0, 200, 0], {
      left: 50,
      top: 70,
      stroke: color,
      strokeWidth: 3,
      selectable: true
    });
    
    this._fabricCanvas.add(line);
    this._fabricCanvas.setActiveObject(line);
    this._selectedObject = line;
    this._saveCurrentState();
    this._emit('edit-made', { type: 'annotation-added', annotationType: 'underline' });
  },
  
  _createStrikethroughAnnotation(color) {
    const line = new fabric.Line([0, 0, 200, 0], {
      left: 50,
      top: 50,
      stroke: color,
      strokeWidth: 2,
      selectable: true
    });
    
    this._fabricCanvas.add(line);
    this._fabricCanvas.setActiveObject(line);
    this._selectedObject = line;
    this._saveCurrentState();
    this._emit('edit-made', { type: 'annotation-added', annotationType: 'strikethrough' });
  },
  
  _createNoteAnnotation(color) {
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
    
    this._fabricCanvas.add(noteGroup);
    this._fabricCanvas.setActiveObject(noteGroup);
    this._selectedObject = noteGroup;
    this._saveCurrentState();
    this._emit('edit-made', { type: 'annotation-added', annotationType: 'note' });
  },
  
  async _extractTextFromPDF() {
    if (!this._pdfDocument) return;
    
    try {
      this._pdfTextContent = [];
      
      for (let i = 1; i <= this._totalPages; i++) {
        const page = await this._pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        this._pdfTextContent.push(textContent);
      }
      
      console.log('Extracted text content from PDF');
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      this._emit('error', { message: 'Failed to extract text', details: error.message });
    }
  },
  
  async _savePdf() {
    if (!this._pdfDocument || !this._currentPdfBytes) {
      this._showError('No PDF document is loaded.');
      throw new Error('No PDF document is loaded.');
    }
    
    this._showLoading(true);
    
    try {
      // Load the PDF document with pdf-lib
      const pdfDoc = await PDFLib.PDFDocument.load(this._currentPdfBytes);
      
      // Get the canvas data
      const canvasDataUrl = this._fabricCanvas.toDataURL({
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
      const currentPdfPage = pages[this._currentPage - 1];
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
      this._currentPdfBytes = modifiedPdfBytes;
      
      return {
        success: true,
        bytes: modifiedPdfBytes,
        blob: blob
      };
      
    } catch (error) {
      console.error('Error saving PDF:', error);
      this._showError('Failed to save the document. Please try again.');
      throw error;
    } finally {
      this._showLoading(false);
    }
  },
  
  _clearEdits() {
    if (!this._fabricCanvas) return;
    
    // Clear all objects on the canvas
    this._fabricCanvas.clear();
    
    // Render the page again without edits
    this._renderPage();
  },
  
  _saveCurrentState() {
    if (!this._fabricCanvas) return;
    
    // Save current state for undo
    const json = JSON.stringify(this._fabricCanvas);
    this._undoStack.push(json);
    
    // Clear redo stack when a new action is performed
    this._redoStack = [];
    
    // Limit stack size to prevent memory issues
    if (this._undoStack.length > 50) {
      this._undoStack.shift();
    }
  },
  
  _undo() {
    if (!this._fabricCanvas || this._undoStack.length <= 1) return;
    
    // Save current state to redo stack
    const currentState = this._undoStack.pop();
    this._redoStack.push(currentState);
    
    // Restore previous state
    const previousState = this._undoStack[this._undoStack.length - 1];
    this._fabricCanvas.loadFromJSON(previousState, () => {
      this._fabricCanvas.renderAll();
      this._emit('edit-made', { type: 'undo' });
    });
  },
  
  _redo() {
    if (!this._fabricCanvas || this._redoStack.length === 0) return;
    
    // Get state from redo stack
    const nextState = this._redoStack.pop();
    this._undoStack.push(nextState);
    
    // Restore state
    this._fabricCanvas.loadFromJSON(nextState, () => {
      this._fabricCanvas.renderAll();
      this._emit('edit-made', { type: 'redo' });
    });
  },
  
  _showLoading(show) {
    const loading = this._element.querySelector('#loading');
    if (loading) {
      if (show) {
        loading.classList.remove('hidden');
      } else {
        loading.classList.add('hidden');
      }
    }
  },
  
  _showError(message) {
    const noDocumentDiv = this._element.querySelector('#no-document');
    if (noDocumentDiv) {
      noDocumentDiv.innerHTML = `
        <p style="color: #ff3b30;">${message}</p>
        <p>Please ensure you have a stable internet connection and try again.</p>
      `;
      noDocumentDiv.classList.remove('hidden');
    } else {
      alert(message);
    }
  }
});
