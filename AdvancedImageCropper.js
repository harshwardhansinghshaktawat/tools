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
        }
        
        #cropCanvas {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
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
        }
        
        .crop-box {
          position: absolute;
          border: 2px solid #fff;
          box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }
        
        .crop-handle {
          width: 10px;
          height: 10px;
          background-color: #fff;
          border: 1px solid #0078d4;
          position: absolute;
          pointer-events: auto;
          cursor: nwse-resize;
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
              </div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group">
              <h4>Aspect Ratio</h4>
              <div class="buttons">
                <button class="control-btn active" data-aspect="free">Free</button>
                <button class="control-btn" data-aspect="1:1">1:1</button>
                <button class="control-btn" data-aspect="4:3">4:3</button>
                <button class="control-btn" data-aspect="16:9">16:9</button>
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
                <input type="range" min="100" max="300" value="100" id="zoomSlider">
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
      });
    });
    
    rotateLeft.addEventListener('click', () => {
      this.rotation = (this.rotation - 90) % 360;
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
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('touchmove', this.onTouchMove.bind(this));
    document.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }

  handleFileSelect(file) {
    // Validate file type
    if (!file.type.match('image.*')) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: 'Please select a valid image file.' }
      }));
      return;
    }
    
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
    
    // Render the image and crop box
    this.renderImage();
  }

  renderImage() {
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    const ctx = canvas.getContext('2d');
    
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
    
    // Update crop box position on canvas
    this.updateCropBox();
  }

  updateCropBox() {
    const cropBoxEl = this.shadowRoot.querySelector('.crop-box');
    
    if (cropBoxEl) {
      cropBoxEl.style.left = `${this.cropBox.x}px`;
      cropBoxEl.style.top = `${this.cropBox.y}px`;
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
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropX: this.cropBox.x,
      cropY: this.cropBox.y
    };
  }

  startResize(e, handle) {
    e.preventDefault();
    this.isResizing = true;
    this.resizeHandle = handle.className.split(' ')[1]; // Get handle position (tl, tr, etc.)
    
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropBox: { ...this.cropBox }
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
    
    // Get image data URL
    const quality = parseFloat(this.getAttribute('quality') || 0.92);
    return croppedCanvas.toDataURL('image/jpeg', quality);
  }

  downloadImage(dataURL) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `cropped-image-${Date.now()}.jpg`;
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
