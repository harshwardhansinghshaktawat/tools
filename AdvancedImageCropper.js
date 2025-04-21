/**
 * Advanced Image Cropper - Wix Custom Element
 * Filename: wix-advanced-image-cropper.js
 * Custom Element Tag: <advanced-image-cropper>
 * 
 * A powerful image cropping tool built with Cropper.js
 * This version uses light DOM instead of Shadow DOM to ensure better compatibility
 */
class AdvancedImageCropper extends HTMLElement {
  constructor() {
    super();
    // Don't use shadow DOM
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
      minContainerHeight: 300,
      ready: () => {
        console.log('Cropper is ready');
      }
    };
  }

  connectedCallback() {
    // First load the required styles and scripts
    this.loadRequiredResources().then(() => {
      // Then render the HTML content
      this.render();
      // Initialize event listeners
      this.initEventListeners();
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

  loadRequiredResources() {
    return new Promise((resolve, reject) => {
      // Add the CSS for Cropper.js
      this.loadStyles()
        .then(() => this.loadCropperScript())
        .then(() => {
          this.cropperLoaded = true;
          resolve();
        })
        .catch(error => {
          console.error('Failed to load resources:', error);
          reject(error);
        });
    });
  }

  loadStyles() {
    return new Promise((resolve) => {
      // Check if styles already exist
      if (document.querySelector('#advanced-image-cropper-styles')) {
        resolve();
        return;
      }

      // Create style element
      const style = document.createElement('style');
      style.id = 'advanced-image-cropper-styles';
      style.textContent = `
        /* Cropper.js styles */
        .cropper-container {
          font-size: 0;
          line-height: 0;
          position: relative;
          user-select: none;
          direction: ltr;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          z-index: 10 !important;
        }

        .cropper-container img {
          display: block;
          height: 100%;
          width: 100%;
          max-height: none !important;
          max-width: none !important;
          min-height: 0 !important;
          min-width: 0 !important;
          image-orientation: 0deg;
        }

        .cropper-wrap-box,
        .cropper-canvas,
        .cropper-drag-box,
        .cropper-crop-box,
        .cropper-modal {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
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
          width: 100%;
          overflow: hidden;
          outline: 1px solid #39f;
          outline-color: rgba(51, 153, 255, 0.75);
        }

        .cropper-dashed {
          position: absolute;
          display: block;
          opacity: 0.5;
          border: 0 dashed #eee;
        }

        .cropper-dashed.dashed-h {
          top: 33.33333%;
          left: 0;
          width: 100%;
          height: 33.33333%;
          border-top-width: 1px;
          border-bottom-width: 1px;
        }

        .cropper-dashed.dashed-v {
          top: 0;
          left: 33.33333%;
          width: 33.33333%;
          height: 100%;
          border-right-width: 1px;
          border-left-width: 1px;
        }

        .cropper-center {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 0;
          height: 0;
          opacity: 0.75;
        }

        .cropper-center:before,
        .cropper-center:after {
          position: absolute;
          display: block;
          background-color: #eee;
          content: ' ';
        }

        .cropper-center:before {
          top: 0;
          left: -3px;
          width: 7px;
          height: 1px;
        }

        .cropper-center:after {
          top: -3px;
          left: 0;
          width: 1px;
          height: 7px;
        }

        .cropper-face,
        .cropper-line,
        .cropper-point {
          position: absolute;
          display: block;
          width: 100%;
          height: 100%;
          opacity: 0.1;
        }

        .cropper-face {
          top: 0;
          left: 0;
          background-color: #fff;
        }

        .cropper-line {
          background-color: #39f;
        }

        .cropper-line.line-e {
          top: 0;
          right: -3px;
          width: 5px;
          cursor: e-resize;
        }

        .cropper-line.line-n {
          top: -3px;
          left: 0;
          height: 5px;
          cursor: n-resize;
        }

        .cropper-line.line-w {
          top: 0;
          left: -3px;
          width: 5px;
          cursor: w-resize;
        }

        .cropper-line.line-s {
          bottom: -3px;
          left: 0;
          height: 5px;
          cursor: s-resize;
        }

        .cropper-point {
          width: 5px;
          height: 5px;
          opacity: 0.75;
          background-color: #39f;
        }

        .cropper-point.point-e {
          top: 50%;
          right: -3px;
          margin-top: -3px;
          cursor: e-resize;
        }

        .cropper-point.point-n {
          top: -3px;
          left: 50%;
          margin-left: -3px;
          cursor: n-resize;
        }

        .cropper-point.point-w {
          top: 50%;
          left: -3px;
          margin-top: -3px;
          cursor: w-resize;
        }

        .cropper-point.point-s {
          bottom: -3px;
          left: 50%;
          margin-left: -3px;
          cursor: s-resize;
        }

        .cropper-point.point-ne {
          top: -3px;
          right: -3px;
          cursor: ne-resize;
        }

        .cropper-point.point-nw {
          top: -3px;
          left: -3px;
          cursor: nw-resize;
        }

        .cropper-point.point-sw {
          bottom: -3px;
          left: -3px;
          cursor: sw-resize;
        }

        .cropper-point.point-se {
          right: -3px;
          bottom: -3px;
          width: 20px;
          height: 20px;
          cursor: se-resize;
          opacity: 0.1;
        }

        .cropper-point.point-se:before {
          position: absolute;
          right: -50%;
          bottom: -50%;
          display: block;
          width: 200%;
          height: 200%;
          background-color: #39f;
          opacity: 0;
          content: ' ';
        }

        .cropper-invisible {
          opacity: 0;
        }

        .cropper-bg {
          background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC');
        }

        .cropper-hide {
          position: absolute;
          display: block;
          width: 0;
          height: 0;
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

        /* Custom component styles */
        .aic-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 100%;
          padding: 20px;
          border-radius: 12px;
          background-color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        .aic-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .aic-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        
        .aic-upload-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .aic-upload-btn {
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
        
        .aic-upload-btn:hover {
          background-color: #2980b9;
        }
        
        .aic-upload-icon {
          width: 18px;
          height: 18px;
        }
        
        .aic-file-input {
          display: none;
        }
        
        .aic-img-container {
          position: relative;
          max-width: 100%;
          height: 450px;
          background-color: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          transition: height 0.3s;
        }
        
        .aic-img {
          max-width: 100%;
          max-height: 100%;
        }
        
        .aic-placeholder {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #adb5bd;
          text-align: center;
          padding: 20px;
        }
        
        .aic-placeholder-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .aic-controls-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 10px;
        }
        
        .aic-control-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .aic-control-label {
          width: 100%;
          margin-bottom: 5px;
          font-size: 14px;
          font-weight: 600;
          color: #495057;
        }
        
        .aic-btn {
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
        
        .aic-btn:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }
        
        .aic-btn.primary {
          background-color: #3498db;
          border-color: #3498db;
          color: white;
        }
        
        .aic-btn.primary:hover {
          background-color: #2980b9;
          border-color: #2980b9;
        }
        
        .aic-btn.danger {
          background-color: #e74c3c;
          border-color: #e74c3c;
          color: white;
        }
        
        .aic-btn.danger:hover {
          background-color: #c0392b;
          border-color: #c0392b;
        }
        
        .aic-btn.active {
          background-color: #3498db;
          border-color: #3498db;
          color: white;
        }
        
        .aic-btn-icon {
          width: 16px;
          height: 16px;
        }
        
        .aic-dropdown {
          position: relative;
          display: inline-block;
        }
        
        .aic-dropdown-content {
          display: none;
          position: absolute;
          background-color: white;
          min-width: 160px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          z-index: 1;
          padding: 8px;
        }
        
        .aic-dropdown:hover .aic-dropdown-content {
          display: block;
        }
        
        .aic-dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .aic-dropdown-item:hover {
          background-color: #f1f3f5;
        }
        
        .aic-slider-container {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        
        .aic-slider-label {
          min-width: 80px;
          font-size: 14px;
          color: #495057;
        }
        
        .aic-slider {
          flex-grow: 1;
          height: 5px;
          -webkit-appearance: none;
          background: #dee2e6;
          border-radius: 5px;
          outline: none;
        }
        
        .aic-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3498db;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .aic-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3498db;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
        }
        
        .aic-slider::-webkit-slider-thumb:hover {
          background: #2980b9;
        }
        
        .aic-slider::-moz-range-thumb:hover {
          background: #2980b9;
        }
        
        .aic-slider-value {
          min-width: 40px;
          text-align: center;
          font-size: 14px;
          color: #495057;
        }
        
        .aic-aspect-ratio-btn {
          padding: 6px 12px;
          border-radius: 6px;
          background-color: #f1f3f5;
          border: 1px solid #ced4da;
          color: #495057;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .aic-aspect-ratio-btn:hover,
        .aic-aspect-ratio-btn.active {
          background-color: #3498db;
          border-color: #3498db;
          color: white;
        }
        
        .aic-crop-result {
          margin-top: 20px;
          text-align: center;
        }
        
        .aic-result-img {
          max-width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 768px) {
          .aic-control-group {
            flex-direction: column;
          }
          
          .aic-img-container {
            height: 350px;
          }
        }
      `;
      document.head.appendChild(style);
      resolve();
    });
  }

  loadCropperScript() {
    return new Promise((resolve, reject) => {
      // Check if Cropper is already available
      if (window.Cropper) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="cropper.min.js"]');
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if (window.Cropper) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      // Load the script
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('Cropper.js loaded successfully');
        // Give a moment for the script to initialize
        setTimeout(() => {
          if (window.Cropper) {
            resolve();
          } else {
            reject(new Error('Cropper not defined after script load'));
          }
        }, 200);
      };
      
      script.onerror = (err) => {
        reject(new Error('Failed to load Cropper.js'));
      };
      
      document.head.appendChild(script);
    });
  }

  render() {
    this.innerHTML = `
      <div class="aic-container">
        <div class="aic-header">
          <h2 class="aic-title">Advanced Image Cropper</h2>
          <div class="aic-upload-container">
            <button class="aic-upload-btn" id="aic-uploadBtn">
              <svg class="aic-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Image
            </button>
            <input type="file" accept="image/*" class="aic-file-input" id="aic-fileInput">
          </div>
        </div>
        
        <div class="aic-img-container" id="aic-imgContainer">
          <div class="aic-placeholder" id="aic-placeholder">
            <svg class="aic-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p>Upload an image to start cropping</p>
          </div>
          <img id="aic-image" class="aic-img" style="display: none;">
        </div>
        
        <div class="aic-controls-container" id="aic-controlsContainer" style="display: none;">
          <div class="aic-control-group">
            <div class="aic-control-label">Aspect Ratio</div>
            <button class="aic-aspect-ratio-btn" data-ratio="NaN">Free</button>
            <button class="aic-aspect-ratio-btn" data-ratio="1">1:1</button>
            <button class="aic-aspect-ratio-btn" data-ratio="16/9">16:9</button>
            <button class="aic-aspect-ratio-btn" data-ratio="9/16">9:16</button>
            <button class="aic-aspect-ratio-btn" data-ratio="4/3">4:3</button>
            <button class="aic-aspect-ratio-btn" data-ratio="3/4">3:4</button>
            <button class="aic-aspect-ratio-btn" data-ratio="3/2">3:2</button>
            <button class="aic-aspect-ratio-btn" data-ratio="2/3">2:3</button>
          </div>
          
          <div class="aic-control-group">
            <div class="aic-control-label">Zoom</div>
            <div class="aic-slider-container">
              <span class="aic-slider-label">Zoom</span>
              <input type="range" min="0" max="1" step="0.01" value="0" class="aic-slider" id="aic-zoomSlider">
              <span class="aic-slider-value" id="aic-zoomValue">0%</span>
            </div>
            <button class="aic-btn" id="aic-zoomInBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
            <button class="aic-btn" id="aic-zoomOutBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
          </div>
          
          <div class="aic-control-group">
            <div class="aic-control-label">Actions</div>
            <button class="aic-btn" id="aic-resetBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Reset
            </button>
            <button class="aic-btn" id="aic-clearBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Clear
            </button>
            <button class="aic-btn primary" id="aic-cropBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
                <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
              </svg>
              Crop Image
            </button>
          </div>
        </div>
        
        <div class="aic-crop-result" id="aic-cropResult" style="display: none;">
          <h3>Cropped Result</h3>
          <img class="aic-result-img" id="aic-resultImg">
          <div style="margin-top: 15px;">
            <button class="aic-btn primary" id="aic-downloadBtn">
              <svg class="aic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

  initEventListeners() {
    const uploadBtn = document.getElementById('aic-uploadBtn');
    const fileInput = document.getElementById('aic-fileInput');
    const image = document.getElementById('aic-image');
    const placeholder = document.getElementById('aic-placeholder');
    const controlsContainer = document.getElementById('aic-controlsContainer');
    const cropResult = document.getElementById('aic-cropResult');
    const resultImg = document.getElementById('aic-resultImg');
    const downloadBtn = document.getElementById('aic-downloadBtn');

    if (!uploadBtn || !fileInput || !image) {
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
            this.initCropper();
          };
        };

        reader.readAsDataURL(file);
      }
    });

    // Aspect ratio buttons
    const aspectRatioBtns = document.querySelectorAll('.aic-aspect-ratio-btn');
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
    const zoomSlider = document.getElementById('aic-zoomSlider');
    const zoomValue = document.getElementById('aic-zoomValue');
    const zoomInBtn = document.getElementById('aic-zoomInBtn');
    const zoomOutBtn = document.getElementById('aic-zoomOutBtn');

    if (zoomSlider && zoomValue) {
      zoomSlider.addEventListener('input', () => {
        const value = parseFloat(zoomSlider.value);
        zoomValue.textContent = `${Math.round(value * 100)}%`;
        if (this.cropper) {
          this.cropper.zoomTo(value);
        }
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (this.cropper) {
          this.cropper.zoom(0.1);
          this.updateZoomSlider();
        }
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (this.cropper) {
          this.cropper.zoom(-0.1);
          this.updateZoomSlider();
        }
      });
    }

    // Actions
    const resetBtn = document.getElementById('aic-resetBtn');
    const clearBtn = document.getElementById('aic-clearBtn');
    const cropBtn = document.getElementById('aic-cropBtn');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.cropper) {
          this.cropper.reset();
          this.updateZoomSlider();
        }
      });
    }

    if (clearBtn) {
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
    }

    if (cropBtn) {
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
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (this.cropResult) {
          const link = document.createElement('a');
          link.download = 'cropped-image.png';
          link.href = this.cropResult;
          link.click();
        }
      });
    }
  }

  initCropper() {
    const image = document.getElementById('aic-image');
    const imgContainer = document.getElementById('aic-imgContainer');
    
    if (!image || !imgContainer) {
      console.error('Image or container elements not found');
      return;
    }
    
    // Destroy previous instance if exists
    if (this.cropper) {
      this.cropper.destroy();
    }
    
    // Ensure Cropper is available
    if (!window.Cropper) {
      console.error("Cropper.js is not loaded yet. Trying to load it now.");
      this.loadCropperScript().then(() => {
        setTimeout(() => {
          this.initCropper();
        }, 500);
      });
      return;
    }
    
    try {
      // Make sure the image container has position relative
      imgContainer.style.position = 'relative';
      imgContainer.style.overflow = 'hidden';
      
      // Make sure image has display block and is visible
      image.style.display = 'block';
      image.style.maxWidth = '100%';
      
      console.log('Initializing cropper with options:', this.cropperOptions);
      
      // Initialize Cropper with options
      this.cropper = new Cropper(image, {
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
        zoomable: true,
        wheelZoomRatio: 0.1,
        ready: () => {
          console.log('Cropper is ready');
          // Set initial active state for buttons
          const aspectRatioBtns = document.querySelectorAll('.aic-aspect-ratio-btn');
          aspectRatioBtns.forEach(btn => {
            if (btn.dataset.ratio === 'NaN') {
              btn.classList.add('active');
            }
          });
          
          // Force a small zoom after initialization to make crop box more visible
          setTimeout(() => {
            if (this.cropper) {
              this.cropper.zoom(0.01);
            }
          }, 200);
        }
      });
      
      // Enable console logging for debugging
      console.log('Cropper initialized:', this.cropper);
      
    } catch (error) {
      console.error("Error initializing Cropper:", error);
    }
  }
  
  updateZoomSlider() {
    if (!this.cropper) return;
    
    const zoomSlider = document.getElementById('aic-zoomSlider');
    const zoomValue = document.getElementById('aic-zoomValue');
    
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
