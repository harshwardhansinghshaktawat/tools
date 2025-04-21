/**
 * Advanced Image Cropper - Wix Custom Element
 * Filename: wix-advanced-image-cropper.js
 * Custom Element Tag: <advanced-image-cropper>
 * 
 * A powerful image cropping tool built with Cropper.js
 * Properly formatted for Wix Custom Elements
 */
class AdvancedImageCropper extends HTMLElement {
  constructor() {
    super();
    this.cropper = null;
    this.cropResult = null;
    this.originalImage = null;
    this.cropperLoaded = false;

    // Initial configuration
    this.cropperOptions = {
      viewMode: 1,
      dragMode: 'crop',
      aspectRatio: NaN,
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
      responsive: true,
      wheelZoomRatio: 0.1,
      minContainerWidth: 300,
      minContainerHeight: 300
    };
  }

  connectedCallback() {
    // Add inline styles first to ensure Cropper.js UI is visible
    this.addCropperStyles();
    
    // Render HTML structure
    this.render();
    
    // Load Cropper.js and initialize event listeners
    this.loadCropperLibrary()
      .then(() => {
        this.initEventListeners();
      })
      .catch(error => {
        console.error('Failed to load Cropper.js:', error);
      });

    // Register with Wix Editor
    if (window.wixDevelopmentToolkit) {
      window.wixDevelopmentToolkit.registerSchemaForEditor(this.getSchema());
    }
  }

  disconnectedCallback() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  getSchema() {
    return {
      properties: {
        cropResult: {
          type: 'string',
          readOnly: true
        },
        aspectRatio: {
          type: 'string',
          editorOnly: true,
          options: [
            { value: 'NaN', label: 'Free' },
            { value: '1', label: '1:1 (Square)' },
            { value: '16/9', label: '16:9 (Landscape)' },
            { value: '9/16', label: '9:16 (Portrait)' },
            { value: '4/3', label: '4:3' },
            { value: '3/4', label: '3:4' },
            { value: '3/2', label: '3:2' },
            { value: '2/3', label: '2:3' }
          ]
        },
        guidelinesVisible: {
          type: 'boolean',
          editorOnly: true,
          defaultValue: true
        },
        defaultDragMode: {
          type: 'string',
          editorOnly: true,
          options: [
            { value: 'crop', label: 'Crop' },
            { value: 'move', label: 'Move' },
            { value: 'none', label: 'None' }
          ],
          defaultValue: 'crop'
        }
      }
    };
  }

