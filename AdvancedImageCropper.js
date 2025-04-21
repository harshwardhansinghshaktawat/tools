/**
 * Advanced Image Cropper - Wix Custom Element
 * Filename: wix-advanced-image-cropper.js
 * Custom Element Tag: <advanced-image-cropper>
 * 
 * A powerful image cropping tool built with Cropper.js
 */
class AdvancedImageCropper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.cropper = null;
    this.cropResult = null;
    this.originalImage = null;

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
    this.render();
    this.initEventListeners();

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

  render() {
    // Add required CSS for Cropper.js and our custom styling
    this.shadowRoot.innerHTML = `
      <style>
        @import "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css";
        
        :host {
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
          position: relative;
          max-width: 100%;
          height: 450px;
          background-color: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          transition: height 0.3s;
        }
        
        img {
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
        
        .btn-icon {
          width: 16px;
          height: 16px;
        }
        
        .dropdown {
          position: relative;
          display: inline-block;
        }
        
        .dropdown-content {
          display: none;
          position: absolute;
          background-color: white;
          min-width: 160px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          z-index: 1;
          padding: 8px;
        }
        
        .dropdown:hover .dropdown-content {
          display: block;
        }
        
        .dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .dropdown-item:hover {
          background-color: #f1f3f5;
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
        
        .slider::-webkit-slider-thumb:hover {
          background: #2980b9;
        }
        
        .slider::-moz-range-thumb:hover {
          background: #2980b9;
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
      </style>
      
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
          <img id="image" style="display: none;">
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
            <input type="range" min="-45" max="45" step="1" value="0" class="slider" id="rotateSlider">
            <span class="slider-value" id="rotateValue">0°</span>
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
            <div class="control-label">Display Options</div>
            <button class="btn" id="toggleGuidesBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="3" x2="21" y2="21"></line>
                <line x1="21" y1="3" x2="3" y2="21"></line>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="12" y1="3" x2="12" y2="21"></line>
              </svg>
              Toggle Guides
            </button>
            <button class="btn" id="toggleGridBtn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
              Toggle Grid
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

    // Load Cropper.js library
    this.loadCropperLibrary();
  }

  loadCropperLibrary() {
    if (document.querySelector('script[src*="cropper.min.js"]')) {
      return; // Already loaded
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
    script.onload = () => {
      console.log('Cropper.js loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Cropper.js');
    };
    document.head.appendChild(script);
  }

  initEventListeners() {
    const uploadBtn = this.shadowRoot.getElementById('uploadBtn');
    const fileInput = this.shadowRoot.getElementById('fileInput');
    const image = this.shadowRoot.getElementById('image');
    const placeholder = this.shadowRoot.getElementById('placeholder');
    const controlsContainer = this.shadowRoot.getElementById('controlsContainer');
    const cropResult = this.shadowRoot.getElementById('cropResult');
    const resultImg = this.shadowRoot.getElementById('resultImg');
    const downloadBtn = this.shadowRoot.getElementById('downloadBtn');

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
    const aspectRatioBtns = this.shadowRoot.querySelectorAll('.aspect-ratio-btn');
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
    const zoomSlider = this.shadowRoot.getElementById('zoomSlider');
    const zoomValue = this.shadowRoot.getElementById('zoomValue');
    const zoomInBtn = this.shadowRoot.getElementById('zoomInBtn');
    const zoomOutBtn = this.shadowRoot.getElementById('zoomOutBtn');

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
    const rotateLeftBtn = this.shadowRoot.getElementById('rotateLeftBtn');
    const rotateRightBtn = this.shadowRoot.getElementById('rotateRightBtn');
    const flipHorizontalBtn = this.shadowRoot.getElementById('flipHorizontalBtn');
    const flipVerticalBtn = this.shadowRoot.getElementById('flipVerticalBtn');
    const rotateSlider = this.shadowRoot.getElementById('rotateSlider');
    const rotateValue = this.shadowRoot.getElementById('rotateValue');

    rotateLeftBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.rotate(-90);
        this.updateRotateSlider();
      }
    });

    rotateRightBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.rotate(90);
        this.updateRotateSlider();
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

    rotateSlider.addEventListener('input', () => {
      const value = parseInt(rotateSlider.value, 10);
      rotateValue.textContent = `${value}°`;
      if (this.cropper) {
        // Get current rotation
        const data = this.cropper.getData();
        // Calculate the delta rotation to apply
        const currentRotation = data.rotate;
        const nearestMultipleOf90 = Math.round(currentRotation / 90) * 90;
        const fineRotation = value;
        this.cropper.rotateTo(nearestMultipleOf90 + fineRotation);
      }
    });

    // Drag mode controls
    const cropModeBtn = this.shadowRoot.getElementById('cropModeBtn');
    const moveModeBtn = this.shadowRoot.getElementById('moveModeBtn');

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

    // Display options
    const toggleGuidesBtn = this.shadowRoot.getElementById('toggleGuidesBtn');
    const toggleGridBtn = this.shadowRoot.getElementById('toggleGridBtn');

    toggleGuidesBtn.addEventListener('click', () => {
      if (this.cropper) {
        const options = this.cropper.getOptions();
        this.cropper.setOptions({
          guides: !options.guides,
          center: !options.center
        });
      }
    });

    toggleGridBtn.addEventListener('click', () => {
      const cropperCanvas = this.shadowRoot.querySelector('.cropper-container');
      if (cropperCanvas) {
        cropperCanvas.classList.toggle('cropper-grid');
      }
    });

    // Actions
    const resetBtn = this.shadowRoot.getElementById('resetBtn');
    const clearBtn = this.shadowRoot.getElementById('clearBtn');
    const cropBtn = this.shadowRoot.getElementById('cropBtn');

    resetBtn.addEventListener('click', () => {
      if (this.cropper) {
        this.cropper.reset();
        this.updateZoomSlider();
        this.updateRotateSlider();
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
    const image = this.shadowRoot.getElementById('image');
    
    // Destroy previous instance if exists
    if (this.cropper) {
      this.cropper.destroy();
    }
    
    // Initialize Cropper with options
    this.cropper = new Cropper(image, this.cropperOptions);
    
    // Set initial active aspect ratio button
    const aspectRatioBtns = this.shadowRoot.querySelectorAll('.aspect-ratio-btn');
    aspectRatioBtns.forEach(btn => {
      if (btn.dataset.ratio === 'NaN') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Set initial active drag mode button
    const cropModeBtn = this.shadowRoot.getElementById('cropModeBtn');
    cropModeBtn.classList.add('active');
    
    // Reset sliders
    this.updateZoomSlider();
    this.updateRotateSlider();
  }
  
  updateZoomSlider() {
    if (this.cropper) {
      const canvasData = this.cropper.getCanvasData();
      const containerData = this.cropper.getContainerData();
      
      // Calculate zoom ratio (normalized between 0 and 1)
      const zoomRatio = canvasData.width / canvasData.naturalWidth;
      const minZoom = containerData.width / canvasData.naturalWidth;
      const maxZoom = 2; // Maximum zoom level
      
      // Normalize to 0-1 range for the slider
      const normalizedZoom = (zoomRatio - minZoom) / (maxZoom - minZoom);
      const clampedZoom = Math.max(0, Math.min(1, normalizedZoom));
      
      const zoomSlider = this.shadowRoot.getElementById('zoomSlider');
      const zoomValue = this.shadowRoot.getElementById('zoomValue');
      
      zoomSlider.value = clampedZoom;
      zoomValue.textContent = `${Math.round(zoomRatio * 100)}%`;
    }
  }
  
  updateRotateSlider() {
    if (this.cropper) {
      const data = this.cropper.getData();
      const rotateSlider = this.shadowRoot.getElementById('rotateSlider');
      const rotateValue = this.shadowRoot.getElementById('rotateValue');
      
      // Get the rotation angle modulo 360
      const fullRotation = data.rotate % 360;
      // Get the nearest multiple of 90
      const nearestMultipleOf90 = Math.round(fullRotation / 90) * 90;
      // Calculate the fine rotation (-45 to 45)
      const fineRotation = fullRotation - nearestMultipleOf90;
      
      rotateSlider.value = fineRotation;
      rotateValue.textContent = `${Math.round(fullRotation)}°`;
    }
  }
  
  // Method to get cropped image data (for external use)
  getCroppedImageData() {
    return this.cropResult;
  }
}

// Register the custom element
customElements.define('advanced-image-cropper', AdvancedImageCropper);
