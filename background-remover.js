// File name: background-remover.js
// Custom Element Tag: <background-remover></background-remover>

class BackgroundRemover extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.originalImage = null;
    this.processedImage = null;
    this.isProcessing = false;
    this.tolerance = 30; // Default color tolerance (0-100)
    this.smoothing = 1; // Default edge smoothing (0-5)
    this.sampling = 5; // Default color sampling points (1-10)
    
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          max-width: 100%;
          margin: 0 auto;
        }
        
        .container {
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background-color: #fff;
        }
        
        h2 {
          color: #333;
          margin-top: 0;
          text-align: center;
        }
        
        .upload-area {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          margin-bottom: 20px;
          background-color: #f9f9f9;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .upload-area:hover, .upload-area.drag-over {
          border-color: #4285f4;
          background-color: #f0f7ff;
        }
        
        .upload-icon {
          font-size: 48px;
          color: #ccc;
          margin-bottom: 10px;
        }
        
        .btn {
          background-color: #4285f4;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: background-color 0.3s;
          margin: 5px;
        }
        
        .btn:hover {
          background-color: #3367d6;
        }
        
        .btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .hidden {
          display: none !important;
        }
        
        .images-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .image-container {
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 10px;
          text-align: center;
        }
        
        img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 4px;
          object-fit: contain;
        }
        
        .preview-bg {
          background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          border-radius: 4px;
        }
        
        .controls {
          margin-top: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        
        .slider-container {
          margin-bottom: 15px;
        }
        
        .slider-container label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        input[type="range"] {
          width: 100%;
        }
        
        input[type="file"] {
          display: none;
        }
        
        #status {
          margin-top: 10px;
          font-style: italic;
          color: #666;
          text-align: center;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #4285f4;
          animation: spin 1s linear infinite;
          display: inline-block;
          vertical-align: middle;
          margin-right: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .processing {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .download-btn {
          background-color: #0f9d58;
          margin-top: 10px;
        }
        
        .download-btn:hover {
          background-color: #0b8043;
        }
        
        .advanced-toggle {
          color: #4285f4;
          text-decoration: underline;
          cursor: pointer;
          margin-top: 15px;
          display: inline-block;
        }
        
        #eyedropper {
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        
        #color-preview {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid #ccc;
          margin-right: 10px;
          background-color: #ffffff;
        }
        
        .bg-options {
          margin-top: 15px;
        }
        
        .bg-option {
          display: inline-block;
          width: 30px;
          height: 30px;
          border-radius: 4px;
          margin-right: 10px;
          cursor: pointer;
          border: 2px solid #ccc;
        }
        
        .bg-option.active {
          border-color: #4285f4;
        }
        
        .transparent-bg {
          background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        
        .button-group {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 15px;
        }
      </style>
      
      <div class="container">
        <h2>Background Remover</h2>
        <p id="status">Ready! Upload an image to begin.</p>
        
        <div class="upload-area" id="drop-area">
          <div class="upload-icon">📁</div>
          <p>Drag & drop your image here or</p>
          <button class="btn" id="upload-btn">Upload Image</button>
          <input type="file" id="file-input" accept="image/*">
        </div>
        
        <div class="images-container hidden" id="images-container">
          <div class="image-container">
            <h3>Original</h3>
            <img id="original-image" src="#" alt="Original image">
            <canvas id="color-canvas" style="display: none;"></canvas>
          </div>
          <div class="image-container">
            <h3>Processed</h3>
            <div class="preview-bg">
              <img id="processed-image" src="#" alt="Processed image">
            </div>
            <div>
              <button class="btn download-btn" id="download-btn" disabled>Download</button>
            </div>
          </div>
        </div>
        
        <div class="controls hidden" id="controls">
          <div id="eyedropper">
            <div id="color-preview"></div>
            <button class="btn" id="pick-color-btn">Pick Background Color</button>
            <span id="color-value" style="margin-left: 10px;">#FFFFFF</span>
          </div>
          
          <div class="advanced-toggle" id="advanced-toggle">Show Advanced Options</div>
          
          <div class="advanced-options hidden" id="advanced-options">
            <div class="slider-container">
              <label for="tolerance-slider">Color Tolerance: <span id="tolerance-value">30</span></label>
              <input type="range" id="tolerance-slider" min="0" max="100" value="30">
            </div>
            
            <div class="slider-container">
              <label for="smoothing-slider">Edge Smoothing: <span id="smoothing-value">1</span></label>
              <input type="range" id="smoothing-slider" min="0" max="5" value="1" step="0.5">
            </div>
            
            <div class="slider-container">
              <label for="sampling-slider">ColorSampling Points: <span id="sampling-value">5</span></label>
              <input type="range" id="sampling-slider" min="1" max="10" value="5" step="1">
            </div>
          </div>
          
          <div class="bg-options">
            <p>Background Color:</p>
            <div class="bg-option transparent-bg active" data-color="transparent"></div>
            <div class="bg-option" style="background-color: #FFFFFF;" data-color="#FFFFFF"></div>
            <div class="bg-option" style="background-color: #000000;" data-color="#000000"></div>
            <div class="bg-option" style="background-color: #FF0000;" data-color="#FF0000"></div>
            <div class="bg-option" style="background-color: #00FF00;" data-color="#00FF00"></div>
            <div class="bg-option" style="background-color: #0000FF;" data-color="#0000FF"></div>
          </div>
          
          <div class="button-group">
            <button class="btn" id="process-btn">Remove Background</button>
            <button class="btn" id="reset-btn">Reset</button>
          </div>
        </div>
        
        <div class="processing hidden" id="processing">
          <div class="spinner"></div>
          <p>Processing image... This may take a few moments.</p>
        </div>
      </div>
    `;
    
    this.initElements();
    this.setupEventListeners();
  }

  initElements() {
    // Get references to DOM elements
    this.uploadBtn = this.shadowRoot.getElementById('upload-btn');
    this.fileInput = this.shadowRoot.getElementById('file-input');
    this.dropArea = this.shadowRoot.getElementById('drop-area');
    this.originalImageEl = this.shadowRoot.getElementById('original-image');
    this.processedImageEl = this.shadowRoot.getElementById('processed-image');
    this.imagesContainer = this.shadowRoot.getElementById('images-container');
    this.controls = this.shadowRoot.getElementById('controls');
    this.downloadBtn = this.shadowRoot.getElementById('download-btn');
    this.processBtn = this.shadowRoot.getElementById('process-btn');
    this.resetBtn = this.shadowRoot.getElementById('reset-btn');
    this.statusEl = this.shadowRoot.getElementById('status');
    this.processingEl = this.shadowRoot.getElementById('processing');
    this.colorCanvas = this.shadowRoot.getElementById('color-canvas');
    this.colorPreview = this.shadowRoot.getElementById('color-preview');
    this.colorValue = this.shadowRoot.getElementById('color-value');
    this.pickColorBtn = this.shadowRoot.getElementById('pick-color-btn');
    this.advancedToggle = this.shadowRoot.getElementById('advanced-toggle');
    this.advancedOptions = this.shadowRoot.getElementById('advanced-options');
    
    // Sliders
    this.toleranceSlider = this.shadowRoot.getElementById('tolerance-slider');
    this.toleranceValue = this.shadowRoot.getElementById('tolerance-value');
    this.smoothingSlider = this.shadowRoot.getElementById('smoothing-slider');
    this.smoothingValue = this.shadowRoot.getElementById('smoothing-value');
    this.samplingSlider = this.shadowRoot.getElementById('sampling-slider');
    this.samplingValue = this.shadowRoot.getElementById('sampling-value');
    
    // Background options
    this.bgOptions = this.shadowRoot.querySelectorAll('.bg-option');
    this.selectedBgColor = 'transparent';
    
    // Initialize color picker
    this.isPickingColor = false;
    this.backgroundColor = '#FFFFFF';
  }

  setupEventListeners() {
    // Upload button click
    this.uploadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadImage(file);
      }
    });
    
    // Drag and drop functionality
    this.dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropArea.classList.add('drag-over');
    });
    
    this.dropArea.addEventListener('dragleave', () => {
      this.dropArea.classList.remove('drag-over');
    });
    
    this.dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.match('image.*')) {
        this.loadImage(file);
      }
    });
    
    // Process button click
    this.processBtn.addEventListener('click', () => {
      this.removeBackground();
    });
    
    // Reset button click
    this.resetBtn.addEventListener('click', () => {
      if (this.originalImage) {
        this.processedImageEl.src = this.originalImageEl.src;
        this.downloadBtn.disabled = true;
        this.statusEl.textContent = 'Reset complete. Make adjustments and process again.';
      }
    });
    
    // Download button click
    this.downloadBtn.addEventListener('click', () => {
      this.downloadProcessedImage();
    });
    
    // Color picker
    this.pickColorBtn.addEventListener('click', () => {
      this.toggleColorPicker();
    });
    
    this.originalImageEl.addEventListener('click', (e) => {
      if (this.isPickingColor) {
        this.pickColor(e);
      }
    });
    
    // Advanced options toggle
    this.advancedToggle.addEventListener('click', () => {
      this.advancedOptions.classList.toggle('hidden');
      this.advancedToggle.textContent = this.advancedOptions.classList.contains('hidden') ? 
        'Show Advanced Options' : 'Hide Advanced Options';
    });
    
    // Slider inputs
    this.toleranceSlider.addEventListener('input', () => {
      this.tolerance = parseInt(this.toleranceSlider.value);
      this.toleranceValue.textContent = this.tolerance;
    });
    
    this.smoothingSlider.addEventListener('input', () => {
      this.smoothing = parseFloat(this.smoothingSlider.value);
      this.smoothingValue.textContent = this.smoothing;
    });
    
    this.samplingSlider.addEventListener('input', () => {
      this.sampling = parseInt(this.samplingSlider.value);
      this.samplingValue.textContent = this.sampling;
    });
    
    // Background color options
    this.bgOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.bgOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.selectedBgColor = option.dataset.color;
        
        if (this.processedImage) {
          this.applyBackgroundColor();
        }
      });
    });
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = img.src;
        this.imagesContainer.classList.remove('hidden');
        this.controls.classList.remove('hidden');
        this.statusEl.textContent = 'Image loaded. Click "Remove Background" to process.';
        this.processedImageEl.src = img.src;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  toggleColorPicker() {
    this.isPickingColor = !this.isPickingColor;
    this.pickColorBtn.textContent = this.isPickingColor ? 
      'Cancel Selection' : 'Pick Background Color';
    
    if (this.isPickingColor) {
      this.statusEl.textContent = 'Click anywhere on the original image to select a color.';
      this.originalImageEl.style.cursor = 'crosshair';
    } else {
      this.statusEl.textContent = 'Color picking canceled.';
      this.originalImageEl.style.cursor = 'default';
    }
  }

  pickColor(event) {
    const rect = this.originalImageEl.getBoundingClientRect();
    const scaleX = this.originalImage.width / rect.width;
    const scaleY = this.originalImage.height / rect.height;
    
    // Calculate click position relative to image
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    // Get canvas context
    this.colorCanvas.width = this.originalImage.width;
    this.colorCanvas.height = this.originalImage.height;
    const ctx = this.colorCanvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0);
    
    // Get pixel data
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const color = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
    const hexColor = this.rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
    
    // Update color preview
    this.colorPreview.style.backgroundColor = color;
    this.colorValue.textContent = hexColor;
    this.backgroundColor = hexColor;
    
    // Exit color picking mode
    this.isPickingColor = false;
    this.pickColorBtn.textContent = 'Pick Background Color';
    this.originalImageEl.style.cursor = 'default';
    this.statusEl.textContent = `Background color selected: ${hexColor}`;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  colorDistance(r1, g1, b1, r2, g2, b2) {
    // Compute Euclidean distance between colors
    return Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
  }

  removeBackground() {
    if (!this.originalImage) {
      this.statusEl.textContent = 'Please upload an image first.';
      return;
    }
    
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.processingEl.classList.remove('hidden');
    this.statusEl.textContent = 'Processing...';
    
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
      this.processImage();
    }, 100);
  }

  processImage() {
    try {
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match image
      canvas.width = this.originalImage.width;
      canvas.height = this.originalImage.height;
      
      // Draw original image to canvas
      ctx.drawImage(this.originalImage, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Get target background color
      let targetR, targetG, targetB;
      if (this.backgroundColor) {
        const rgb = this.hexToRgb(this.backgroundColor);
        targetR = rgb.r;
        targetG = rgb.g;
        targetB = rgb.b;
      } else {
        // Default to corners averaging if no color picked
        const cornerSamples = this.sampleCorners(data, canvas.width, canvas.height);
        targetR = cornerSamples.r;
        targetG = cornerSamples.g;
        targetB = cornerSamples.b;
      }

      // Create alpha mask based on color similarity
      const maxDistance = 255 * Math.sqrt(3) * (this.tolerance / 100);
      
      // Enhanced background removal with intelligent edge detection
      this.computeAlphaMask(data, canvas.width, canvas.height, targetR, targetG, targetB, maxDistance);
      
      // Update canvas with new image data
      ctx.putImageData(imageData, 0, 0);
      
      // Save processed image
      this.processedImage = canvas.toDataURL('image/png');
      this.processedImageEl.src = this.processedImage;
      
      // Apply selected background color
      this.applyBackgroundColor();
      
      // Update UI
      this.downloadBtn.disabled = false;
      this.statusEl.textContent = 'Background removed successfully!';
      this.isProcessing = false;
      this.processingEl.classList.add('hidden');
    } catch (error) {
      console.error('Error processing image:', error);
      this.statusEl.textContent = 'Error processing image. Please try again.';
      this.isProcessing = false;
      this.processingEl.classList.add('hidden');
    }
  }

  sampleCorners(data, width, height) {
    // Sample from corners to determine likely background color
    const samples = [];
    const sampleSize = this.sampling;
    
    // Top-left
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const idx = (y * width + x) * 4;
        samples.push({r: data[idx], g: data[idx + 1], b: data[idx + 2]});
      }
    }
    
    // Top-right
    for (let y = 0; y < sampleSize; y++) {
      for (let x = width - sampleSize; x < width; x++) {
        const idx = (y * width + x) * 4;
        samples.push({r: data[idx], g: data[idx + 1], b: data[idx + 2]});
      }
    }
    
    // Bottom-left
    for (let y = height - sampleSize; y < height; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const idx = (y * width + x) * 4;
        samples.push({r: data[idx], g: data[idx + 1], b: data[idx + 2]});
      }
    }
    
    // Bottom-right
    for (let y = height - sampleSize; y < height; y++) {
      for (let x = width - sampleSize; x < width; x++) {
        const idx = (y * width + x) * 4;
        samples.push({r: data[idx], g: data[idx + 1], b: data[idx + 2]});
      }
    }
    
    // Calculate average
    let sumR = 0, sumG = 0, sumB = 0;
    samples.forEach(sample => {
      sumR += sample.r;
      sumG += sample.g;
      sumB += sample.b;
    });
    
    return {
      r: Math.round(sumR / samples.length),
      g: Math.round(sumG / samples.length),
      b: Math.round(sumB / samples.length)
    };
  }

  computeAlphaMask(data, width, height, targetR, targetG, targetB, maxDistance) {
    // First pass: Identify background pixels
    const alphaMap = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate color distance
        const distance = this.colorDistance(r, g, b, targetR, targetG, targetB);
        
        // Normalize to 0-255 range based on maxDistance
        const alpha = Math.min(255, Math.max(0, Math.round(255 * (distance / maxDistance))));
        alphaMap[y * width + x] = alpha;
      }
    }
    
    // Second pass: Apply smoothing
    if (this.smoothing > 0) {
      const smoothRadius = Math.round(this.smoothing * 3); // Convert smoothing to radius
      this.applyGaussianBlur(alphaMap, width, height, smoothRadius);
    }
    
    // Third pass: Apply alpha mask to image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = alphaMap[y * width + x];
        
        // Set alpha channel based on mask
        data[idx + 3] = alpha;
      }
    }
  }

  applyGaussianBlur(alphaMap, width, height, radius) {
    if (radius <= 0) return;
    
    // Create temporary buffer
    const tempMap = new Uint8Array(width * height);
    
    // Compute Gaussian kernel
    const sigma = radius / 3;
    const kernel = [];
    const kernelSize = radius * 2 + 1;
    let kernelSum = 0;
    
    for (let i = 0; i < kernelSize; i++) {
      const x = i - radius;
      const g = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel.push(g);
      kernelSum += g;
    }
    
    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
      kernel[i] /= kernelSum;
    }
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        
        for (let i = 0; i < kernelSize; i++) {
          const kx = Math.min(width - 1, Math.max(0, x + i - radius));
          sum += alphaMap[y * width + kx] * kernel[i];
        }
        
        tempMap[y * width + x] = Math.round(sum);
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        
        for (let i = 0; i < kernelSize; i++) {
          const ky = Math.min(height - 1, Math.max(0, y + i - radius));
          sum += tempMap[ky * width + x] * kernel[i];
        }
        
        alphaMap[y * width + x] = Math.round(sum);
      }
    }
  }

  applyBackgroundColor() {
    if (!this.processedImage) return;
    
    // Create a temporary image to load the processed image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (this.selectedBgColor !== 'transparent') {
        // Fill with selected background color
        ctx.fillStyle = this.selectedBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Draw processed image on top
      ctx.drawImage(img, 0, 0);
      
      // Update displayed image
      this.processedImageEl.src = canvas.toDataURL('image/png');
    };
    img.src = this.processedImage;
  }

  downloadProcessedImage() {
    if (!this.processedImage) return;
    
    const a = document.createElement('a');
    a.href = this.processedImageEl.src;
    a.download = 'background-removed.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Define the custom element
customElements.define('background-remover', BackgroundRemover);
