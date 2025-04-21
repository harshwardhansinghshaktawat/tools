/**
 * Advanced Image Cropper - Wix Studio Custom Element
 * 
 * File: wix-image-cropper.js
 * Custom Element Tag: <wix-image-cropper>
 * 
 * Features:
 * - Image upload with drag and drop
 * - Interactive cropping interface with resize/move
 * - Multiple aspect ratio options
 * - Rotation and flipping capabilities
 * - Zoom functionality
 * - Image filters and adjustments
 * - Download cropped image
 * - Mobile-friendly design
 */

class WixImageCropper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State variables
    this.image = null;
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
    this.dragStart = { x: 0, y: 0 };
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = '';
    this.scale = 1;
    this.rotation = 0;
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.brightness = 100;
    this.contrast = 100;
    this.saturation = 100;
    this.currentAspectRatio = null; // null = free form
    this.originalFileType = null; // store original file type
    
    // Render the initial UI
    this.render();
  }

  connectedCallback() {
    this.setupEventListeners();
    
    // Notify Wix Studio that the element is ready
    if (window.wixDevelopmentSDK) {
      window.wixDevelopmentSDK.elementReady({
        name: 'wix-image-cropper',
        properties: [
          { name: 'maxWidth', type: 'number', defaultValue: 800 },
          { name: 'maxHeight', type: 'number', defaultValue: 600 },
          { name: 'allowedFileTypes', type: 'string', defaultValue: 'image/jpeg,image/png,image/gif' },
          { name: 'maxFileSize', type: 'number', defaultValue: 5 }, // in MB
          { name: 'defaultAspectRatio', type: 'string', defaultValue: 'free' },
          { name: 'enableFilters', type: 'boolean', defaultValue: true },
          { name: 'enableRotation', type: 'boolean', defaultValue: true },
          { name: 'quality', type: 'number', defaultValue: 0.92 }
        ],
        events: [
          { name: 'imageCropped', data: { imageData: 'string' } },
          { name: 'cropCancelled' },
          { name: 'error', data: { message: 'string' } }
        ]
      });
    }
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  // Generate HTML structure with CSS
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          width: 100%;
          height: 100%;
          min-height: 400px;
          box-sizing: border-box;
        }
        
        * {
          box-sizing: border-box;
        }
        
        .cropper-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .upload-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #ccc;
          border-radius: 8px;
          margin: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .upload-area.drag-over {
          background-color: rgba(0, 120, 212, 0.05);
          border-color: #0078d4;
        }
        
        .upload-area svg {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          color: #666;
        }
        
        .upload-area h3 {
          margin: 0 0 8px 0;
          color: #333;
        }
        
        .supported-formats {
          font-size: 12px;
          color: #666;
          margin-top: 4px !important;
        }
        
        .upload-area p {
          margin: 0;
          color: #666;
        }
        
        .upload-btn {
          background-color: #0078d4;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          margin-top: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .upload-btn:hover {
          background-color: #006cbe;
        }
        
        .cropper-workspace {
          display: none;
          flex-direction: column;
          height: 100%;
        }
        
        .workspace-active .cropper-workspace {
          display: flex;
        }
        
        .workspace-active .upload-area {
          display: none;
        }
        
        .canvas-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background-color: #222;
          margin: 0 20px;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        #cropCanvas {
          position: relative; /* Changed from absolute to relative */
          max-width: 100%;
          max-height: 100%;
        }
        
        .crop-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .crop-box {
          position: absolute;
          border: 3px solid #0078d4;
          box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.7);
          pointer-events: none;
          z-index: 10;
        }
        
        /* Grid overlay inside crop box */
        .crop-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px);
          background-size: 33.33% 33.33%;
          pointer-events: none;
        }
        
        .crop-handle {
          width: 14px;
          height: 14px;
          background-color: #fff;
          border: 2px solid #0078d4;
          position: absolute;
          pointer-events: auto;
          cursor: nwse-resize;
          border-radius: 50%;
          z-index: 11;
          box-shadow: 0 0 3px rgba(0,0,0,0.5);
        }
        
        .crop-handle.tl { top: -5px; left: -5px; cursor: nwse-resize; }
        .crop-handle.tr { top: -5px; right: -5px; cursor: nesw-resize; }
        .crop-handle.bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
        .crop-handle.br { bottom: -5px; right: -5px; cursor: nwse-resize; }
        .crop-handle.tc { top: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
        .crop-handle.bc { bottom: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
        .crop-handle.ml { top: 50%; left: -5px; margin-top: -5px; cursor: ew-resize; }
        .crop-handle.mr { top: 50%; right: -5px; margin-top: -5px; cursor: ew-resize; }
        
        .center-box {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          cursor: move;
          pointer-events: auto;
          border: 1px dashed rgba(255,255,255,0.5);
        }
        
        .crop-instruction {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
        }
        
        .controls-panel {
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          background-color: #fff;
          border-top: 1px solid #eee;
        }
        
        .control-group {
          display: flex;
          flex-direction: column;
          min-width: 120px;
        }
        
        .control-group h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #333;
        }
        
        .control-group .buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        
        .ratio-buttons {
          max-width: 300px;
        }
        
        .custom-ratio {
          display: flex;
          margin-top: 8px;
          gap: 8px;
          align-items: center;
        }
        
        .custom-ratio-inputs {
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 2px 8px;
          background: #f5f5f5;
        }
        
        .custom-dimension {
          width: 50px;
          border: none;
          background: transparent;
          padding: 4px;
          text-align: center;
          -moz-appearance: textfield;
        }
        
        .custom-dimension::-webkit-inner-spin-button, 
        .custom-dimension::-webkit-outer-spin-button { 
          -webkit-appearance: none;
          margin: 0;
        }
        
        .dimension-separator {
          margin: 0 4px;
          color: #666;
        }
        
        .control-btn {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 13px;
          color: #333;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background-color: #e5e5e5;
        }
        
        .control-btn.active {
          background-color: #0078d4;
          border-color: #0078d4;
          color: white;
        }
        
        .slider-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .slider-container input {
          flex: 1;
        }
        
        .slider-value {
          font-size: 12px;
          min-width: 30px;
          text-align: right;
          color: #666;
        }
        
        .actions-panel {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: #f5f5f5;
          border-top: 1px solid #eee;
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .btn-cancel {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          color: #333;
        }
        
        .btn-cancel:hover {
          background-color: #e5e5e5;
        }
        
        .btn-apply {
          background-color: #0078d4;
          color: white;
        }
        
        .btn-apply:hover {
          background-color: #006cbe;
        }
        
        .hidden {
          display: none !important;
        }
        
        @media (max-width: 768px) {
          .controls-panel {
            flex-direction: column;
            gap: 12px;
          }
          
          .control-group {
            width: 100%;
          }
        }
      </style>
      
      <div class="cropper-container">
                  <div class="upload-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3>Upload an image</h3>
          <p>Drag & drop or click to select</p>
          <p class="supported-formats">Supported formats: JPG, PNG, GIF, WEBP, BMP</p>
          <button class="upload-btn">Select Image</button>
          <input type="file" accept="image/*" style="display: none;" id="fileInput">
        </div>
        
        <div class="cropper-workspace">
          <div class="canvas-container">
            <canvas id="cropCanvas"></canvas>
            <div class="crop-overlay">
              <div class="crop-box">
                <div class="crop-handle tl"></div>
                <div class="crop-handle tr"></div>
                <div class="crop-handle bl"></div>
                <div class="crop-handle br"></div>
                <div class="crop-handle tc"></div>
                <div class="crop-handle bc"></div>
                <div class="crop-handle ml"></div>
                <div class="crop-handle mr"></div>
                <div class="center-box"></div>
                <div class="crop-instruction">Drag to move, handles to resize</div>
              </div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group">
              <h4>Aspect Ratio</h4>
              <div class="buttons ratio-buttons">
                <button class="control-btn active" data-aspect="free">Free</button>
                <button class="control-btn" data-aspect="1:1">1:1</button>
                <button class="control-btn" data-aspect="4:3">4:3</button>
                <button class="control-btn" data-aspect="16:9">16:9</button>
                <button class="control-btn" data-aspect="3:2">3:2</button>
                <button class="control-btn" data-aspect="2:3">2:3</button>
                <button class="control-btn" data-aspect="5:4">5:4</button>
                <button class="control-btn" data-aspect="9:16">9:16</button>
              </div>
              <div class="custom-ratio">
                <div class="custom-ratio-inputs">
                  <input type="number" id="customWidth" min="1" placeholder="W" class="custom-dimension">
                  <span class="dimension-separator">×</span>
                  <input type="number" id="customHeight" min="1" placeholder="H" class="custom-dimension">
                </div>
                <button class="control-btn" id="applyCustomRatio">Apply</button>
              </div>
            </div>
            
            <div class="control-group">
              <h4>Rotate & Flip</h4>
              <div class="buttons">
                <button class="control-btn" id="rotateLeft">↺</button>
                <button class="control-btn" id="rotateRight">↻</button>
                <button class="control-btn" id="flipH">↔</button>
                <button class="control-btn" id="flipV">↕</button>
              </div>
            </div>
            
            <div class="control-group">
              <h4>Zoom</h4>
              <div class="slider-container">
                <input type="range" min="50" max="300" value="100" id="zoomSlider">
                <span class="slider-value" id="zoomValue">100%</span>
              </div>
            </div>
            
            <div class="control-group">
              <h4>Brightness</h4>
              <div class="slider-container">
                <input type="range" min="0" max="200" value="100" id="brightnessSlider">
                <span class="slider-value" id="brightnessValue">100%</span>
              </div>
            </div>
            
            <div class="control-group">
              <h4>Contrast</h4>
              <div class="slider-container">
                <input type="range" min="0" max="200" value="100" id="contrastSlider">
                <span class="slider-value" id="contrastValue">100%</span>
              </div>
            </div>
            
            <div class="control-group">
              <h4>Saturation</h4>
              <div class="slider-container">
                <input type="range" min="0" max="200" value="100" id="saturationSlider">
                <span class="slider-value" id="saturationValue">100%</span>
              </div>
            </div>
          </div>
          
          <div class="actions-panel">
            <button class="btn btn-cancel" id="cancelBtn">Cancel</button>
            <div>
              <button class="btn btn-apply" id="applyBtn">Apply & Download</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const uploadArea = this.shadowRoot.querySelector('.upload-area');
    const fileInput = this.shadowRoot.querySelector('#fileInput');
    const uploadBtn = this.shadowRoot.querySelector('.upload-btn');
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const cropBox = this.shadowRoot.querySelector('.crop-box');
    const centerBox = this.shadowRoot.querySelector('.center-box');
    const cropHandles = this.shadowRoot.querySelectorAll('.crop-handle');
    const aspectButtons = this.shadowRoot.querySelectorAll('[data-aspect]');
    const rotateLeft = this.shadowRoot.querySelector('#rotateLeft');
    const rotateRight = this.shadowRoot.querySelector('#rotateRight');
    const flipH = this.shadowRoot.querySelector('#flipH');
    const flipV = this.shadowRoot.querySelector('#flipV');
    const zoomSlider = this.shadowRoot.querySelector('#zoomSlider');
    const brightnessSlider = this.shadowRoot.querySelector('#brightnessSlider');
    const contrastSlider = this.shadowRoot.querySelector('#contrastSlider');
    const saturationSlider = this.shadowRoot.querySelector('#saturationSlider');
    const cancelBtn = this.shadowRoot.querySelector('#cancelBtn');
    const applyBtn = this.shadowRoot.querySelector('#applyBtn');
    const customWidth = this.shadowRoot.querySelector('#customWidth');
    const customHeight = this.shadowRoot.querySelector('#customHeight');
    const applyCustomRatio = this.shadowRoot.querySelector('#applyCustomRatio');
    
    // Upload area events
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });
    
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleFileSelect(fileInput.files[0]);
      }
    });
    
    // Crop box drag events
    centerBox.addEventListener('mousedown', (e) => {
      this.startDrag(e);
    });
    
    // Touch events for mobile
    centerBox.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        e.clientX = touch.clientX;
        e.clientY = touch.clientY;
        this.startDrag(e);
      }
    });
    
    // Resize handle events
    cropHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        this.startResize(e, handle);
      });
      
      handle.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          e.clientX = touch.clientX;
          e.clientY = touch.clientY;
          this.startResize(e, handle);
        }
      });
    });
    
    // Global mouse/touch events for drag and resize
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    // Control panel events
    aspectButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const aspect = btn.getAttribute('data-aspect');
        this.setAspectRatio(aspect);
        
        // Clear custom inputs when selecting a preset
        customWidth.value = '';
        customHeight.value = '';
      });
    });
    
    // Custom aspect ratio
    applyCustomRatio.addEventListener('click', () => {
      const width = parseInt(customWidth.value);
      const height = parseInt(customHeight.value);
      
      if (width > 0 && height > 0) {
        aspectButtons.forEach(b => b.classList.remove('active'));
        this.currentAspectRatio = `${width}:${height}`;
        this.setAspectRatio(this.currentAspectRatio);
      } else {
        // Display error for invalid dimensions
        this.dispatchEvent(new CustomEvent('error', {
          detail: { message: 'Please enter valid width and height values.' }
        }));
      }
    });
    
    rotateLeft.addEventListener('click', () => {
      this.rotation = (this.rotation - 90) % 360;
      if (this.rotation < 0) this.rotation += 360;
      this.renderImage();
    });
    
    rotateRight.addEventListener('click', () => {
      this.rotation = (this.rotation + 90) % 360;
      this.renderImage();
    });
    
    flipH.addEventListener('click', () => {
      this.flipHorizontal = !this.flipHorizontal;
      this.renderImage();
    });
    
    flipV.addEventListener('click', () => {
      this.flipVertical = !this.flipVertical;
      this.renderImage();
    });
    
    zoomSlider.addEventListener('input', () => {
      this.scale = parseInt(zoomSlider.value) / 100;
      this.shadowRoot.querySelector('#zoomValue').textContent = `${zoomSlider.value}%`;
      this.renderImage();
    });
    
    brightnessSlider.addEventListener('input', () => {
      this.brightness = parseInt(brightnessSlider.value);
      this.shadowRoot.querySelector('#brightnessValue').textContent = `${brightnessSlider.value}%`;
      this.renderImage();
    });
    
    contrastSlider.addEventListener('input', () => {
      this.contrast = parseInt(contrastSlider.value);
      this.shadowRoot.querySelector('#contrastValue').textContent = `${contrastSlider.value}%`;
      this.renderImage();
    });
    
    saturationSlider.addEventListener('input', () => {
      this.saturation = parseInt(saturationSlider.value);
      this.shadowRoot.querySelector('#saturationValue').textContent = `${saturationSlider.value}%`;
      this.renderImage();
    });
    
    // Action buttons
    cancelBtn.addEventListener('click', () => {
      this.resetCropper();
      this.dispatchEvent(new CustomEvent('cropCancelled'));
    });
    
    applyBtn.addEventListener('click', () => {
      const croppedImage = this.getCroppedImage();
      this.downloadImage(croppedImage);
      
      this.dispatchEvent(new CustomEvent('imageCropped', {
        detail: { imageData: croppedImage }
      }));
    });
    
    // Additional keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only respond to keyboard shortcuts if we're in cropping mode
      if (!this.image) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          // Move crop box left
          if (e.shiftKey) {
            this.cropBox.x -= 10;
          } else {
            this.cropBox.x -= 1;
          }
          this.constrainCropBox();
          this.updateCropBox();
          break;
        case 'ArrowRight':
          // Move crop box right
          if (e.shiftKey) {
            this.cropBox.x += 10;
          } else {
            this.cropBox.x += 1;
          }
          this.constrainCropBox();
          this.updateCropBox();
          break;
        case 'ArrowUp':
          // Move crop box up
          if (e.shiftKey) {
            this.cropBox.y -= 10;
          } else {
            this.cropBox.y -= 1;
          }
          this.constrainCropBox();
          this.updateCropBox();
          break;
        case 'ArrowDown':
          // Move crop box down
          if (e.shiftKey) {
            this.cropBox.y += 10;
          } else {
            this.cropBox.y += 1;
          }
          this.constrainCropBox();
          this.updateCropBox();
          break;
        case 'r':
          // Rotate right
          this.rotation = (this.rotation + 90) % 360;
          this.renderImage();
          break;
        case 'l':
          // Rotate left
          this.rotation = (this.rotation - 90) % 360;
          if (this.rotation < 0) this.rotation += 360;
          this.renderImage();
          break;
        case '+':
        case '=':
          // Zoom in
          const newZoomIn = Math.min(300, parseInt(zoomSlider.value) + 10);
          zoomSlider.value = newZoomIn;
          this.scale = newZoomIn / 100;
          this.shadowRoot.querySelector('#zoomValue').textContent = `${newZoomIn}%`;
          this.renderImage();
          break;
        case '-':
          // Zoom out
          const newZoomOut = Math.max(50, parseInt(zoomSlider.value) - 10);
          zoomSlider.value = newZoomOut;
          this.scale = newZoomOut / 100;
          this.shadowRoot.querySelector('#zoomValue').textContent = `${newZoomOut}%`;
          this.renderImage();
          break;
        case 'Enter':
          // Apply crop
          if (e.ctrlKey || e.metaKey) {
            const croppedImage = this.getCroppedImage();
            this.downloadImage(croppedImage);
            
            this.dispatchEvent(new CustomEvent('imageCropped', {
              detail: { imageData: croppedImage }
            }));
          }
          break;
        case 'Escape':
          // Cancel crop
          this.resetCropper();
          this.dispatchEvent(new CustomEvent('cropCancelled'));
          break;
      }
    });
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('touchmove', this.onTouchMove.bind(this));
    document.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }

  handleFileSelect(file) {
    // Validate file type
    const validTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'image/bmp',
      'image/svg+xml', 
      'image/tiff'
    ];
    
    if (!validTypes.includes(file.type)) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: 'Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF).' }
      }));
      return;
    }
    
    // Store the original file type
    this.originalFileType = file.type;
    
    // Validate file size
    const maxSize = this.getAttribute('maxFileSize') || 5; // in MB
    if (file.size > maxSize * 1024 * 1024) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: `File size exceeds the limit of ${maxSize}MB.` }
      }));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        this.image = img;
        this.setupCropper();
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  }

  setupCropper() {
    const container = this.shadowRoot.querySelector('.cropper-container');
    container.classList.add('workspace-active');
    
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    const maxWidth = this.getAttribute('maxWidth') || 800;
    const maxHeight = this.getAttribute('maxHeight') || 600;
    
    let width = this.image.width;
    let height = this.image.height;
    
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }
    
    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = width * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Initialize crop box to cover 80% of the image
    this.cropBox = {
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8
    };
    
    // Apply initial aspect ratio if specified
    const defaultAspectRatio = this.getAttribute('defaultAspectRatio') || 'free';
    if (defaultAspectRatio !== 'free') {
      this.setAspectRatio(defaultAspectRatio);
      
      // Update aspect ratio button UI
      const aspectButtons = this.shadowRoot.querySelectorAll('[data-aspect]');
      aspectButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-aspect') === defaultAspectRatio);
      });
    }
    
    // Flag for first render animation
    this.isFirstRender = true;
    
    // Add pulse animation to crop handles to draw attention to them
    const cropHandles = this.shadowRoot.querySelectorAll('.crop-handle');
    cropHandles.forEach(handle => {
      handle.style.animation = 'pulse 2s infinite';
    });
    
    // Add stylesheet for animations if it doesn't exist
    if (!this.shadowRoot.querySelector('#cropper-animations')) {
      const style = document.createElement('style');
      style.id = 'cropper-animations';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .crop-box {
          transition: all 0.1s ease-out;
        }
        
        .crop-handle {
          transition: all 0.1s ease-out;
        }
        
        .crop-handle:hover {
          transform: scale(1.2);
          background-color: #0078d4;
        }
      `;
      this.shadowRoot.appendChild(style);
    }
    
    // Show instruction tooltip for a few seconds
    const cropInstruction = this.shadowRoot.querySelector('.crop-instruction');
    cropInstruction.style.opacity = '1';
    setTimeout(() => {
      cropInstruction.style.opacity = '0.6';
    }, 5000);
    
    // Render the image and crop box
    this.renderImage();
  }

  renderImage() {
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate the maximum size that can fit the rotated image
    const maxDimension = Math.max(this.image.width, this.image.height);
    const diagonalLength = Math.ceil(Math.sqrt(maxDimension * maxDimension * 2));
    
    // Resize canvas if needed for rotation
    const needsRotationResizing = this.rotation % 90 !== 0 || this.rotation % 180 === 90;
    
    if (needsRotationResizing) {
      canvas.width = diagonalLength;
      canvas.height = diagonalLength;
    } else {
      // Set canvas dimensions
      const maxWidth = this.getAttribute('maxWidth') || 800;
      const maxHeight = this.getAttribute('maxHeight') || 600;
      
      let width = this.image.width;
      let height = this.image.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      
      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save the context state
    ctx.save();
    
    // Translate to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply rotation
    ctx.rotate((this.rotation * Math.PI) / 180);
    
    // Apply flip
    ctx.scale(
      this.flipHorizontal ? -1 : 1,
      this.flipVertical ? -1 : 1
    );
    
    // Apply zoom
    ctx.scale(this.scale, this.scale);
    
    // Draw the image centered
    const drawWidth = this.image.width;
    const drawHeight = this.image.height;
    
    ctx.drawImage(
      this.image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    // Apply filters using composite operations and filters
    if (this.brightness !== 100 || this.contrast !== 100 || this.saturation !== 100) {
      // Create temporary canvas for filters
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Copy the current canvas content
      tempCtx.drawImage(canvas, 0, 0);
      
      // Apply CSS filters
      ctx.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%) saturate(${this.saturation}%)`;
      ctx.drawImage(tempCanvas, -canvas.width/2, -canvas.height/2);
    }
    
    // Restore the context state
    ctx.restore();
    
    // Draw a subtle grid on the entire canvas for better size reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Adjust the crop box if the canvas size has changed
    if (needsRotationResizing && !this.isFirstRender) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxDimAvailable = Math.min(canvas.width, canvas.height) * 0.7;
      
      // Maintain aspect ratio if set
      if (this.currentAspectRatio) {
        const [width, height] = this.currentAspectRatio.split(':').map(Number);
        const aspectRatio = width / height;
        
        if (aspectRatio > 1) {
          this.cropBox.width = maxDimAvailable;
          this.cropBox.height = maxDimAvailable / aspectRatio;
        } else {
          this.cropBox.height = maxDimAvailable;
          this.cropBox.width = maxDimAvailable * aspectRatio;
        }
      } else {
        // If no aspect ratio, make it square by default
        this.cropBox.width = maxDimAvailable;
        this.cropBox.height = maxDimAvailable;
      }
      
      // Center the crop box
      this.cropBox.x = centerX - this.cropBox.width / 2;
      this.cropBox.y = centerY - this.cropBox.height / 2;
    }
    
    // Force recalculation of canvas position
    setTimeout(() => {
      // Update crop box position on canvas
      this.updateCropBox();
      
      // Highlight the crop area with an animation effect on initial render
      if (this.isFirstRender) {
        const cropBox = this.shadowRoot.querySelector('.crop-box');
        cropBox.style.transition = 'all 0.3s ease';
        cropBox.style.boxShadow = '0 0 0 9999em rgba(0, 0, 0, 0.3)';
        
        setTimeout(() => {
          cropBox.style.boxShadow = '0 0 0 9999em rgba(0, 0, 0, 0.7)';
          
          setTimeout(() => {
            cropBox.style.transition = 'none';
            this.isFirstRender = false;
          }, 300);
        }, 100);
      }
    }, 0);
  }

  updateCropBox() {
    const cropBoxEl = this.shadowRoot.querySelector('.crop-box');
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    
    if (cropBoxEl) {
      // Get the actual position and dimensions of the canvas element
      const canvasBounds = canvas.getBoundingClientRect();
      const containerBounds = this.shadowRoot.querySelector('.canvas-container').getBoundingClientRect();
      
      // Calculate the offset from the container edges to the canvas
      const offsetLeft = (containerBounds.width - canvasBounds.width) / 2;
      const offsetTop = (containerBounds.height - canvasBounds.height) / 2;
      
      // Position the crop box relative to the canvas position
      cropBoxEl.style.position = 'absolute';
      cropBoxEl.style.left = `${offsetLeft + this.cropBox.x}px`;
      cropBoxEl.style.top = `${offsetTop + this.cropBox.y}px`;
      cropBoxEl.style.width = `${this.cropBox.width}px`;
      cropBoxEl.style.height = `${this.cropBox.height}px`;
    }
  }

  setAspectRatio(aspect) {
    // Store the current aspect ratio
    this.currentAspectRatio = aspect === 'free' ? null : aspect;
    
    if (aspect !== 'free') {
      const [width, height] = aspect.split(':').map(Number);
      const aspectRatio = width / height;
      
      // Keep the current center point
      const centerX = this.cropBox.x + this.cropBox.width / 2;
      const centerY = this.cropBox.y + this.cropBox.height / 2;
      
      // Determine new dimensions while maintaining the aspect ratio
      let newWidth = this.cropBox.width;
      let newHeight = newWidth / aspectRatio;
      
      // If the new height exceeds the image, adjust width to fit
      const canvas = this.shadowRoot.querySelector('#cropCanvas');
      if (newHeight > canvas.height * 0.9) {
        newHeight = canvas.height * 0.9;
        newWidth = newHeight * aspectRatio;
      }
      
      // Update crop box dimensions
      this.cropBox.width = newWidth;
      this.cropBox.height = newHeight;
      
      // Recenter the crop box
      this.cropBox.x = centerX - newWidth / 2;
      this.cropBox.y = centerY - newHeight / 2;
      
      // Make sure the crop box stays within the canvas
      this.constrainCropBox();
      
      // Update the UI
      this.updateCropBox();
    }
  }

  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    
    // Get the current position of the canvas element
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const canvasBounds = canvas.getBoundingClientRect();
    const containerBounds = this.shadowRoot.querySelector('.canvas-container').getBoundingClientRect();
    
    // Calculate the offset from the container edges to the canvas
    const offsetLeft = (containerBounds.width - canvasBounds.width) / 2;
    const offsetTop = (containerBounds.height - canvasBounds.height) / 2;
    
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropX: this.cropBox.x,
      cropY: this.cropBox.y,
      offsetLeft: offsetLeft,
      offsetTop: offsetTop
    };
  }

  startResize(e, handle) {
    e.preventDefault();
    this.isResizing = true;
    this.resizeHandle = handle.className.split(' ')[1]; // Get handle position (tl, tr, etc.)
    
    // Get the current position of the canvas element
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const canvasBounds = canvas.getBoundingClientRect();
    const containerBounds = this.shadowRoot.querySelector('.canvas-container').getBoundingClientRect();
    
    // Calculate the offset from the container edges to the canvas
    const offsetLeft = (containerBounds.width - canvasBounds.width) / 2;
    const offsetTop = (containerBounds.height - canvasBounds.height) / 2;
    
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropBox: { ...this.cropBox },
      offsetLeft: offsetLeft,
      offsetTop: offsetTop
    };
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.drag(e);
    } else if (this.isResizing) {
      this.resize(e);
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1 && (this.isDragging || this.isResizing)) {
      e.preventDefault(); // Prevent scrolling when dragging/resizing
      
      const touch = e.touches[0];
      const moveEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
      };
      
      if (this.isDragging) {
        this.drag(moveEvent);
      } else if (this.isResizing) {
        this.resize(moveEvent);
      }
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
  }

  onTouchEnd() {
    this.isDragging = false;
    this.isResizing = false;
  }

  drag(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;
    
    this.cropBox.x = this.dragStart.cropX + deltaX;
    this.cropBox.y = this.dragStart.cropY + deltaY;
    
    // Constrain to canvas bounds
    this.constrainCropBox();
    
    // Update the UI
    this.updateCropBox();
  }

  resize(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;
    const startBox = this.dragStart.cropBox;
    
    let newBox = { ...this.cropBox };
    
    // Handle resizing based on which handle was grabbed
    switch (this.resizeHandle) {
      case 'tl': // Top Left
        newBox.x = startBox.x + deltaX;
        newBox.y = startBox.y + deltaY;
        newBox.width = startBox.width - deltaX;
        newBox.height = startBox.height - deltaY;
        break;
      case 'tr': // Top Right
        newBox.y = startBox.y + deltaY;
        newBox.width = startBox.width + deltaX;
        newBox.height = startBox.height - deltaY;
        break;
      case 'bl': // Bottom Left
        newBox.x = startBox.x + deltaX;
        newBox.width = startBox.width - deltaX;
        newBox.height = startBox.height + deltaY;
        break;
      case 'br': // Bottom Right
        newBox.width = startBox.width + deltaX;
        newBox.height = startBox.height + deltaY;
        break;
      case 'tc': // Top Center
        newBox.y = startBox.y + deltaY;
        newBox.height = startBox.height - deltaY;
        break;
      case 'bc': // Bottom Center
        newBox.height = startBox.height + deltaY;
        break;
      case 'ml': // Middle Left
        newBox.x = startBox.x + deltaX;
        newBox.width = startBox.width - deltaX;
        break;
      case 'mr': // Middle Right
        newBox.width = startBox.width + deltaX;
        break;
    }
    
    // Ensure minimum dimensions
    if (newBox.width < 20) newBox.width = 20;
    if (newBox.height < 20) newBox.height = 20;
    
    // Apply aspect ratio constraint if needed
    if (this.currentAspectRatio) {
      const [width, height] = this.currentAspectRatio.split(':').map(Number);
      const aspectRatio = width / height;
      
      // Determine which dimension to adjust based on the handle
      if (['tl', 'tr', 'bl', 'br'].includes(this.resizeHandle)) {
        // For corner handles, preserve the drag direction
        if (['tl', 'tr'].includes(this.resizeHandle)) {
          // Top handles - adjust width based on height
          newBox.width = newBox.height * aspectRatio;
        } else {
          // Bottom handles - adjust height based on width
          newBox.height = newBox.width / aspectRatio;
        }
      } else if (['tc', 'bc'].includes(this.resizeHandle)) {
        // For vertical handles, adjust width based on height
        newBox.width = newBox.height * aspectRatio;
      } else {
        // For horizontal handles, adjust height based on width
        newBox.height = newBox.width / aspectRatio;
      }
    }
    
    this.cropBox = newBox;
    
    // Constrain to canvas bounds
    this.constrainCropBox();
    
    // Update the UI
    this.updateCropBox();
  }

  constrainCropBox() {
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    
    // Ensure crop box doesn't go outside canvas
    if (this.cropBox.x < 0) this.cropBox.x = 0;
    if (this.cropBox.y < 0) this.cropBox.y = 0;
    
    // Ensure crop box doesn't exceed canvas size
    if (this.cropBox.x + this.cropBox.width > canvas.width) {
      this.cropBox.x = canvas.width - this.cropBox.width;
    }
    
    if (this.cropBox.y + this.cropBox.height > canvas.height) {
      this.cropBox.y = canvas.height - this.cropBox.height;
    }
  }

  getCroppedImage() {
    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    
    // Set dimensions of the output canvas
    croppedCanvas.width = this.cropBox.width;
    croppedCanvas.height = this.cropBox.height;
    
    // Get the source canvas
    const sourceCanvas = this.shadowRoot.querySelector('#cropCanvas');
    
    // Draw the cropped portion
    ctx.drawImage(
      sourceCanvas,
      this.cropBox.x, this.cropBox.y, this.cropBox.width, this.cropBox.height,
      0, 0, this.cropBox.width, this.cropBox.height
    );
    
    // Show visual feedback - flash the crop area
    const cropBox = this.shadowRoot.querySelector('.crop-box');
    const originalBorder = cropBox.style.border;
    cropBox.style.border = '3px solid #4CAF50';
    
    // Get the current position of the crop box for correct positioning of the flash overlay
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const canvasBounds = canvas.getBoundingClientRect();
    const containerBounds = this.shadowRoot.querySelector('.canvas-container').getBoundingClientRect();
    const offsetLeft = (containerBounds.width - canvasBounds.width) / 2;
    const offsetTop = (containerBounds.height - canvasBounds.height) / 2;
    
    // Create temporary flash effect overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'absolute';
    flashOverlay.style.top = `${offsetTop + this.cropBox.y}px`;
    flashOverlay.style.left = `${offsetLeft + this.cropBox.x}px`;
    flashOverlay.style.width = `${this.cropBox.width}px`;
    flashOverlay.style.height = `${this.cropBox.height}px`;
    flashOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    flashOverlay.style.transition = 'opacity 0.5s ease';
    flashOverlay.style.zIndex = '20';
    this.shadowRoot.querySelector('.canvas-container').appendChild(flashOverlay);
    
    // Animate the flash effect
    setTimeout(() => {
      flashOverlay.style.opacity = '0';
      setTimeout(() => {
        flashOverlay.remove();
        cropBox.style.border = originalBorder;
      }, 500);
    }, 100);
    
    // Display a small preview of the cropped image for user feedback
    const previewContainer = document.createElement('div');
    previewContainer.style.position = 'absolute';
    previewContainer.style.top = '20px';
    previewContainer.style.right = '20px';
    previewContainer.style.padding = '10px';
    previewContainer.style.backgroundColor = 'white';
    previewContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    previewContainer.style.borderRadius = '4px';
    previewContainer.style.zIndex = '100';
    previewContainer.style.transition = 'opacity 0.5s ease';
    
    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Cropped Preview';
    previewLabel.style.fontSize = '12px';
    previewLabel.style.marginBottom = '5px';
    previewLabel.style.color = '#333';
    
    const previewImg = document.createElement('img');
    previewImg.style.maxWidth = '150px';
    previewImg.style.maxHeight = '100px';
    previewImg.style.display = 'block';
    
    previewContainer.appendChild(previewLabel);
    previewContainer.appendChild(previewImg);
    
    // Get image data URL
    const quality = parseFloat(this.getAttribute('quality') || 0.92);
    
    // Choose the right MIME type based on original image format
    let mimeType = 'image/jpeg';
    if (this.originalFileType) {
      // Use the same format if possible, fall back to JPEG
      if (this.originalFileType === 'image/png' || 
          this.originalFileType === 'image/webp' || 
          this.originalFileType === 'image/gif') {
        mimeType = this.originalFileType;
      }
    }
    
    const dataURL = croppedCanvas.toDataURL(mimeType, quality);
    
    // Show preview briefly
    previewImg.src = dataURL;
    this.shadowRoot.querySelector('.cropper-workspace').appendChild(previewContainer);
    
    setTimeout(() => {
      previewContainer.style.opacity = '0';
      setTimeout(() => {
        previewContainer.remove();
      }, 500);
    }, 2000);
    
    return dataURL;
  }

  downloadImage(dataURL) {
    const link = document.createElement('a');
    link.href = dataURL;
    
    // Determine file format based on the original image
    let fileExtension = 'jpg';
    
    // If original image type is known, try to preserve it
    if (this.originalFileType) {
      switch (this.originalFileType) {
        case 'image/png':
          fileExtension = 'png';
          break;
        case 'image/webp':
          fileExtension = 'webp';
          break;
        case 'image/gif':
          fileExtension = 'gif';
          break;
        case 'image/bmp':
          fileExtension = 'bmp';
          break;
        case 'image/svg+xml':
          fileExtension = 'svg';
          break;
        case 'image/tiff':
          fileExtension = 'tiff';
          break;
        default:
          fileExtension = 'jpg';
      }
    }
    
    link.download = `cropped-image-${Date.now()}.${fileExtension}`;
    link.click();
  }

  resetCropper() {
    // Reset state
    this.image = null;
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
    this.scale = 1;
    this.rotation = 0;
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.brightness = 100;
    this.contrast = 100;
    this.saturation = 100;
    this.currentAspectRatio = null;
    
    // Reset UI
    const container = this.shadowRoot.querySelector('.cropper-container');
    container.classList.remove('workspace-active');
    
    // Reset file input
    const fileInput = this.shadowRoot.querySelector('#fileInput');
    fileInput.value = '';
    
    // Reset sliders
    this.shadowRoot.querySelector('#zoomSlider').value = 100;
    this.shadowRoot.querySelector('#zoomValue').textContent = '100%';
    this.shadowRoot.querySelector('#brightnessSlider').value = 100;
    this.shadowRoot.querySelector('#brightnessValue').textContent = '100%';
    this.shadowRoot.querySelector('#contrastSlider').value = 100;
    this.shadowRoot.querySelector('#contrastValue').textContent = '100%';
    this.shadowRoot.querySelector('#saturationSlider').value = 100;
    this.shadowRoot.querySelector('#saturationValue').textContent = '100%';
    
    // Reset aspect ratio buttons
    const aspectButtons = this.shadowRoot.querySelectorAll('[data-aspect]');
    aspectButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-aspect') === 'free');
    });
  }
}

// Register the custom element
customElements.define('wix-image-cropper', WixImageCropper);
