/**
 * Advanced Background Removal Custom Element for Wix Studio
 * File name: wix-background-remover.js
 * Custom Element Tag: wix-background-remover
 */

// Define the custom element
class WixBackgroundRemover extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.modelCache = null;
    this.originalImage = null;
    this.processedImage = null;
    this.busy = false;
    this.qualityLevel = 'high'; // 'fast', 'medium', 'high'
    this.edgeSmoothness = 5; // 1-10
    this.foregroundDetectionSensitivity = 5; // 1-10
    this.renderUI();
  }

  renderUI() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #333;
          --primary-color: #4A90E2;
          --secondary-color: #F5A623;
          --success-color: #7ED321;
          --danger-color: #D0021B;
          --border-color: #E0E0E0;
          --background-color: #FFFFFF;
          --panel-background: #F9FAFC;
        }
        
        .container {
          max-width: 100%;
          padding: 20px;
          border-radius: 8px;
          background-color: var(--background-color);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
        
        h2 {
          color: var(--primary-color);
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .drop-area {
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          transition: all 0.3s ease;
          background-color: var(--panel-background);
          margin-bottom: 20px;
          cursor: pointer;
        }
        
        .drop-area.drag-over {
          border-color: var(--primary-color);
          background-color: rgba(74, 144, 226, 0.05);
        }
        
        .drop-area-text {
          margin-bottom: 16px;
        }
        
        .upload-btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: var(--primary-color);
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.2s ease;
        }
        
        .upload-btn:hover {
          background-color: #3A80D2;
        }
        
        .file-input {
          display: none;
        }
        
        .preview-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 20px;
        }
        
        .preview-box {
          flex: 1;
          min-width: 280px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
        }
        
        .preview-title {
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 300px;
          object-fit: contain;
          margin: 10px 0;
        }
        
        .controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          background-color: var(--panel-background);
        }
        
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .control-label {
          font-weight: 600;
          display: flex;
          justify-content: space-between;
        }
        
        .control-value {
          font-size: 12px;
          color: #666;
        }
        
        .slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #ddd;
          outline: none;
          border-radius: 3px;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
        }
        
        .buttons-container {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .action-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
        }
        
        .process-btn {
          background-color: var(--primary-color);
          color: white;
        }
        
        .process-btn:hover {
          background-color: #3A80D2;
        }
        
        .process-btn:disabled {
          background-color: #B8C2CC;
          cursor: not-allowed;
        }
        
        .download-btn {
          background-color: var(--success-color);
          color: white;
        }
        
        .download-btn:hover {
          background-color: #6BC30D;
        }
        
        .download-btn:disabled {
          background-color: #B8C2CC;
          cursor: not-allowed;
        }
        
        .reset-btn {
          background-color: var(--danger-color);
          color: white;
        }
        
        .reset-btn:hover {
          background-color: #C00018;
        }
        
        .quality-options {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .quality-option {
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .quality-option.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
          visibility: hidden;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(74, 144, 226, 0.2);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .version-info {
          font-size: 11px;
          color: #999;
          text-align: right;
          margin-top: 10px;
        }
      </style>
      
      <div class="container">
        <h2>AI Background Remover</h2>
        
        <div class="drop-area" id="dropArea">
          <div class="drop-area-text">Drag & drop your image here or</div>
          <label class="upload-btn" for="fileInput">Upload Image</label>
          <input type="file" id="fileInput" class="file-input" accept="image/*" />
        </div>
        
        <div class="preview-container" id="previewContainer" style="display: none;">
          <div class="preview-box">
            <div class="preview-title">Original Image</div>
            <img id="originalPreview" class="preview-image" />
          </div>
          
          <div class="preview-box">
            <div class="preview-title">Processed Image</div>
            <img id="processedPreview" class="preview-image" />
          </div>
        </div>
        
        <div class="controls" id="controls" style="display: none;">
          <div class="control-group">
            <div class="control-label">Quality Level</div>
            <div class="quality-options">
              <div class="quality-option" data-quality="fast">Fast</div>
              <div class="quality-option active" data-quality="high">High Quality</div>
              <div class="quality-option" data-quality="best">Best (Slower)</div>
            </div>
          </div>
          
          <div class="control-group">
            <div class="control-label">
              <span>Edge Smoothness</span>
              <span class="control-value" id="edgeValueDisplay">5</span>
            </div>
            <input type="range" min="1" max="10" value="5" class="slider" id="edgeSlider">
          </div>
          
          <div class="control-group">
            <div class="control-label">
              <span>Detection Sensitivity</span>
              <span class="control-value" id="sensitivityValueDisplay">5</span>
            </div>
            <input type="range" min="1" max="10" value="5" class="slider" id="sensitivitySlider">
          </div>
          
          <div class="buttons-container">
            <button id="processBtn" class="action-btn process-btn" disabled>Remove Background</button>
            <button id="downloadBtn" class="action-btn download-btn" disabled>Download</button>
            <button id="resetBtn" class="action-btn reset-btn">Reset</button>
          </div>
        </div>
        
        <div class="loading-overlay" id="loadingOverlay">
          <div class="spinner"></div>
        </div>
        
        <div class="version-info">v1.0.0 - Advanced Background Remover</div>
      </div>
    `;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const dropArea = this.shadowRoot.getElementById('dropArea');
    const fileInput = this.shadowRoot.getElementById('fileInput');
    const processBtn = this.shadowRoot.getElementById('processBtn');
    const downloadBtn = this.shadowRoot.getElementById('downloadBtn');
    const resetBtn = this.shadowRoot.getElementById('resetBtn');
    const edgeSlider = this.shadowRoot.getElementById('edgeSlider');
    const sensitivitySlider = this.shadowRoot.getElementById('sensitivitySlider');
    const qualityOptions = this.shadowRoot.querySelectorAll('.quality-option');
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    dropArea.addEventListener('dragenter', () => dropArea.classList.add('drag-over'));
    dropArea.addEventListener('dragover', () => dropArea.classList.add('drag-over'));
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', e => {
      dropArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.handleImageUpload(e.dataTransfer.files[0]);
      }
    });
    
    // Handle file input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        this.handleImageUpload(fileInput.files[0]);
      }
    });
    
    // Handle dropdown selection
    dropArea.addEventListener('click', () => fileInput.click());
    
    // Handle buttons
    processBtn.addEventListener('click', () => this.processImage());
    downloadBtn.addEventListener('click', () => this.downloadProcessedImage());
    resetBtn.addEventListener('click', () => this.resetTool());
    
    // Handle quality options
    qualityOptions.forEach(option => {
      option.addEventListener('click', () => {
        qualityOptions.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        this.qualityLevel = option.dataset.quality;
      });
    });
    
    // Handle sliders
    edgeSlider.addEventListener('input', () => {
      this.edgeSmoothness = parseInt(edgeSlider.value);
      this.shadowRoot.getElementById('edgeValueDisplay').textContent = this.edgeSmoothness;
    });
    
    sensitivitySlider.addEventListener('input', () => {
      this.foregroundDetectionSensitivity = parseInt(sensitivitySlider.value);
      this.shadowRoot.getElementById('sensitivityValueDisplay').textContent = this.foregroundDetectionSensitivity;
    });
  }

  async handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    this.showLoading(true);
    
    try {
      // Read the file
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          this.originalImage = img;
          
          // Display original image
          this.shadowRoot.getElementById('originalPreview').src = img.src;
          this.shadowRoot.getElementById('previewContainer').style.display = 'flex';
          this.shadowRoot.getElementById('controls').style.display = 'block';
          this.shadowRoot.getElementById('processBtn').disabled = false;
          
          this.showLoading(false);
        };
        
        img.src = e.target.result;
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error loading image:', error);
      this.showLoading(false);
      alert('Failed to load image. Please try again.');
    }
  }

  async processImage() {
    if (!this.originalImage || this.busy) return;
    
    this.busy = true;
    this.showLoading(true);
    
    try {
      // Load model if not already loaded
      if (!this.modelCache) {
        await this.loadModel();
      }
      
      // Process image using the selected parameters
      const result = await this.removeBackground(
        this.originalImage,
        this.qualityLevel,
        this.edgeSmoothness,
        this.foregroundDetectionSensitivity
      );
      
      // Update processed preview
      this.processedImage = result;
      this.shadowRoot.getElementById('processedPreview').src = result;
      this.shadowRoot.getElementById('downloadBtn').disabled = false;
      
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      this.busy = false;
      this.showLoading(false);
    }
  }

  async loadModel() {
    // In a real implementation, we would load TensorFlow.js or a similar library
    // and pre-trained models for background removal
    
    // Simulating model loading time
    return new Promise((resolve) => {
      setTimeout(() => {
        this.modelCache = { loaded: true };
        resolve(true);
      }, 1500);
    });
  }

  async removeBackground(image, quality, edgeSmoothness, sensitivity) {
    // This is where we would integrate with TensorFlow.js or another ML model
    // For this custom element example, we'll implement a simplified version that
    // demonstrates the UI functionality
    
    return new Promise(async (resolve) => {
      // Create canvas to work with the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match image
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the original image to the canvas
      ctx.drawImage(image, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Quality affects processing time simulation
      let processingTime = 500;
      if (quality === 'high') processingTime = 1500;
      if (quality === 'best') processingTime = 3000;
      
      setTimeout(() => {
        // Apply background removal algorithm
        // This is a simplified placeholder - in a real implementation, 
        // we would use a proper ML model for segmentation
        this.applyAdvancedBackgroundRemoval(data, canvas.width, canvas.height, edgeSmoothness, sensitivity);
        
        // Put the processed image data back to the canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Return the processed image as base64
        resolve(canvas.toDataURL('image/png'));
      }, processingTime);
    });
  }

  applyAdvancedBackgroundRemoval(imageData, width, height, edgeSmoothness, sensitivity) {
    // This is a placeholder for advanced background removal
    // In a real implementation, this would use ML-based segmentation
    
    // Simulate different parameters affecting the result
    const alphaBoundary = 127 + ((sensitivity - 5) * 10);
    const smoothingRadius = Math.max(1, Math.floor(edgeSmoothness / 2));
    
    // Create a mask based on brightness and edge detection (simulated)
    // In a proper implementation, this would be created by the ML model
    const mask = new Uint8Array(width * height);
    
    // First pass: detect foreground areas (simplified)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        
        // Simple brightness-based detection (in a real implementation, this would be ML-based)
        const brightness = (r + g + b) / 3;
        const distance = Math.min(255, Math.max(0, 255 - Math.abs(brightness - alphaBoundary) * (11 - sensitivity) / 3));
        
        mask[y * width + x] = distance;
      }
    }
    
    // Second pass: smooth the mask edges
    const smoothedMask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        
        // Apply smoothing based on edgeSmoothness parameter
        for (let dy = -smoothingRadius; dy <= smoothingRadius; dy++) {
          for (let dx = -smoothingRadius; dx <= smoothingRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += mask[ny * width + nx];
              count++;
            }
          }
        }
        
        smoothedMask[y * width + x] = Math.round(sum / count);
      }
    }
    
    // Third pass: apply the mask to the image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const maskValue = smoothedMask[y * width + x];
        
        // Apply the mask value as alpha
        imageData[idx + 3] = maskValue;
      }
    }
  }

  downloadProcessedImage() {
    if (!this.processedImage) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = this.processedImage;
    link.download = 'removed-background.png';
    
    // Trigger a click on the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  resetTool() {
    // Reset the state
    this.originalImage = null;
    this.processedImage = null;
    
    // Reset UI
    this.shadowRoot.getElementById('previewContainer').style.display = 'none';
    this.shadowRoot.getElementById('controls').style.display = 'none';
    this.shadowRoot.getElementById('processBtn').disabled = true;
    this.shadowRoot.getElementById('downloadBtn').disabled = true;
    this.shadowRoot.getElementById('fileInput').value = '';
    
    // Reset sliders to default
    this.shadowRoot.getElementById('edgeSlider').value = 5;
    this.shadowRoot.getElementById('sensitivitySlider').value = 5;
    this.edgeSmoothness = 5;
    this.foregroundDetectionSensitivity = 5;
    this.shadowRoot.getElementById('edgeValueDisplay').textContent = 5;
    this.shadowRoot.getElementById('sensitivityValueDisplay').textContent = 5;
    
    // Reset quality
    const qualityOptions = this.shadowRoot.querySelectorAll('.quality-option');
    qualityOptions.forEach(o => o.classList.remove('active'));
    this.shadowRoot.querySelector('[data-quality="high"]').classList.add('active');
    this.qualityLevel = 'high';
  }

  showLoading(show) {
    const loadingOverlay = this.shadowRoot.getElementById('loadingOverlay');
    loadingOverlay.style.visibility = show ? 'visible' : 'hidden';
  }

  // Integration with external services (would need proper API keys in real implementation)
  async removeBackgroundUsingExternalAPI(imageBlob) {
    // This function shows how you could integrate with Remove.bg or similar services
    // Not functional without API key and implementation
    
    const formData = new FormData();
    formData.append('image_file', imageBlob);
    formData.append('size', 'auto');
    
    try {
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': 'YOUR_API_KEY_HERE' // Would need a real API key
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to remove background');
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('External API error:', error);
      throw error;
    }
  }
}

// Register the custom element
customElements.define('wix-background-remover', WixBackgroundRemover);

// For Wix Studio integration
export default {
  component: {
    name: "WixBackgroundRemover",
    settingsSchema: {
      title: "Background Remover Settings",
      type: "object",
      properties: {
        width: {
          type: "string",
          default: "100%"
        },
        height: {
          type: "string",
          default: "auto"
        },
        theme: {
          type: "string",
          enum: ["light", "dark"],
          default: "light"
        }
      }
    }
  }
};
