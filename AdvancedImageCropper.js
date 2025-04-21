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
    this.isCropperJsLoaded = false;

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
        console.log('Cropper.js initialized successfully');
      }
    };
  }

  connectedCallback() {
    this.render();
    this.initEventListeners();
    this.loadCropperLibrary();

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
        cropResult: { type: 'string', readOnly: true },
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
        guidelinesVisible: { type: 'boolean', editorOnly: true, defaultValue: true },
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
          display: block;
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: auto !important;
        }

        .cropper-container {
          position: absolute !important;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          pointer-events: auto !important;
        }

        .cropper-crop-box {
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        .cropper-crop-box:hover {
          cursor: move;
        }

        .cropper-face {
          opacity: 0.3 !important;
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

        /* Rest of the styles remain unchanged */
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
                <polyline points="1 4 1 10 7 scaleY(this.cropper.getData().scaleY * -1);
      }
    });

    rotateSlider.addEventListener('input', () => {
      const value = parseInt(rotateSlider.value, 10);
      rotateValue.textContent = `${value}°`;
      if (this.cropper) {
        const data = this.cropper.getData();
        const currentRotation = data.rotate;
        const nearestMultipleOf90 = Math.round(currentRotation / 90) * 90;
        const fineRotation = value;
        this.cropper.rotateTo(nearestMultipleOf90 + fineRotation);
      }
    });

    // Drag mode controls
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
          imageSmoothingQuality: 'high'
        });

        if (croppedCanvas) {
          this.cropResult = croppedCanvas.toDataURL('image/png');
          resultImg.src = this.cropResult;
          cropResult.style.display = 'block';
          this.dispatchEvent(new CustomEvent('crop-complete', {
            detail: { dataUrl: this.cropResult }
          }));
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

  async initCropper() {
    const image = this.shadowRoot.getElementById('image');

    // Wait for image to fully load
    if (!image.complete || image.naturalWidth === 0) {
      await new Promise(resolve => {
        image.onload = resolve;
        image.onerror = () => {
          console.error('Failed to load image');
          resolve();
        };
      });
    }

    // Wait for Cropper.js to be loaded
    if (!this.isCropperJsLoaded || typeof Cropper === 'undefined') {
      console.warn('Cropper.js not loaded, waiting...');
      await new Promise(resolve => {
        const checkCropper = setInterval(() => {
          if (typeof Cropper !== 'undefined') {
            clearInterval(checkCropper);
            this.isCropperJsLoaded = true;
            resolve();
          }
        }, 100);
      });
    }

    // Destroy previous instance if exists
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    try {
      // Initialize Cropper with options
      this.cropper = new Cropper(image, {
        ...this.cropperOptions,
        ready: () => {
          console.log('Cropper.js ready');
          // Ensure crop box is visible
          const cropBox = this.shadowRoot.querySelector('.cropper-crop-box');
          if (cropBox) {
            cropBox.style.opacity = '1';
            cropBox.style.pointerEvents = 'auto';
          }
        }
      });

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
    } catch (error) {
      console.error('Failed to initialize Cropper.js:', error);
    }
  }

  updateZoomSlider() {
    if (this.cropper) {
      const canvasData = this.cropper.getCanvasData();
      const containerData = this.cropper.getContainerData();

      const zoomRatio = canvasData.width / canvasData.naturalWidth;
      const minZoom = containerData.width / canvasData.naturalWidth;
      const maxZoom = 2;

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

      const fullRotation = data.rotate % 360;
      const nearestMultipleOf90 = Math.round(fullRotation / 90) * 90;
      const fineRotation = fullRotation - nearestMultipleOf90;

      rotateSlider.value = fineRotation;
      rotateValue.textContent = `${Math.round(fullRotation)}°`;
    }
  }

  getCroppedImageData() {
    return this.cropResult;
  }
}

// Register the custom element
customElements.define('advanced-image-cropper', AdvancedImageCropper);
