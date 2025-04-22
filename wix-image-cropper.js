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
 * - 20 unique crop shapes (circle, heart, star, etc.)
 * - Rotation and flipping capabilities
 * - Zoom functionality
 * - Image filters and adjustments
 * - Download cropped image
 * - Advanced output resizing
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
    this.currentShape = 'rectangle'; // Default shape
    
    // Advanced resize options
    this.outputWidth = null;  // Final output width in pixels
    this.outputHeight = null; // Final output height in pixels
    this.maintainOutputRatio = true; // Whether to maintain aspect ratio during output resize
    this.resizeQuality = 'high'; // Resize quality: low, medium, high
    
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
          { name: 'defaultShape', type: 'string', defaultValue: 'rectangle' },
          { name: 'enableFilters', type: 'boolean', defaultValue: true },
          { name: 'enableRotation', type: 'boolean', defaultValue: true },
          { name: 'enableAdvancedResize', type: 'boolean', defaultValue: true },
          { name: 'enableShapes', type: 'boolean', defaultValue: true },
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
        
        /* Shape Classes for Crop Mask */
        .shape-mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .crop-box.circle {
          border-radius: 50%;
        }
        
        .crop-box.rounded-square {
          border-radius: 15%;
        }
        
        .crop-box.rounded-rectangle {
          border-radius: 10%;
        }
        
        /* Hide default crop box border when using SVG shapes */
        .crop-box.custom-shape {
          border: none;
        }
        
        /* Shape Gallery */
        .shapes-gallery {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          max-height: 220px;
          overflow-y: auto;
          padding: 8px 0;
          margin-top: 8px;
        }
        
        .shape-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: all 0.2s;
          background: #f5f5f5;
          border: 1px solid #ddd;
        }
        
        .shape-item:hover {
          background-color: #e5e5e5;
        }
        
        .shape-item.active {
          background-color: #0078d4;
          border-color: #0078d4;
          color: white;
        }
        
        .shape-preview {
          width: 40px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .shape-preview svg {
          width: 36px;
          height: 36px;
          fill: currentColor;
        }
        
        .shape-name {
          font-size: 11px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
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
        
        /* Advanced Resize Controls */
        .advanced-resize-container {
          border-top: 1px solid #eee;
          padding-top: 16px;
          margin-top: 8px;
          width: 100%;
        }
        
        .output-dimension-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .output-dimensions-group {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }
        
        .dimension-input-group {
          display: flex;
          flex-direction: column;
        }
        
        .dimension-input-group label {
          font-size: 12px;
          margin-bottom: 4px;
          color: #666;
        }
        
        .dimension-input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .maintain-ratio-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 10px 0;
        }
        
        .maintain-ratio-checkbox input {
          margin: 0;
        }
        
        .maintain-ratio-checkbox label {
          font-size: 13px;
          color: #333;
        }
        
        .resize-presets-container {
          margin-top: 12px;
        }
        
        .resize-presets-container h5 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #666;
          font-weight: normal;
        }
        
        .resize-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .resize-quality-options {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        
        .toggle-advanced-resize {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding: 4px 0;
          user-select: none;
        }
        
        .toggle-advanced-resize svg {
          transition: transform 0.3s;
          width: 16px;
          height: 16px;
        }
        
        .toggle-advanced-resize.collapsed svg {
          transform: rotate(-90deg);
        }
        
        .advanced-resize-controls {
          overflow: hidden;
          max-height: 1000px;
          transition: max-height 0.3s ease-in-out;
        }
        
        .advanced-resize-controls.collapsed {
          max-height: 0;
        }
        
        .output-size-preview {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .controls-panel {
            flex-direction: column;
            gap: 12px;
          }
          
          .control-group {
            width: 100%;
          }
          
          .output-dimensions-group {
            flex-direction: column;
            align-items: flex-start;
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
                <div class="shape-mask"></div>
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
              <h4>Crop Shape</h4>
              <div class="shapes-gallery">
                <div class="shape-item active" data-shape="rectangle">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" fill="currentColor" /></svg>
                  </div>
                  <div class="shape-name">Rectangle</div>
                </div>
                <div class="shape-item" data-shape="circle">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
                  </div>
                  <div class="shape-name">Circle</div>
                </div>
                <div class="shape-item" data-shape="rounded-square">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="currentColor" /></svg>
                  </div>
                  <div class="shape-name">Rounded</div>
                </div>
                <div class="shape-item" data-shape="heart">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Heart</div>
                </div>
                <div class="shape-item" data-shape="star">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Star</div>
                </div>
                <div class="shape-item" data-shape="hexagon">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Hexagon</div>
                </div>
                <div class="shape-item" data-shape="triangle">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M1,21H23L12,2L1,21Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Triangle</div>
                </div>
                <div class="shape-item" data-shape="diamond">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M12,2L22,12L12,22L2,12L12,2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Diamond</div>
                </div>
                <div class="shape-item" data-shape="pentagon">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M12,2.5L2,9.8L5.8,21.5H18.2L22,9.8L12,2.5Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Pentagon</div>
                </div>
                <div class="shape-item" data-shape="octagon">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M7.86,2L16.14,2L22,7.86L22,16.14L16.14,22L7.86,22L2,16.14L2,7.86L7.86,2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Octagon</div>
                </div>
                <div class="shape-item" data-shape="badge">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M12,1L15.36,8.48L23,9.69L17.5,15.51L18.96,23L12,19.54L5.04,23L6.5,15.51L1,9.69L8.64,8.48L12,1Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Badge</div>
                </div>
                <div class="shape-item" data-shape="cross">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M16,4L16,8L20,8L20,16L16,16L16,20L8,20L8,16L4,16L4,8L8,8L8,4L16,4Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Cross</div>
                </div>
                <div class="shape-item" data-shape="leaf">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,7.25 9,8.23V6C9,6 16,3 22,2C22,2 19,12.5 17,8Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Leaf</div>
                </div>
                <div class="shape-item" data-shape="speech-bubble">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Bubble</div>
                </div>
                <div class="shape-item" data-shape="thought-bubble">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M3,7H9V13H3V7M13,7H19V13H13V7M3,3H9V5H3V3M13,3H19V5H13V3M3,15H9V17H3V15M13,15H19V17H13V15M3,19H9V21H3V19M13,19H19V21H13V19Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Thought</div>
                </div>
                <div class="shape-item" data-shape="puzzle">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M20.5,11H19V7C19,5.89 18.1,5 17,5H13V3.5A2.5,2.5 0 0,0 10.5,1A2.5,2.5 0 0,0 8,3.5V5H4A2,2 0 0,0 2,7V10.8H3.5C5,10.8 6.2,12 6.2,13.5C6.2,15 5,16.2 3.5,16.2H2V20A2,2 0 0,0 4,22H7.8V20.5C7.8,19 9,17.8 10.5,17.8C12,17.8 13.2,19 13.2,20.5V22H17A2,2 0 0,0 19,20V16H20.5A2.5,2.5 0 0,0 23,13.5A2.5,2.5 0 0,0 20.5,11Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Puzzle</div>
                </div>
                <div class="shape-item" data-shape="camera">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M20,4H16.83L15,2H9L7.17,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V6H8.05L9.88,4H14.12L15.95,6H20V18M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Camera</div>
                </div>
                <div class="shape-item" data-shape="cloud">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Cloud</div>
                </div>
                <div class="shape-item" data-shape="wave">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M2,6C2.64,6.26 3.27,6.44 3.81,6.88C4.77,7.65 5,9 5,9H6C6,9 5.5,7.5 7,7.5C8.5,7.5 8,9 8,9H9C9,9 9,7 11,7C13,7 13,9 13,9H14C14,9 12.5,5 16,5C19.5,5 18,9 18,9H19C19,9 19.33,7.67 20.67,6.88C21.13,6.59 21.7,6.27 22.33,6L21.9,7.38C21.64,7.81 21.23,8.15 20.75,8.36C19.34,9 18,9 18,9H17C17,9 18,11 15,11C12,11 12,9 12,9H11C11,9 11.38,10.47 10,10.91C8.93,11.25 8,10.56 8,9H7C7,9 7,11 4.5,11C2.67,11 2.33,9 2.33,9H2V6Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Wave</div>
                </div>
                <div class="shape-item" data-shape="frame">
                  <div class="shape-preview">
                    <svg viewBox="0 0 24 24">
                      <path d="M18,2H6C4.9,2 4,2.9 4,4V20C4,21.1 4.9,22 6,22H18C19.1,22 20,21.1 20,20V4C20,2.9 19.1,2 18,2M18,20H6V4H18V20M16,6H8V8H16V6M16,10H8V12H16V10M14,16H8V18H14V16Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="shape-name">Frame</div>
                </div>
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
            
            <!-- Advanced Resize Controls -->
            <div class="control-group" style="width: 100%;">
              <div class="toggle-advanced-resize">
                <h4>Advanced Resize</h4>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              
              <div class="advanced-resize-controls">
                <div class="output-dimensions-group">
                  <div class="dimension-input-group">
                    <label for="outputWidth">Output Width (px)</label>
                    <input type="number" id="outputWidth" class="dimension-input" min="1" placeholder="Auto">
                  </div>
                  
                  <div class="dimension-input-group">
                    <label for="outputHeight">Output Height (px)</label>
                    <input type="number" id="outputHeight" class="dimension-input" min="1" placeholder="Auto">
                  </div>
                  
                  <button class="control-btn" id="applyDimensions">Apply</button>
                </div>
                
                <div class="maintain-ratio-checkbox">
                  <input type="checkbox" id="maintainRatio" checked>
                  <label for="maintainRatio">Maintain aspect ratio</label>
                </div>
                
                <div class="output-size-preview">
                  Cropped size: <span id="cropSizeInfo">0 × 0</span> px
                  <br>
                  Output size: <span id="outputSizeInfo">0 × 0</span> px
                </div>
                
                <div class="resize-presets-container">
                  <h5>Preset Dimensions</h5>
                  <div class="resize-presets">
                    <button class="control-btn preset-btn" data-width="1200" data-height="628">Facebook Post</button>
                    <button class="control-btn preset-btn" data-width="1080" data-height="1080">Instagram</button>
                    <button class="control-btn preset-btn" data-width="1200" data-height="675">Twitter</button>
                    <button class="control-btn preset-btn" data-width="1280" data-height="720">HD (720p)</button>
                    <button class="control-btn preset-btn" data-width="1920" data-height="1080">Full HD</button>
                    <button class="control-btn preset-btn" data-width="2048" data-height="1152">2K</button>
                  </div>
                </div>
                
                <div class="resize-quality-container">
                  <h5>Resize Quality</h5>
                  <div class="resize-quality-options">
                    <button class="control-btn quality-btn" data-quality="low">Low</button>
                    <button class="control-btn quality-btn active" data-quality="medium">Medium</button>
                    <button class="control-btn quality-btn" data-quality="high">High</button>
                  </div>
                </div>
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
    const shapeItems = this.shadowRoot.querySelectorAll('.shape-item');
    
    // Advanced resize elements
    const toggleAdvancedResize = this.shadowRoot.querySelector('.toggle-advanced-resize');
    const advancedResizeControls = this.shadowRoot.querySelector('.advanced-resize-controls');
    const outputWidth = this.shadowRoot.querySelector('#outputWidth');
    const outputHeight = this.shadowRoot.querySelector('#outputHeight');
    const maintainRatio = this.shadowRoot.querySelector('#maintainRatio');
    const applyDimensions = this.shadowRoot.querySelector('#applyDimensions');
    const presetButtons = this.shadowRoot.querySelectorAll('.preset-btn');
    const qualityButtons = this.shadowRoot.querySelectorAll('.quality-btn');
    const cropSizeInfo = this.shadowRoot.querySelector('#cropSizeInfo');
    const outputSizeInfo = this.shadowRoot.querySelector('#outputSizeInfo');
    
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
    
    // Shape selection
    shapeItems.forEach(item => {
      item.addEventListener('click', () => {
        shapeItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const shape = item.getAttribute('data-shape');
        this.setShape(shape);
      });
    });
    
    // Advanced resize events
    toggleAdvancedResize.addEventListener('click', () => {
      toggleAdvancedResize.classList.toggle('collapsed');
      advancedResizeControls.classList.toggle('collapsed');
    });
    
    // Update size info on crop box changes
    this.shadowRoot.addEventListener('mousemove', () => {
      if (this.image) {
        this.updateSizeInfo();
      }
    });
    
    this.shadowRoot.addEventListener('touchmove', () => {
      if (this.image) {
        this.updateSizeInfo();
      }
    });
    
    // Maintain aspect ratio when changing dimensions
    outputWidth.addEventListener('input', () => {
      if (maintainRatio.checked && outputWidth.value && this.cropBox.width > 0 && this.cropBox.height > 0) {
        const aspectRatio = this.cropBox.width / this.cropBox.height;
        const newWidth = parseInt(outputWidth.value);
        
        if (!isNaN(newWidth) && newWidth > 0) {
          outputHeight.value = Math.round(newWidth / aspectRatio);
          this.updateSizeInfo();
        }
      }
    });
    
    outputHeight.addEventListener('input', () => {
      if (maintainRatio.checked && outputHeight.value && this.cropBox.width > 0 && this.cropBox.height > 0) {
        const aspectRatio = this.cropBox.width / this.cropBox.height;
        const newHeight = parseInt(outputHeight.value);
        
        if (!isNaN(newHeight) && newHeight > 0) {
          outputWidth.value = Math.round(newHeight * aspectRatio);
          this.updateSizeInfo();
        }
      }
    });
    
    // Apply output dimensions
    applyDimensions.addEventListener('click', () => {
      const width = parseInt(outputWidth.value);
      const height = parseInt(outputHeight.value);
      
      if ((width > 0 && height > 0) || (width > 0 && !height) || (!width && height > 0)) {
        this.outputWidth = width || null;
        this.outputHeight = height || null;
        this.updateSizeInfo();
      } else {
        // Reset to null if both are invalid
        this.outputWidth = null;
        this.outputHeight = null;
        outputWidth.value = '';
        outputHeight.value = '';
        this.updateSizeInfo();
      }
    });
    
    // Preset dimension buttons
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const width = parseInt(btn.getAttribute('data-width'));
        const height = parseInt(btn.getAttribute('data-height'));
        
        outputWidth.value = width;
        outputHeight.value = height;
        
        this.outputWidth = width;
        this.outputHeight = height;
        
        // If maintain ratio is checked, and we have a crop box, adjust the crop box
        if (maintainRatio.checked && this.cropBox.width > 0 && this.cropBox.height > 0) {
          const targetRatio = width / height;
          
          // Set the aspect ratio to match the preset
          this.setAspectRatio(`${width}:${height}`);
          
          // Update custom ratio inputs
          customWidth.value = width;
          customHeight.value = height;
          
          // Update aspect ratio buttons
          aspectButtons.forEach(b => b.classList.remove('active'));
        }
        
        this.updateSizeInfo();
      });
    });
    
    // Quality buttons
    qualityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        qualityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.resizeQuality = btn.getAttribute('data-quality');
      });
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
          this.updateSizeInfo();
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
          this.updateSizeInfo();
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
          this.updateSizeInfo();
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
          this.updateSizeInfo();
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
    
    // Apply initial shape if specified
    const defaultShape = this.getAttribute('defaultShape') || 'rectangle';
    if (defaultShape !== 'rectangle') {
      this.setShape(defaultShape);
      
      // Update shape button UI
      const shapeItems = this.shadowRoot.querySelectorAll('.shape-item');
      shapeItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-shape') === defaultShape);
      });
    }
    
    // Set initial output dimensions to match the crop box
    const outputWidth = this.shadowRoot.querySelector('#outputWidth');
    const outputHeight = this.shadowRoot.querySelector('#outputHeight');
    
    outputWidth.value = Math.round(this.cropBox.width);
    outputHeight.value = Math.round(this.cropBox.height);
    
    this.outputWidth = Math.round(this.cropBox.width);
    this.outputHeight = Math.round(this.cropBox.height);
    
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
    
    // Update size info
    this.updateSizeInfo();
  }

  updateSizeInfo() {
    if (!this.image) return;
    
    const cropSizeInfo = this.shadowRoot.querySelector('#cropSizeInfo');
    const outputSizeInfo = this.shadowRoot.querySelector('#outputSizeInfo');
    
    // Update cropped size info
    const cropWidth = Math.round(this.cropBox.width);
    const cropHeight = Math.round(this.cropBox.height);
    cropSizeInfo.textContent = `${cropWidth} × ${cropHeight}`;
    
    // Update output size info
    const outputWidth = this.outputWidth || cropWidth;
    const outputHeight = this.outputHeight || cropHeight;
    outputSizeInfo.textContent = `${outputWidth} × ${outputHeight}`;
    
    // Update actual output input fields if they're empty
    const outputWidthInput = this.shadowRoot.querySelector('#outputWidth');
    const outputHeightInput = this.shadowRoot.querySelector('#outputHeight');
    
    if (!outputWidthInput.value) {
      outputWidthInput.value = cropWidth;
    }
    
    if (!outputHeightInput.value) {
      outputHeightInput.value = cropHeight;
    }
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
      
      // Update size information
      this.updateSizeInfo();
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
      
      // Update shape mask if it's a custom shape
      if (this.currentShape !== 'rectangle') {
        this.updateShapeMask();
      }
    }
  }
  
  /**
   * Sets the crop shape and updates the UI
   */
  setShape(shape) {
    this.currentShape = shape;
    
    const cropBox = this.shadowRoot.querySelector('.crop-box');
    
    // Remove all existing shape classes
    cropBox.classList.remove('rectangle', 'circle', 'rounded-square', 'rounded-rectangle', 'custom-shape');
    
    // Add the appropriate class or generate SVG mask
    if (['circle', 'rounded-square', 'rounded-rectangle'].includes(shape)) {
      cropBox.classList.add(shape);
    } else if (shape !== 'rectangle') {
      cropBox.classList.add('custom-shape');
      this.updateShapeMask();
    }
    
    // If it's a circle, make sure the aspect ratio is 1:1
    if (shape === 'circle') {
      // Set aspect ratio to 1:1
      const aspectButtons = this.shadowRoot.querySelectorAll('[data-aspect]');
      aspectButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-aspect') === '1:1');
      });
      this.setAspectRatio('1:1');
    }
  }
  
  /**
   * Updates the SVG shape mask based on the current shape selection
   */
  updateShapeMask() {
    const shapeMask = this.shadowRoot.querySelector('.shape-mask');
    if (!shapeMask) return;
    
    // Clear existing content
    shapeMask.innerHTML = '';
    
    // If it's a basic shape handled by CSS, don't add SVG
    if (['rectangle', 'circle', 'rounded-square', 'rounded-rectangle'].includes(this.currentShape)) {
      return;
    }
    
    const width = this.cropBox.width;
    const height = this.cropBox.height;
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    
    // Add path or shape based on the selected shape
    let path;
    
    switch (this.currentShape) {
      case 'heart':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${width/2},${height*0.15} C${width*0.2},${height*-0.1} ${width*-0.3},${height*0.4} ${width/2},${height*0.85} C${width*1.3},${height*0.4} ${width*0.8},${height*-0.1} ${width/2},${height*0.15} Z`);
        break;
      case 'star':
        // 5-point star
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        const centerX = width / 2;
        const centerY = height / 2;
        let points = '';
        
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = Math.PI * i / 5 - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          points += `${x},${y} `;
        }
        
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        path.setAttribute('points', points);
        break;
      case 'hexagon':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const hexRadius = Math.min(width, height) / 2;
        let hexPoints = '';
        
        for (let i = 0; i < 6; i++) {
          const angle = 2 * Math.PI / 6 * i;
          const x = width / 2 + hexRadius * Math.cos(angle);
          const y = height / 2 + hexRadius * Math.sin(angle);
          hexPoints += `${x},${y} `;
        }
        
        path.setAttribute('points', hexPoints);
        break;
      case 'triangle':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        path.setAttribute('points', `${width/2},0 0,${height} ${width},${height}`);
        break;
      case 'diamond':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        path.setAttribute('points', `${width/2},0 ${width},${height/2} ${width/2},${height} 0,${height/2}`);
        break;
      case 'pentagon':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const pentRadius = Math.min(width, height) / 2;
        let pentPoints = '';
        
        for (let i = 0; i < 5; i++) {
          const angle = 2 * Math.PI / 5 * i - Math.PI / 2;
          const x = width / 2 + pentRadius * Math.cos(angle);
          const y = height / 2 + pentRadius * Math.sin(angle);
          pentPoints += `${x},${y} `;
        }
        
        path.setAttribute('points', pentPoints);
        break;
      case 'octagon':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const octRadius = Math.min(width, height) / 2;
        let octPoints = '';
        
        for (let i = 0; i < 8; i++) {
          const angle = 2 * Math.PI / 8 * i;
          const x = width / 2 + octRadius * Math.cos(angle);
          const y = height / 2 + octRadius * Math.sin(angle);
          octPoints += `${x},${y} `;
        }
        
        path.setAttribute('points', octPoints);
        break;
      // Additional shapes can be added here with their SVG path or polygon definitions
      default:
        // Default to a rectangle if shape is not recognized
        path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        path.setAttribute('x', '0');
        path.setAttribute('y', '0');
        path.setAttribute('width', width);
        path.setAttribute('height', height);
        break;
    }
    
    // Set common attributes
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#0078d4');
    path.setAttribute('stroke-width', '3');
    
    // Add shape to SVG
    svg.appendChild(path);
    
    // Add SVG to mask container
    shapeMask.appendChild(svg);
  }
  
  /**
   * Applies a clipping path to the provided context based on the shape
   */
  applyShapeClipPath(ctx, shape, width, height) {
    ctx.beginPath();
    
    switch (shape) {
      case 'circle':
        const radius = Math.min(width, height) / 2;
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        break;
      case 'rounded-square':
        const cornerRadius = Math.min(width, height) * 0.15;
        ctx.moveTo(cornerRadius, 0);
        ctx.lineTo(width - cornerRadius, 0);
        ctx.arcTo(width, 0, width, cornerRadius, cornerRadius);
        ctx.lineTo(width, height - cornerRadius);
        ctx.arcTo(width, height, width - cornerRadius, height, cornerRadius);
        ctx.lineTo(cornerRadius, height);
        ctx.arcTo(0, height, 0, height - cornerRadius, cornerRadius);
        ctx.lineTo(0, cornerRadius);
        ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
        break;
      case 'rounded-rectangle':
        const rectCornerRadius = Math.min(width, height) * 0.1;
        ctx.moveTo(rectCornerRadius, 0);
        ctx.lineTo(width - rectCornerRadius, 0);
        ctx.arcTo(width, 0, width, rectCornerRadius, rectCornerRadius);
        ctx.lineTo(width, height - rectCornerRadius);
        ctx.arcTo(width, height, width - rectCornerRadius, height, rectCornerRadius);
        ctx.lineTo(rectCornerRadius, height);
        ctx.arcTo(0, height, 0, height - rectCornerRadius, rectCornerRadius);
        ctx.lineTo(0, rectCornerRadius);
        ctx.arcTo(0, 0, rectCornerRadius, 0, rectCornerRadius);
        break;
      case 'heart':
        // Heart shape
        ctx.moveTo(width / 2, height * 0.15);
        ctx.bezierCurveTo(width * 0.2, height * -0.1, width * -0.3, height * 0.4, width / 2, height * 0.85);
        ctx.bezierCurveTo(width * 1.3, height * 0.4, width * 0.8, height * -0.1, width / 2, height * 0.15);
        break;
      case 'star':
        // 5-point star
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = Math.PI * i / 5 - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      case 'hexagon':
        const hexRadius = Math.min(width, height) / 2;
        
        for (let i = 0; i < 6; i++) {
          const angle = 2 * Math.PI / 6 * i;
          const x = width / 2 + hexRadius * Math.cos(angle);
          const y = height / 2 + hexRadius * Math.sin(angle);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(0, height);
        ctx.lineTo(width, height);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width / 2, height);
        ctx.lineTo(0, height / 2);
        ctx.closePath();
        break;
      case 'pentagon':
        const pentRadius = Math.min(width, height) / 2;
        
        for (let i = 0; i < 5; i++) {
          const angle = 2 * Math.PI / 5 * i - Math.PI / 2;
          const x = width / 2 + pentRadius * Math.cos(angle);
          const y = height / 2 + pentRadius * Math.sin(angle);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      case 'octagon':
        const octRadius = Math.min(width, height) / 2;
        
        for (let i = 0; i < 8; i++) {
          const angle = 2 * Math.PI / 8 * i;
          const x = width / 2 + octRadius * Math.cos(angle);
          const y = height / 2 + octRadius * Math.sin(angle);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      // Add more shape cases here as needed
      default:
        // Default rectangle shape
        ctx.rect(0, 0, width, height);
        break;
    }
    
    // Apply the clip path
    ctx.clip();
    ctx.save();
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
      
      // Update size info
      this.updateSizeInfo();
      
      // Update output dimensions if "maintain ratio" is checked
      const maintainRatio = this.shadowRoot.querySelector('#maintainRatio');
      if (maintainRatio.checked) {
        // Set output dimensions to match new crop box dimensions
        const outputWidth = this.shadowRoot.querySelector('#outputWidth');
        const outputHeight = this.shadowRoot.querySelector('#outputHeight');
        
        if (this.outputWidth && this.outputHeight) {
          // If output dimensions are already set, adjust them to maintain the new aspect ratio
          this.outputHeight = Math.round(this.outputWidth / aspectRatio);
          outputHeight.value = this.outputHeight;
        } else {
          // Otherwise set them to match the crop box
          outputWidth.value = Math.round(this.cropBox.width);
          outputHeight.value = Math.round(this.cropBox.height);
          this.outputWidth = Math.round(this.cropBox.width);
          this.outputHeight = Math.round(this.cropBox.height);
        }
        
        this.updateSizeInfo();
      }
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
      this.updateSizeInfo();
    } else if (this.isResizing) {
      this.resize(e);
      this.updateSizeInfo();
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
        this.updateSizeInfo();
      } else if (this.isResizing) {
        this.resize(moveEvent);
        this.updateSizeInfo();
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
    
    // Update output dimensions if maintain ratio is checked
    const maintainRatio = this.shadowRoot.querySelector('#maintainRatio');
    if (maintainRatio.checked) {
      const outputWidth = this.shadowRoot.querySelector('#outputWidth');
      const outputHeight = this.shadowRoot.querySelector('#outputHeight');
      
      if (this.outputWidth && this.outputHeight) {
        // Calculate the aspect ratio of the current crop box
        const aspectRatio = this.cropBox.width / this.cropBox.height;
        
        // Decide which dimension to keep fixed based on which was changed last
        if (this.lastChangedDimension === 'width') {
          this.outputHeight = Math.round(this.outputWidth / aspectRatio);
          outputHeight.value = this.outputHeight;
        } else {
          this.outputWidth = Math.round(this.outputHeight * aspectRatio);
          outputWidth.value = this.outputWidth;
        }
        
        this.updateSizeInfo();
      }
    }
  }

  constrainCropBox() {
    const canvas = this.shadowRoot.querySelector('#cropCanvas');
    
    // Ensure crop box doesn't go outside canvas
    if (this.cropBox.x < 0) this.cropBox.x = 0;
    if (this.cropBox.y < 0) this.cropBox.y = 0;
    
    // Ensure crop box doesn't exceed canvas size
    if (this.cropBox.x + this.cropBox.width > canvas.width) {
      if (this.currentAspectRatio) {
        // If aspect ratio is locked, we need to reduce the size to fit
        const [width, height] = this.currentAspectRatio.split(':').map(Number);
        const aspectRatio = width / height;
        
        this.cropBox.width = canvas.width - this.cropBox.x;
        this.cropBox.height = this.cropBox.width / aspectRatio;
        
        // Check if this causes the height to exceed canvas height, if so adjust again
        if (this.cropBox.y + this.cropBox.height > canvas.height) {
          this.cropBox.height = canvas.height - this.cropBox.y;
          this.cropBox.width = this.cropBox.height * aspectRatio;
          this.cropBox.x = canvas.width - this.cropBox.width;
        }
      } else {
        this.cropBox.x = canvas.width - this.cropBox.width;
      }
    }
    
    if (this.cropBox.y + this.cropBox.height > canvas.height) {
      if (this.currentAspectRatio) {
        // If aspect ratio is locked, we may need to adjust the width too
        const [width, height] = this.currentAspectRatio.split(':').map(Number);
        const aspectRatio = width / height;
        
        this.cropBox.height = canvas.height - this.cropBox.y;
        this.cropBox.width = this.cropBox.height * aspectRatio;
        
        // Check if this causes the width to exceed canvas width, if so adjust again
        if (this.cropBox.x + this.cropBox.width > canvas.width) {
          this.cropBox.width = canvas.width - this.cropBox.x;
          this.cropBox.height = this.cropBox.width / aspectRatio;
          this.cropBox.y = canvas.height - this.cropBox.height;
        }
      } else {
        this.cropBox.y = canvas.height - this.cropBox.height;
      }
    }
  }

  getCroppedImage() {
    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    
    // Set initial dimensions of the output canvas to match the crop box
    let outputWidth = this.cropBox.width;
    let outputHeight = this.cropBox.height;
    
    // If output dimensions are specified, use those instead
    if (this.outputWidth && this.outputHeight) {
      outputWidth = this.outputWidth;
      outputHeight = this.outputHeight;
    } else if (this.outputWidth) {
      // Only width specified, calculate height to maintain aspect ratio
      const aspectRatio = this.cropBox.width / this.cropBox.height;
      outputHeight = this.outputWidth / aspectRatio;
    } else if (this.outputHeight) {
      // Only height specified, calculate width to maintain aspect ratio
      const aspectRatio = this.cropBox.width / this.cropBox.height;
      outputWidth = this.outputHeight * aspectRatio;
    }
    
    croppedCanvas.width = outputWidth;
    croppedCanvas.height = outputHeight;
    
    // Get the source canvas
    const sourceCanvas = this.shadowRoot.querySelector('#cropCanvas');
    
    // First create a temporary canvas with the cropped area
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = this.cropBox.width;
    tempCanvas.height = this.cropBox.height;
    
    // Draw the cropped portion to the temp canvas
    tempCtx.drawImage(
      sourceCanvas,
      this.cropBox.x, this.cropBox.y, this.cropBox.width, this.cropBox.height,
      0, 0, this.cropBox.width, this.cropBox.height
    );
    
    // If using a custom shape, apply the clipping mask
    if (this.currentShape !== 'rectangle') {
      // Create another temp canvas for the shape masking
      const maskedCanvas = document.createElement('canvas');
      const maskedCtx = maskedCanvas.getContext('2d');
      
      maskedCanvas.width = this.cropBox.width;
      maskedCanvas.height = this.cropBox.height;
      
      // Apply the shape clipping path
      this.applyShapeClipPath(maskedCtx, this.currentShape, this.cropBox.width, this.cropBox.height);
      
      // Draw the cropped image using the clipping path
      maskedCtx.drawImage(tempCanvas, 0, 0);
      
      // Use the masked canvas for the final resize
      tempCanvas.width = maskedCanvas.width;
      tempCanvas.height = maskedCanvas.height;
      tempCtx.drawImage(maskedCanvas, 0, 0);
    }
    
    // Apply high-quality resize algorithm if specified
    if (this.resizeQuality === 'high' && 
        (outputWidth !== this.cropBox.width || outputHeight !== this.cropBox.height)) {
      // Apply high-quality resizing to the already cropped (and potentially masked) image
      this.highQualityResize(tempCanvas, croppedCanvas);
    } else {
      // Standard resize (medium/low quality)
      ctx.imageSmoothingEnabled = this.resizeQuality !== 'low';
      ctx.imageSmoothingQuality = this.resizeQuality === 'medium' ? 'medium' : 'low';
      
      // Draw the prepared image with resizing
      ctx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
    }
    
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
    
    const sizeInfo = document.createElement('div');
    sizeInfo.textContent = `${outputWidth} × ${outputHeight} px`;
    sizeInfo.style.fontSize = '10px';
    sizeInfo.style.marginBottom = '5px';
    sizeInfo.style.color = '#666';
    
    const previewImg = document.createElement('img');
    previewImg.style.maxWidth = '150px';
    previewImg.style.maxHeight = '100px';
    previewImg.style.display = 'block';
    
    previewContainer.appendChild(previewLabel);
    previewContainer.appendChild(sizeInfo);
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

  // High-quality resizing algorithm using multiple passes
  highQualityResize(sourceCanvas, targetCanvas) {
    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    const targetWidth = targetCanvas.width;
    const targetHeight = targetCanvas.height;
    
    // If target is larger than source, just use direct scaling
    if (targetWidth > sourceWidth && targetHeight > sourceHeight) {
      const ctx = targetCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      return;
    }
    
    // Calculate the number of steps for progressive scaling
    const scaleFactor = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const steps = Math.ceil(Math.log(scaleFactor) / Math.log(0.5));
    
    // Create temporary canvas for multi-step downsampling
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sourceWidth;
    tempCanvas.height = sourceHeight;
    tempCtx.drawImage(sourceCanvas, 0, 0);
    
    // Progressive downsampling
    for (let i = 0; i < steps; i++) {
      const stepWidth = i === steps - 1 ? targetWidth : Math.round(sourceWidth * Math.pow(0.5, i + 1));
      const stepHeight = i === steps - 1 ? targetHeight : Math.round(sourceHeight * Math.pow(0.5, i + 1));
      
      const nextCanvas = document.createElement('canvas');
      const nextCtx = nextCanvas.getContext('2d');
      nextCanvas.width = stepWidth;
      nextCanvas.height = stepHeight;
      
      // Apply Lanczos or bilinear filtering via browser's built-in scaling
      nextCtx.imageSmoothingEnabled = true;
      nextCtx.imageSmoothingQuality = 'high';
      nextCtx.drawImage(tempCanvas, 0, 0, stepWidth, stepHeight);
      
      // Replace temp canvas with the new scaled version
      tempCanvas = nextCanvas;
      tempCtx = nextCtx;
    }
    
    // Draw final result to target canvas
    const targetCtx = targetCanvas.getContext('2d');
    targetCtx.drawImage(tempCanvas, 0, 0);
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
    
    // Include output dimensions in filename
    let outputWidth = this.cropBox.width;
    let outputHeight = this.cropBox.height;
    
    if (this.outputWidth && this.outputHeight) {
      outputWidth = this.outputWidth;
      outputHeight = this.outputHeight;
    } else if (this.outputWidth) {
      const aspectRatio = this.cropBox.width / this.cropBox.height;
      outputHeight = Math.round(this.outputWidth / aspectRatio);
    } else if (this.outputHeight) {
      const aspectRatio = this.cropBox.width / this.cropBox.height;
      outputWidth = Math.round(this.outputHeight * aspectRatio);
    }
    
    link.download = `cropped-image-${outputWidth}x${outputHeight}-${Date.now()}.${fileExtension}`;
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
    this.currentShape = 'rectangle';
    
    // Reset advanced resize options
    this.outputWidth = null;
    this.outputHeight = null;
    this.resizeQuality = 'high';
    
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
    
    // Reset shape buttons
    const shapeItems = this.shadowRoot.querySelectorAll('.shape-item');
    shapeItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-shape') === 'rectangle');
    });
    
    // Reset crop box classes and SVG shape mask
    const cropBox = this.shadowRoot.querySelector('.crop-box');
    cropBox.className = 'crop-box';
    const shapeMask = this.shadowRoot.querySelector('.shape-mask');
    shapeMask.innerHTML = '';
    
    // Reset advanced resize controls
    this.shadowRoot.querySelector('#outputWidth').value = '';
    this.shadowRoot.querySelector('#outputHeight').value = '';
    this.shadowRoot.querySelector('#maintainRatio').checked = true;
    
    // Reset quality buttons
    const qualityButtons = this.shadowRoot.querySelectorAll('.quality-btn');
    qualityButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-quality') === 'high');
    });
    
    // Reset advanced resize toggle if it was open
    const toggleAdvancedResize = this.shadowRoot.querySelector('.toggle-advanced-resize');
    const advancedResizeControls = this.shadowRoot.querySelector('.advanced-resize-controls');
    
    if (!toggleAdvancedResize.classList.contains('collapsed')) {
      toggleAdvancedResize.classList.add('collapsed');
      advancedResizeControls.classList.add('collapsed');
    }
  }
}

// Register the custom element
customElements.define('wix-image-cropper', WixImageCropper);
