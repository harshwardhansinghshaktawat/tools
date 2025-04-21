/**
 * Advanced Image Cropper for Wix
 * This implementation avoids using Custom Elements API
 * Instead, it uses standard DOM elements with class 'wix-image-cropper'
 */

// Create self-executing function to avoid polluting global namespace
(function() {
  // Load Cropper.js script
  function loadCropperScript() {
    return new Promise((resolve, reject) => {
      if (window.Cropper) {
        resolve(window.Cropper);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log("Cropper.js loaded successfully");
        resolve(window.Cropper);
      };
      
      script.onerror = (error) => {
        console.error("Failed to load Cropper.js", error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  // Load Cropper.js CSS
  function loadCropperStyles() {
    if (document.getElementById('wix-cropper-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'wix-cropper-styles';
    style.textContent = `
      .wic-container {
        display: block;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      }
      
      .wic-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .wic-title {
        font-size: 20px;
        margin: 0;
        color: #333;
        font-weight: 600;
      }
      
      .wic-upload-container {
        display: flex;
        align-items: center;
      }
      
      .wic-upload-btn {
        background-color: #3498db;
        border: none;
        color: white;
        padding: 10px 15px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.2s;
      }
      
      .wic-upload-btn:hover {
        background-color: #2980b9;
      }
      
      .wic-upload-icon {
        width: 16px;
        height: 16px;
      }
      
      .wic-file-input {
        display: none;
      }
      
      .wic-img-container {
        position: relative;
        max-width: 100%;
        height: 450px;
        background-color: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 15px;
      }
      
      .wic-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #adb5bd;
        padding: 20px;
      }
      
      .wic-placeholder-icon {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .wic-image {
        max-width: 100%;
        max-height: 100%;
      }
      
      .wic-controls-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 15px;
      }
      
      .wic-control-group {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .wic-control-label {
        width: 100%;
        margin-bottom: 5px;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
      }
      
      .wic-btn {
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
        padding: 8px 12px;
      }
      
      .wic-btn:hover {
        background-color: #e9ecef;
        border-color: #adb5bd;
      }
      
      .wic-btn.primary {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .wic-btn.primary:hover {
        background-color: #2980b9;
        border-color: #2980b9;
      }
      
      .wic-btn.danger {
        background-color: #e74c3c;
        border-color: #e74c3c;
        color: white;
      }
      
      .wic-btn.danger:hover {
        background-color: #c0392b;
        border-color: #c0392b;
      }
      
      .wic-btn.active {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .wic-btn-icon {
        width: 16px;
        height: 16px;
      }
      
      .wic-slider-container {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      
      .wic-slider-label {
        min-width: 80px;
        font-size: 14px;
        color: #495057;
      }
      
      .wic-slider {
        flex-grow: 1;
        height: 5px;
        -webkit-appearance: none;
        background: #dee2e6;
        border-radius: 5px;
        outline: none;
      }
      
      .wic-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .wic-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
      }
      
      .wic-slider-value {
        min-width: 40px;
        text-align: center;
        font-size: 14px;
        color: #495057;
      }
      
      .wic-aspect-ratio-btn {
        padding: 6px 12px;
        border-radius: 6px;
        background-color: #f1f3f5;
        border: 1px solid #ced4da;
        color: #495057;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .wic-aspect-ratio-btn:hover,
      .wic-aspect-ratio-btn.active {
        background-color: #3498db;
        border-color: #3498db;
        color: white;
      }
      
      .wic-crop-result {
        margin-top: 20px;
        text-align: center;
      }
      
      .wic-result-img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      
      @media (max-width: 768px) {
        .wic-control-group {
          flex-direction: column;
        }
        
        .wic-img-container {
          height: 350px;
        }
        
        .wic-header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .wic-upload-container {
          margin-top: 10px;
        }
      }
      
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
    `;
    document.head.appendChild(style);
  }

  // Initialize cropper on all elements with class 'wix-image-cropper'
  function initWixCroppers() {
    console.log('Initializing Wix Image Croppers');
    
    // Find all cropper containers
    const cropperElements = document.querySelectorAll('.wix-image-cropper');
    console.log(`Found ${cropperElements.length} cropper elements`);
    
    if (cropperElements.length === 0) {
      // If no elements found yet, try again later
      setTimeout(initWixCroppers, 1000);
      return;
    }

    // Initialize each cropper
    cropperElements.forEach((element, index) => {
      if (element.dataset.initialized === 'true') {
        return; // Skip already initialized elements
      }
      
      console.log(`Initializing cropper #${index}`);
      
      // Create the HTML structure for this cropper
      element.dataset.initialized = 'true';
      element.innerHTML = `
        <div class="wic-container">
          <div class="wic-header">
            <h2 class="wic-title">Advanced Image Cropper</h2>
            <div class="wic-upload-container">
              <button class="wic-upload-btn" id="wic-uploadBtn-${index}">
                <svg class="wic-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Image
              </button>
              <input type="file" accept="image/*" class="wic-file-input" id="wic-fileInput-${index}">
            </div>
          </div>
          
          <div class="wic-img-container" id="wic-imgContainer-${index}">
            <div class="wic-placeholder" id="wic-placeholder-${index}">
              <svg class="wic-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>Upload an image to start cropping</p>
            </div>
            <img id="wic-image-${index}" class="wic-image" style="display: none;">
          </div>
          
          <div class="wic-controls-container" id="wic-controlsContainer-${index}" style="display: none;">
            <div class="wic-control-group">
              <div class="wic-control-label">Aspect Ratio</div>
              <button class="wic-aspect-ratio-btn" data-ratio="NaN">Free</button>
              <button class="wic-aspect-ratio-btn" data-ratio="1">1:1</button>
              <button class="wic-aspect-ratio-btn" data-ratio="16/9">16:9</button>
              <button class="wic-aspect-ratio-btn" data-ratio="9/16">9:16</button>
              <button class="wic-aspect-ratio-btn" data-ratio="4/3">4:3</button>
              <button class="wic-aspect-ratio-btn" data-ratio="3/4">3:4</button>
              <button class="wic-aspect-ratio-btn" data-ratio="3/2">3:2</button>
              <button class="wic-aspect-ratio-btn" data-ratio="2/3">2:3</button>
            </div>
            
            <div class="wic-control-group">
              <div class="wic-control-label">Zoom</div>
              <div class="wic-slider-container">
                <span class="wic-slider-label">Zoom</span>
                <input type="range" min="0" max="1" step="0.01" value="0" class="wic-slider" id="wic-zoomSlider-${index}">
                <span class="wic-slider-value" id="wic-zoomValue-${index}">0%</span>
              </div>
              <button class="wic-btn" id="wic-zoomInBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </button>
              <button class="wic-btn" id="wic-zoomOutBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </button>
            </div>
            
            <div class="wic-control-group">
              <div class="wic-control-label">Rotation & Flip</div>
              <button class="wic-btn" id="wic-rotateLeftBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Rotate Left
              </button>
              <button class="wic-btn" id="wic-rotateRightBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Rotate Right
              </button>
              <button class="wic-btn" id="wic-flipHorizontalBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v18"></path>
                  <path d="M17 8l-5-5-5 5"></path>
                  <path d="M17 16l-5 5-5-5"></path>
                </svg>
                Flip H
              </button>
              <button class="wic-btn" id="wic-flipVerticalBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12h18"></path>
                  <path d="M8 7l-5 5 5 5"></path>
                  <path d="M16 7l5 5-5 5"></path>
                </svg>
                Flip V
              </button>
            </div>
            
            <div class="wic-control-group">
              <div class="wic-control-label">Drag Mode</div>
              <button class="wic-btn" id="wic-cropModeBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 15h12M6 9h12M4 5h16v14H4z"></path>
                </svg>
                Crop
              </button>
              <button class="wic-btn" id="wic-moveModeBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            
            <div class="wic-control-group">
              <div class="wic-control-label">Actions</div>
              <button class="wic-btn" id="wic-resetBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Reset
              </button>
              <button class="wic-btn" id="wic-clearBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Clear
              </button>
              <button class="wic-btn primary" id="wic-cropBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
                  <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
                </svg>
                Crop Image
              </button>
            </div>
          </div>
          
          <div class="wic-crop-result" id="wic-cropResult-${index}" style="display: none;">
            <h3>Cropped Result</h3>
            <img class="wic-result-img" id="wic-resultImg-${index}">
            <div style="margin-top: 15px;">
              <button class="wic-btn primary" id="wic-downloadBtn-${index}">
                <svg class="wic-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      
      // Set up the cropper functionality
      setupCropper(element, index);
    });
  }

  function setupCropper(element, index) {
    // Get elements
    const uploadBtn = document.getElementById(`wic-uploadBtn-${index}`);
    const fileInput = document.getElementById(`wic-fileInput-${index}`);
    const image = document.getElementById(`wic-image-${index}`);
    const placeholder = document.getElementById(`wic-placeholder-${index}`);
    const controlsContainer = document.getElementById(`wic-controlsContainer-${index}`);
    const cropResult = document.getElementById(`wic-cropResult-${index}`);
    const resultImg = document.getElementById(`wic-resultImg-${index}`);
    const downloadBtn = document.getElementById(`wic-downloadBtn-${index}`);
    const imgContainer = document.getElementById(`wic-imgContainer-${index}`);
    
    // Get aspect ratio buttons
    const aspectRatioBtns = element.querySelectorAll('.wic-aspect-ratio-btn');
    
    // Get zoom controls
    const zoomSlider = document.getElementById(`wic-zoomSlider-${index}`);
    const zoomValue = document.getElementById(`wic-zoomValue-${index}`);
    const zoomInBtn = document.getElementById(`wic-zoomInBtn-${index}`);
    const zoomOutBtn = document.getElementById(`wic-zoomOutBtn-${index}`);
    
    // Get rotation and flip controls
    const rotateLeftBtn = document.getElementById(`wic-rotateLeftBtn-${index}`);
    const rotateRightBtn = document.getElementById(`wic-rotateRightBtn-${index}`);
    const flipHorizontalBtn = document.getElementById(`wic-flipHorizontalBtn-${index}`);
    const flipVerticalBtn = document.getElementById(`wic-flipVerticalBtn-${index}`);
    
    // Get drag mode controls
    const cropModeBtn = document.getElementById(`wic-cropModeBtn-${index}`);
    const moveModeBtn = document.getElementById(`wic-moveModeBtn-${index}`);
    
    // Get action buttons
    const resetBtn = document.getElementById(`wic-resetBtn-${index}`);
    const clearBtn = document.getElementById(`wic-clearBtn-${index}`);
    const cropBtn = document.getElementById(`wic-cropBtn-${index}`);
    
    // Instance variables
    let cropper = null;
    let cropResult = null;
    
    // Initial cropper options
    const cropperOptions = {
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
      zoomable: true,
      ready: function() {
        console.log(`Cropper #${index} is ready`);
        // Set initial active state
        cropModeBtn.classList.add('active');
        aspectRatioBtns[0].classList.add('active'); // Free aspect ratio
        
        // Force a small zoom to ensure crop box is visible
        setTimeout(() => {
          if (cropper) {
            cropper.zoom(0.01);
          }
        }, 200);
      }
    };
    
    // Helper function to update zoom slider
    function updateZoomSlider() {
      if (!cropper) return;
      
      try {
        const canvasData = cropper.getCanvasData();
        const containerData = cropper.getContainerData();
        
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
    
    // Add event handlers
    
    // Upload image
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          image.src = event.target.result;
          image.style.display = 'block';
          placeholder.style.display = 'none';
          controlsContainer.style.display = 'flex';
          cropResult.style.display = 'none';
          
          // Initialize cropper after image is loaded
          image.onload = () => {
            // Make sure the image container has position relative
            imgContainer.style.position = 'relative';
            
            // Destroy existing cropper if any
            if (cropper) {
              cropper.destroy();
            }
            
            // Initialize new cropper
            cropper = new Cropper(image, cropperOptions);
          };
        };
        
        reader.readAsDataURL(file);
      }
    });
    
    // Aspect ratio buttons
    aspectRatioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectRatioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ratio = btn.dataset.ratio;
        const aspectRatio = ratio === 'NaN' ? NaN : eval(ratio);
        
        if (cropper) {
          cropper.setAspectRatio(aspectRatio);
        }
      });
    });
    
    // Zoom controls
    zoomSlider.addEventListener('input', () => {
      const value = parseFloat(zoomSlider.value);
      zoomValue.textContent = `${Math.round(value * 100)}%`;
      if (cropper) {
        cropper.zoomTo(value);
      }
    });
    
    zoomInBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.zoom(0.1);
        updateZoomSlider();
      }
    });
    
    zoomOutBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.zoom(-0.1);
        updateZoomSlider();
      }
    });
    
    // Rotation and flip controls
    rotateLeftBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.rotate(-90);
      }
    });
    
    rotateRightBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.rotate(90);
      }
    });
    
    flipHorizontalBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.scaleX(cropper.getData().scaleX * -1);
      }
    });
    
    flipVerticalBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.scaleY(cropper.getData().scaleY * -1);
      }
    });
    
    // Drag mode controls
    cropModeBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.setDragMode('crop');
        cropModeBtn.classList.add('active');
        moveModeBtn.classList.remove('active');
      }
    });
    
    moveModeBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.setDragMode('move');
        moveModeBtn.classList.add('active');
        cropModeBtn.classList.remove('active');
      }
    });
    
    // Action buttons
    resetBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.reset();
        updateZoomSlider();
      }
    });
    
    clearBtn.addEventListener('click', () => {
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      image.src = '';
      image.style.display = 'none';
      placeholder.style.display = 'flex';
      controlsContainer.style.display = 'none';
      cropResult.style.display = 'none';
      fileInput.value = '';
    });
    
    cropBtn.addEventListener('click', () => {
      if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas({
          maxWidth: 4096,
          maxHeight: 4096,
          fillColor: '#fff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        });
        
        if (croppedCanvas) {
          cropResult = croppedCanvas.toDataURL('image/png');
          resultImg.src = cropResult;
          cropResult.style.display = 'block';
          
          // Store in the element's dataset for Wix to access
          element.dataset.cropResult = cropResult;
          
          // Dispatch event for Wix
          element.dispatchEvent(new CustomEvent('crop-complete', {
            detail: { dataUrl: cropResult }
          }));
        }
      }
    });
    
    downloadBtn.addEventListener('click', () => {
      if (cropResult) {
        const link = document.createElement('a');
        link.download = 'cropped-image.png';
        link.href = cropResult;
        link.click();
      }
    });
  }

  // Main initialization function
  function init() {
    console.log('Starting Wix Image Cropper initialization');
    
    // Load styles first
    loadCropperStyles();
    
    // Then load script and init croppers
    loadCropperScript()
      .then(() => {
        console.log('Cropper script loaded, initializing croppers');
        // Initialize immediately, then try again after a delay
        initWixCroppers();
        
        // Some Wix sites take time to fully render, so we'll try again a few times
        setTimeout(initWixCroppers, 1000);
        setTimeout(initWixCroppers, 3000);
        
        // Set up a mutation observer to detect when new croppers are added
        const observer = new MutationObserver((mutations) => {
          let shouldInit = false;
          
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && (
                    node.classList && node.classList.contains('wix-image-cropper') || 
                    node.querySelector && node.querySelector('.wix-image-cropper')
                  )) {
                  shouldInit = true;
                }
              });
            }
          });
          
          if (shouldInit) {
            initWixCroppers();
          }
        });
        
        observer.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
      })
      .catch(error => {
        console.error('Error initializing Wix Image Cropper:', error);
      });
  }

  // Run initialization when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also try again after window load, in case Wix loads elements later
  window.addEventListener('load', () => {
    setTimeout(initWixCroppers, 1000);
  });
})();
