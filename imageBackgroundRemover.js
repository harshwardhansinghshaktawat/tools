// imageBackgroundRemover.js
import { registerCustomElement } from '@wix/custom-elements';

class ImageBackgroundRemover extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.imageFile = null;
    this.processedImageUrl = null;
    this.backgroundColor = null;
    this.tolerance = 30; // Default color tolerance
  }

  // Lifecycle: When the element is connected to the DOM
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  // Render the UI
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
        .container {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }
        .upload-area {
          border: 2px dashed #ccc;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          margin-bottom: 20px;
        }
        .upload-area.dragover {
          background: #e1f5fe;
          border-color: #2196f3;
        }
        .preview-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .preview {
          flex: 1;
          margin: 0 10px;
        }
        .preview img {
          max-width: 100%;
          height: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: crosshair;
        }
        .controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .error {
          color: red;
          margin-bottom: 10px;
          display: none;
        }
        button {
          padding: 10px 20px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        input[type="range"] {
          width: 100%;
        }
        .instructions {
          font-size: 0.9em;
          color: #555;
        }
      </style>
      <div class="container">
        <div class="upload-area" id="uploadArea">
          <p>Drag & drop an image or click to upload</p>
          <input type="file" id="fileInput" accept="image/*" style="display: none;">
        </div>
        <div class="error" id="error">Error: Invalid image or processing failed.</div>
        <div class="preview-container">
          <div class="preview" id="originalPreview">
            <h3>Original</h3>
            <p class="instructions">Click on the background to select color</p>
            <img id="originalImage" alt="Original Image">
          </div>
          <div class="preview" id="processedPreview">
            <h3>Processed</h3>
            <img id="processedImage" alt="Processed Image">
          </div>
        </div>
        <div class="controls">
          <label>Tolerance: <input type="range" id="tolerance" min="0" max="100" value="30"></label>
          <button id="processButton" disabled>Remove Background</button>
          <button id="downloadButton" disabled>Download Result</button>
        </div>
      </div>
    `;
  }

  // Setup event listeners for interactivity
  setupEventListeners() {
    const uploadArea = this.shadowRoot.getElementById('uploadArea');
    const fileInput = this.shadowRoot.getElementById('fileInput');
    const processButton = this.shadowRoot.getElementById('processButton');
    const downloadButton = this.shadowRoot.getElementById('downloadButton');
    const originalImage = this.shadowRoot.getElementById('originalImage');
    const processedImage = this.shadowRoot.getElementById('processedImage');
    const errorDiv = this.shadowRoot.getElementById('error');
    const toleranceInput = this.shadowRoot.getElementById('tolerance');

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      this.handleFile(file);
    });

    // File input
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      this.handleFile(file);
    });

    // Click to select background color
    originalImage.addEventListener('click', (e) => {
      if (!this.imageFile) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = originalImage.src;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const rect = originalImage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * img.width;
        const y = ((e.clientY - rect.top) / rect.height) * img.height;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        this.backgroundColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
        processButton.disabled = false;
      };
    });

    // Tolerance adjustment
    toleranceInput.addEventListener('input', () => {
      this.tolerance = parseInt(toleranceInput.value);
      if (this.backgroundColor) {
        this.removeBackground();
      }
    });

    // Process button
    processButton.addEventListener('click', () => {
      if (!this.imageFile || !this.backgroundColor) return;
      this.removeBackground();
    });

    // Download button
    downloadButton.addEventListener('click', () => {
      if (this.processedImageUrl) {
        const link = document.createElement('a');
        link.href = this.processedImageUrl;
        link.download = 'background_removed.png';
        link.click();
      }
    });

    // Error handling
    this.showError = (message) => {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    };

    this.hideError = () => {
      errorDiv.style.display = 'none';
    };
  }

  // Handle uploaded file
  handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showError('Please upload a valid image file.');
      return;
    }

    this.imageFile = file;
    this.backgroundColor = null;
    this.hideError();
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalImage = this.shadowRoot.getElementById('originalImage');
      originalImage.src = e.target.result;
      this.shadowRoot.getElementById('processButton').disabled = true;
      this.shadowRoot.getElementById('downloadButton').disabled = true;
      this.shadowRoot.getElementById('processedImage').src = '';
    };
    reader.readAsDataURL(file);
  }

  // Client-side background removal
  removeBackground() {
    const processedImage = this.shadowRoot.getElementById('processedImage');
    const downloadButton = this.shadowRoot.getElementById('downloadButton');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = this.shadowRoot.getElementById('originalImage').src;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Flood-fill-like algorithm to remove background
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (this.isBackgroundColor(r, g, b)) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0);
      this.processedImageUrl = canvas.toDataURL('image/png');
      processedImage.src = this.processedImageUrl;
      downloadButton.disabled = false;
    };
  }

  // Check if a pixel matches the background color within tolerance
  isBackgroundColor(r, g, b) {
    if (!this.backgroundColor) return false;
    const { r: bgR, g: bgG, b: bgB } = this.backgroundColor;
    return (
      Math.abs(r - bgR) <= this.tolerance &&
      Math.abs(g - bgG) <= this.tolerance &&
      Math.abs(b - bgB) <= this.tolerance
    );
  }

  // Lifecycle: Cleanup when element is removed
  disconnectedCallback() {
    if (this.processedImageUrl) {
      URL.revokeObjectURL(this.processedImageUrl);
    }
  }
}

// Register the custom element
registerCustomElement('image-background-remover', ImageBackgroundRemover);