  // Add Cropper.js styles directly to the document head
  addCropperStyles() {
    if (document.getElementById('advanced-cropper-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'advanced-cropper-styles';
    style.textContent = `
      /* Cropper.js styles */
      .cropper-container {
        direction: ltr;
        font-size: 0;
        line-height: 0;
        position: relative;
        touch-action: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        z-index: 10 !important;
      }

      .cropper-container img {
        display: block;
        height: 100%;
        image-orientation: 0deg;
        max-height: none !important;
        max-width: none !important;
        min-height: 0 !important;
        min-width: 0 !important;
        width: 100%;
      }

      .cropper-wrap-box,
      .cropper-canvas,
      .cropper-drag-box,
      .cropper-crop-box,
      .cropper-modal {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }

      .cropper-wrap-box,
      .cropper-canvas {
        overflow: hidden;
      }

      .cropper-drag-box {
        background-color: #fff;
        opacity: 0;
      }

      .cropper-modal {
        background-color: #000;
        opacity: 0.5;
      }

      .cropper-view-box {
        display: block;
        height: 100%;
        outline: 1px solid #39f;
        outline-color: rgba(51, 153, 255, 0.75);
        overflow: hidden;
        width: 100%;
      }

      .cropper-dashed {
        border: 0 dashed #eee;
        display: block;
        opacity: 0.5;
        position: absolute;
      }

      .cropper-dashed.dashed-h {
        border-bottom-width: 1px;
        border-top-width: 1px;
        height: calc(100% / 3);
        left: 0;
        top: calc(100% / 3);
        width: 100%;
      }

      .cropper-dashed.dashed-v {
        border-left-width: 1px;
        border-right-width: 1px;
        height: 100%;
        left: calc(100% / 3);
        top: 0;
        width: calc(100% / 3);
      }

      .cropper-center {
        display: block;
        height: 0;
        left: 50%;
        opacity: 0.75;
        position: absolute;
        top: 50%;
        width: 0;
      }

      .cropper-center::before,
      .cropper-center::after {
        background-color: #eee;
        content: ' ';
        display: block;
        position: absolute;
      }

      .cropper-center::before {
        height: 1px;
        left: -3px;
        top: 0;
        width: 7px;
      }

      .cropper-center::after {
        height: 7px;
        left: 0;
        top: -3px;
        width: 1px;
      }

      .cropper-face,
      .cropper-line,
      .cropper-point {
        display: block;
        height: 100%;
        opacity: 0.1;
        position: absolute;
        width: 100%;
      }

      .cropper-face {
        background-color: #fff;
        left: 0;
        top: 0;
      }

      .cropper-line {
        background-color: #39f;
      }

      .cropper-line.line-e {
        cursor: ew-resize;
        right: -3px;
        top: 0;
        width: 5px;
      }

      .cropper-line.line-n {
        cursor: ns-resize;
        height: 5px;
        left: 0;
        top: -3px;
      }

      .cropper-line.line-w {
        cursor: ew-resize;
        left: -3px;
        top: 0;
        width: 5px;
      }

      .cropper-line.line-s {
        bottom: -3px;
        cursor: ns-resize;
        height: 5px;
        left: 0;
      }

      .cropper-point {
        background-color: #39f;
        height: 5px;
        opacity: 0.75;
        width: 5px;
      }

      .cropper-point.point-e {
        cursor: ew-resize;
        margin-top: -3px;
        right: -3px;
        top: 50%;
      }

      .cropper-point.point-n {
        cursor: ns-resize;
        left: 50%;
        margin-left: -3px;
        top: -3px;
      }

      .cropper-point.point-w {
        cursor: ew-resize;
        left: -3px;
        margin-top: -3px;
        top: 50%;
      }

      .cropper-point.point-s {
        bottom: -3px;
        cursor: s-resize;
        left: 50%;
        margin-left: -3px;
      }

      .cropper-point.point-ne {
        cursor: nesw-resize;
        right: -3px;
        top: -3px;
      }

      .cropper-point.point-nw {
        cursor: nwse-resize;
        left: -3px;
        top: -3px;
      }

      .cropper-point.point-sw {
        bottom: -3px;
        cursor: nesw-resize;
        left: -3px;
      }

      .cropper-point.point-se {
        bottom: -3px;
        cursor: nwse-resize;
        height: 20px;
        opacity: 1;
        right: -3px;
        width: 20px;
      }

      @media (min-width: 768px) {
        .cropper-point.point-se {
          height: 15px;
          width: 15px;
        }
      }

      @media (min-width: 992px) {
        .cropper-point.point-se {
          height: 10px;
          width: 10px;
        }
      }

      @media (min-width: 1200px) {
        .cropper-point.point-se {
          height: 5px;
          opacity: 0.75;
          width: 5px;
        }
      }

      .cropper-point.point-se::before {
        background-color: #39f;
        bottom: -50%;
        content: ' ';
        display: block;
        height: 200%;
        opacity: 0;
        position: absolute;
        right: -50%;
        width: 200%;
      }

      .cropper-invisible {
        opacity: 0;
      }

      .cropper-bg {
        background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC');
      }

      .cropper-hide {
        display: block;
        height: 0;
        position: absolute;
        width: 0;
      }

      .cropper-hidden {
        display: none !important;
      }

      .cropper-move {
        cursor: move;
      }

      .cropper-crop {
        cursor: crosshair;
      }

      .cropper-disabled .cropper-drag-box,
      .cropper-disabled .cropper-face,
      .cropper-disabled .cropper-line,
      .cropper-disabled .cropper-point {
        cursor: not-allowed;
      }
      
      /* Component styles */
      advanced-image-cropper {
        display: block;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      
      .container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 100%;
        padding: 20px;
        border-radius: 12px;
        background-color: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .title {
        font-size: 20px;
        font-weight: 600;
        color: #333;
        margin: 0;
      }
      
      .upload-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .upload-btn {
        background-color: #3498db;
        color: white;
        padding: 10px 16px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.2s;
      }
      
      .upload-btn:hover {
        background-color: #2980b9;
      }
      
      .upload-icon {
        width: 18px;
        height: 18px;
      }
      
      .file-input {
        display: none;
      }
      
      .img-container {
        position: relative !important;
        max-width: 100%;
        height: 450px;
        background-color: #f8f9fa;
        border-radius: 8px;
        overflow: hidden;
        transition: height 0.3s;
      }
      
      .img-element {
        max-width: 100%;
        max-height: 100%;
      }
      
      .placeholder {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: #adb5bd;
        text-align: center;
        padding: 20px;
      }
      
      .placeholder-icon {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .controls-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 10px;
      }
      
      .control-group {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .control-label {
        width: 100%;
        margin-bottom: 5px;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
      }
      
      .btn {
        padding: 8px 12px;
        background-color: #f1f3f5;
        border: 1px solid #ced4da;
        border-radius: 6px;
        color: #495057;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-width: 40px;
      }
      
      .btn:hover {
        background-color: #e9ecef;
        border-color: #adb5bd;
      }
      
      .btn.primary {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .btn.primary:hover {
        background-color: #2980b9;
        border-color: #2980b9;
      }
      
      .btn.danger {
        background-color: #e74c3c;
        border-color: #e74c3c;
        color: white;
      }
      
      .btn.danger:hover {
        background-color: #c0392b;
        border-color: #c0392b;
      }
      
      .btn.active {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .btn-icon {
        width: 16px;
        height: 16px;
      }
      
      .slider-container {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      
      .slider-label {
        min-width: 80px;
        font-size: 14px;
        color: #495057;
      }
      
      .slider {
        flex-grow: 1;
        height: 5px;
        -webkit-appearance: none;
        background: #dee2e6;
        border-radius: 5px;
        outline: none;
      }
      
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
      }
      
      .slider-value {
        min-width: 40px;
        text-align: center;
        font-size: 14px;
        color: #495057;
      }
      
      .aspect-ratio-btn {
        padding: 6px 12px;
        border-radius: 6px;
        background-color: #f1f3f5;
        border: 1px solid #ced4da;
        color: #495057;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .aspect-ratio-btn:hover,
      .aspect-ratio-btn.active {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .crop-result {
        margin-top: 20px;
        text-align: center;
      }
      
      .result-img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      
      @media (max-width: 768px) {
        .control-group {
          flex-direction: column;
        }
        
        .img-container {
          height: 350px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  render() {
    this.innerHTML = `
      <div class="container">
        <div class="header">
          <h2 class="title">Advanced Image Cropper</h2>
          <div class="upload-container">
            <button class="upload-btn" id="uploadBtn">
              <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Image
            </button>
            <input type="file" accept="image/*" class="file-input" id="fileInput">
          </div>
        </div>
        
        <div class="img-container" id="imgContainer">
          <div class="placeholder" id="placeholder">
            <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p>Upload an image to start cropping</p>
          </div>
          <img id="image" class="img-element" style="display: none;">
        </div>
        
        <div class="controls-container" id="controlsContainer" style="display: none;">
          <div class="control-group">
            <div class="control-label">Aspect Ratio</div>
            <button class="aspect-ratio-btn" data-ratio="NaN">Free</button>
            <button class="aspect-ratio-btn" data-ratio="1">1:1</button>
            <button class="aspect-ratio-btn" data-ratio="16/9">16:9</button>
            <button class="aspect-ratio-btn" data-ratio="9/16">9:16</button>
            <button class="aspect-ratio-btn" data-ratio="4/3">4:3</button>
            <button class="aspect-ratio-btn" data-ratio="3/4">3:4</button>
            <button class="aspect-ratio-btn" data-ratio="3/2">3:2</button>
            <button class="aspect-ratio-btn" data-ratio="2/3">2:3</button>
          </div>
          
          <div class="control-group">
            <div class="control-label">Zoom</div>
            <div class="slider-container">
              <span class="slider-label">Zoom</span>
              <input type="range" min="0" max="1" step="0.01" value="0" class="slider" id="zoomSlider">
              <span class="slider-value" id="zoomValue">0%</span>
            </div>
            <button class="btn" id="zoomInBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
            <button class="btn" id="zoomOutBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
          </div>
          
          <div class="control-group">
            <div class="control-label">Rotation & Flip</div>
            <button class="btn" id="rotateLeftBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Rotate Left
            </button>
            <button class="btn" id="rotateRightBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Rotate Right
            </button>
            <button class="btn" id="flipHorizontalBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v18"></path>
                <path d="M17 8l-5-5-5 5"></path>
                <path d="M17 16l-5 5-5-5"></path>
              </svg>
              Flip H
            </button>
            <button class="btn" id="flipVerticalBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12h18"></path>
                <path d="M8 7l-5 5 5 5"></path>
                <path d="M16 7l5 5-5 5"></path>
              </svg>
              Flip V
            </button>
          </div>
          
          <div class="control-group">
            <div class="control-label">Drag Mode</div>
            <button class="btn" id="cropModeBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 15h12M6 9h12M4 5h16v14H4z"></path>
              </svg>
              Crop
            </button>
            <button class="btn" id="moveModeBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="5 9 2 12 5 15"></polyline>
                <polyline points="9 5 12 2 15 5"></polyline>
                <polyline points="15 19 12 22 9 19"></polyline>
                <polyline points="19 9 22 12 19 15"></polyline>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="2" x2="12" y2="22"></line>
              </svg>
              Move
            </button>
          </div>
          
          <div class="control-group">
            <div class="control-label">Actions</div>
            <button class="btn" id="resetBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Reset
            </button>
            <button class="btn" id="clearBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Clear
            </button>
            <button class="btn primary" id="cropBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
                <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
              </svg>
              Crop Image
            </button>
          </div>
        </div>
        
        <div class="crop-result" id="cropResult" style="display: none;">
          <h3>Cropped Result</h3>
          <img class="result-img" id="resultImg">
          <div style="margin-top: 15px;">
            <button class="btn primary" id="downloadBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;
  }

  loadCropperLibrary() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Cropper) {
        this.cropperLoaded = true;
        resolve(window.Cropper);
        return;
      }

      // Check if script is already in process of loading
      const existingScript = document.querySelector('script[src*="cropper.min.js"]');
      if (existingScript) {
        // If script tag exists but Cropper isn't available yet, wait for it
        const checkInterval = setInterval(() => {
          if (window.Cropper) {
            clearInterval(checkInterval);
            this.cropperLoaded = true;
            resolve(window.Cropper);
          }
        }, 100);
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('Cropper.js loaded successfully');
        setTimeout(() => {
          if (window.Cropper) {
            this.cropperLoaded = true;
            resolve(window.Cropper);
          } else {
            reject(new Error('Cropper not defined after script load'));
          }
        }, 200);
      };
      
      script.onerror = (err) => {
        console.error('Failed to load Cropper.js', err);
        reject(err);
      };
      
      document.head.appendChild(script);
    });
  }

  initEventListeners() {
    const uploadBtn = this.querySelector('#uploadBtn');
    const fileInput = this.querySelector('#fileInput');
    const image = this.querySelector('#image');
    const placeholder = this.querySelector('#placeholder');
    const controlsContainer = this.querySelector('#controlsContainer');
    const cropResult = this.querySelector('#cropResult');
    const resultImg = this.querySelector('#resultImg');
    const downloadBtn = this.querySelector('#downloadBtn');
    const imgContainer = this.querySelector('#imgContainer');

    if (!uploadBtn || !fileInput || !image || !imgContainer) {
      console.error('Required elements not found');
      return;
    }

    // Upload image
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
          this.originalImage = event.target.result;
          image.src = event.target.result;
          image.style.display = 'block';
          placeholder.style.display = 'none';
          controlsContainer.style.display = 'flex';
          cropResult.style.display = 'none';

          // Initialize cropper after image is loaded
          image.onload = () => {
            // Ensure the imgContainer has position relative
            imgContainer.style.position = 'relative';
            // Initialize cropper
            this.initCropper();
          };
        };

        reader.readAsDataURL(file);
      }
    });

    // Aspect ratio buttons
    const aspectRatioBtns = this.querySelectorAll('.aspect-ratio-btn');
    aspectRatioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectRatioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ratio = btn.dataset.ratio;
        this.cropperOptions.aspectRatio = ratio === 'NaN' ? NaN : eval(ratio);
        if (this.cropper) {
          this.cropper.setAspectRatio(this.cropperOptions.aspectRatio);
        }
      });
    });

    // Zoom controls
    const zoomSlider = this.querySelector('#zoomSlider');
    const zoomValue = this.querySelector('#zoomValue');
    const zoomInBtn = this.querySelector('#zoomInBtn');
    const zoomOutBtn = this.querySelector('#zoomOutBtn');

    zoomSlider.addEventListener('input', () => {
      const value = parseFloat(zoomSlider.value);
      zoomValue.textContent = `${Math.round(value * 100)}%`;
      if (this.cropper) {
        this.cropper.zoomTo(value);
      }
    });

    zoomInBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.zoom(0.1);
        this.updateZoomSlider();
      }
    });

    zoomOutBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.zoom(-0.1);
        this.updateZoomSlider();
      }
    });

    // Rotation and flip controls
    const rotateLeftBtn = this.querySelector('#rotateLeftBtn');
    const rotateRightBtn = this.querySelector('#rotateRightBtn');
    const flipHorizontalBtn = this.querySelector('#flipHorizontalBtn');
    const flipVerticalBtn = this.querySelector('#flipVerticalBtn');

    rotateLeftBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.rotate(-90);
      }
    });

    rotateRightBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.rotate(90);
      }
    });

    flipHorizontalBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.scaleX(this.cropper.getData().scaleX * -1);
      }
    });

    flipVerticalBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.scaleY(this.cropper.getData().scaleY * -1);
      }
    });

    // Drag mode controls
    const cropModeBtn = this.querySelector('#cropModeBtn');
    const moveModeBtn = this.querySelector('#moveModeBtn');

    cropModeBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.setDragMode('crop');
        cropModeBtn.classList.add('active');
        moveModeBtn.classList.remove('active');
      }
    });

    moveModeBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.setDragMode('move');
        moveModeBtn.classList.add('active');
        cropModeBtn.classList.remove('active');
      }
    });

    // Actions
    const resetBtn = this.querySelector('#resetBtn');
    const clearBtn = this.querySelector('#clearBtn');
    const cropBtn = this.querySelector('#cropBtn');

    resetBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.reset();
        this.updateZoomSlider();
      }
    });

    clearBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
      image.src = '';
      image.style.display = 'none';
      placeholder.style.display = 'flex';
      controlsContainer.style.display = 'none';
      cropResult.style.display = 'none';
      fileInput.value = '';
    });

    cropBtn.addEventListener('click', () => {
      if (this.cropper) {
        const croppedCanvas = this.cropper.getCroppedCanvas({
          maxWidth: 4096,
          maxHeight: 4096,
          fillColor: '#fff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        });

        if (croppedCanvas) {
          this.cropResult = croppedCanvas.toDataURL('image/png');
          resultImg.src = this.cropResult;
          cropResult.style.display = 'block';
          
          // Dispatch event for Wix
          this.dispatchEvent(new CustomEvent('crop-complete', {
            detail: { dataUrl: this.cropResult }
          }));
          
          // Store in the element's property for Wix to access
          this.setAttribute('crop-result', this.cropResult);
        }
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (this.cropResult) {
        const link = document.createElement('a');
        link.download = 'cropped-image.png';
        link.href = this.cropResult;
        link.click();
      }
    });
  }

  initCropper() {
    const image = this.querySelector('#image');
    const imgContainer = this.querySelector('#imgContainer');
    
    if (!image || !imgContainer) {
      console.error('Image or container elements not found');
      return;
    }
    
    // Destroy previous instance if exists
    if (this.cropper) {
      this.cropper.destroy();
    }
    
    // Verify Cropper is available
    if (!window.Cropper) {
      console.error("Cropper.js is not loaded yet");
      this.loadCropperLibrary().then(() => {
        setTimeout(() => this.initCropper(), 200);
      });
      return;
    }
    
    try {
      // Force container to have position relative
      imgContainer.style.position = 'relative';
      
      // Ensure image is displayed
      image.style.display = 'block';
      
      // Enhanced options with ready callback
      const enhancedOptions = {
        ...this.cropperOptions,
        ready: () => {
          console.log('Cropper is ready');
          
          // Set initial active aspect ratio button
          const aspectRatioBtns = this.querySelectorAll('.aspect-ratio-btn');
          aspectRatioBtns.forEach(btn => {
            if (btn.dataset.ratio === 'NaN') {
              btn.classList.add('active');
            }
          });
          
          // Set initial active drag mode button
          const cropModeBtn = this.querySelector('#cropModeBtn');
          if (cropModeBtn) {
            cropModeBtn.classList.add('active');
          }
          
          // Force a small zoom to ensure crop box is visible
          setTimeout(() => {
            if (this.cropper) {
              this.cropper.zoom(0.01);
            }
          }, 200);
        }
      };
      
      // Initialize Cropper with enhanced options
      this.cropper = new Cropper(image, enhancedOptions);
      
      // Force redraw of cropper elements
      setTimeout(() => {
        if (this.cropper) {
          this.cropper.clear();
          this.cropper.crop();
        }
      }, 300);
      
      // Initialize sliders
      this.updateZoomSlider();
    } catch (error) {
      console.error("Error initializing Cropper:", error);
    }
  }
  
  updateZoomSlider() {
    if (!this.cropper) return;
    
    const zoomSlider = this.querySelector('#zoomSlider');
    const zoomValue = this.querySelector('#zoomValue');
    
    if (!zoomSlider || !zoomValue) return;
    
    try {
      const canvasData = this.cropper.getCanvasData();
      const containerData = this.cropper.getContainerData();
      
      // Calculate zoom ratio (normalized between 0 and 1)
      const zoomRatio = canvasData.width / canvasData.naturalWidth;
      const minZoom = containerData.width / canvasData.naturalWidth;
      const maxZoom = 2; // Maximum zoom level
      
      // Normalize to 0-1 range for the slider
      const normalizedZoom = (zoomRatio - minZoom) / (maxZoom - minZoom);
      const clampedZoom = Math.max(0, Math.min(1, normalizedZoom));
      
      zoomSlider.value = clampedZoom;
      zoomValue.textContent = `${Math.round(zoomRatio * 100)}%`;
    } catch (error) {
      console.error('Error updating zoom slider:', error);
    }
  }
  
  // Method to get cropped image data (for external use)
  getCroppedImageData() {
    return this.cropResult;
  }
}

// Register the custom element
customElements.define('advanced-image-cropper', AdvancedImageCropper);
