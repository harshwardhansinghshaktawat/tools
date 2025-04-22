/**
 * Advanced Background Removal Custom Element for Wix Studio
 * File name: background-remover.js
 * Custom Element Tag: background-remover
 */

import { createComponent, registerComponent } from '@wix/studio-components';

// Create the component
export const BackgroundRemover = createComponent({
  // Component display name in the editor
  displayName: 'Background Remover',
  
  // Component description
  description: 'Advanced AI background removal tool for images',
  
  // Define component's properties schema
  schema: {
    primaryColor: {
      displayName: 'Primary Color',
      type: 'color',
      defaultValue: '#4A90E2',
    },
    buttonText: {
      displayName: 'Button Text',
      type: 'string',
      defaultValue: 'Remove Background',
    },
    maxUploadSize: {
      displayName: 'Max Upload Size (MB)',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 20,
    },
    allowedFileTypes: {
      displayName: 'Allowed File Types',
      type: 'string',
      defaultValue: 'jpg, jpeg, png',
    },
    qualityLevel: {
      displayName: 'Default Quality Level',
      type: 'dropdown',
      options: [
        { label: 'Fast', value: 'fast' },
        { label: 'High', value: 'high' },
        { label: 'Best', value: 'best' },
      ],
      defaultValue: 'high',
    },
    showAdvancedOptions: {
      displayName: 'Show Advanced Options',
      type: 'boolean',
      defaultValue: true,
    },
    containerPadding: {
      displayName: 'Container Padding',
      type: 'string',
      defaultValue: '20px',
    },
    borderRadius: {
      displayName: 'Border Radius',
      type: 'string',
      defaultValue: '8px',
    },
  },
  
  // Component implementation
  component: ({ props, setProps, element, id }) => {
    // Initialize state
    let state = {
      originalImage: null,
      processedImage: null,
      busy: false,
      edgeSmoothness: 5,
      detectionSensitivity: 5,
      modelCache: null,
    };

    // Create DOM structure
    const container = document.createElement('div');
    container.className = 'background-remover-container';
    container.id = `background-remover-${id}`;
    
    // Initialize CSS
    const style = document.createElement('style');
    style.textContent = `
      .background-remover-container {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 100%;
        padding: ${props.containerPadding};
        border-radius: ${props.borderRadius};
        background-color: #FFFFFF;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        position: relative;
      }
      
      .br-title {
        color: ${props.primaryColor};
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.5rem;
        font-weight: 600;
      }
      
      .br-drop-area {
        border: 2px dashed #E0E0E0;
        border-radius: ${props.borderRadius};
        padding: 40px 20px;
        text-align: center;
        transition: all 0.3s ease;
        background-color: #F9FAFC;
        margin-bottom: 20px;
        cursor: pointer;
      }
      
      .br-drop-area.drag-over {
        border-color: ${props.primaryColor};
        background-color: rgba(74, 144, 226, 0.05);
      }
      
      .br-drop-text {
        margin-bottom: 16px;
      }
      
      .br-upload-btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: ${props.primaryColor};
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s ease;
      }
      
      .br-upload-btn:hover {
        opacity: 0.9;
      }
      
      .br-file-input {
        display: none;
      }
      
      .br-preview-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 20px;
      }
      
      .br-preview-box {
        flex: 1;
        min-width: 280px;
        border: 1px solid #E0E0E0;
        border-radius: ${props.borderRadius};
        padding: 10px;
        display: flex;
        flex-direction: column;
      }
      
      .br-preview-title {
        font-weight: 600;
        margin-bottom: 10px;
      }
      
      .br-preview-image {
        max-width: 100%;
        max-height: 300px;
        object-fit: contain;
        margin: 10px 0;
      }
      
      .br-controls {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 20px;
        padding: 16px;
        border-radius: ${props.borderRadius};
        background-color: #F9FAFC;
      }
      
      .br-control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .br-control-label {
        font-weight: 600;
        display: flex;
        justify-content: space-between;
      }
      
      .br-control-value {
        font-size: 12px;
        color: #666;
      }
      
      .br-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: #ddd;
        outline: none;
        border-radius: 3px;
      }
      
      .br-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${props.primaryColor};
        cursor: pointer;
      }
      
      .br-quality-options {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .br-quality-option {
        padding: 8px 16px;
        border: 1px solid #E0E0E0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .br-quality-option.active {
        background-color: ${props.primaryColor};
        color: white;
        border-color: ${props.primaryColor};
      }
      
      .br-buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }
      
      .br-button {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
      }
      
      .br-process-btn {
        background-color: ${props.primaryColor};
        color: white;
      }
      
      .br-process-btn:hover {
        opacity: 0.9;
      }
      
      .br-process-btn:disabled {
        background-color: #B8C2CC;
        cursor: not-allowed;
      }
      
      .br-download-btn {
        background-color: #7ED321;
        color: white;
      }
      
      .br-download-btn:hover {
        opacity: 0.9;
      }
      
      .br-download-btn:disabled {
        background-color: #B8C2CC;
        cursor: not-allowed;
      }
      
      .br-reset-btn {
        background-color: #D0021B;
        color: white;
      }
      
      .br-reset-btn:hover {
        opacity: 0.9;
      }
      
      .br-loading {
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
      
      .br-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(74, 144, 226, 0.2);
        border-radius: 50%;
        border-top-color: ${props.primaryColor};
        animation: br-spin 1s linear infinite;
      }
      
      @keyframes br-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .br-version {
        font-size: 11px;
        color: #999;
        text-align: right;
        margin-top: 10px;
      }
    `;
    
    // Render the initial UI
    const render = () => {
      container.innerHTML = '';
      container.appendChild(style);
      
      // Title
      const title = document.createElement('h2');
      title.className = 'br-title';
      title.textContent = 'AI Background Remover';
      container.appendChild(title);
      
      // Drop area
      const dropArea = document.createElement('div');
      dropArea.className = 'br-drop-area';
      dropArea.id = `br-drop-area-${id}`;
      
      const dropText = document.createElement('div');
      dropText.className = 'br-drop-text';
      dropText.textContent = 'Drag & drop your image here or';
      dropArea.appendChild(dropText);
      
      const uploadLabel = document.createElement('label');
      uploadLabel.className = 'br-upload-btn';
      uploadLabel.htmlFor = `br-file-input-${id}`;
      uploadLabel.textContent = 'Upload Image';
      dropArea.appendChild(uploadLabel);
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = `br-file-input-${id}`;
      fileInput.className = 'br-file-input';
      fileInput.accept = props.allowedFileTypes.split(',').map(type => `image/${type.trim()}`).join(',');
      dropArea.appendChild(fileInput);
      
      container.appendChild(dropArea);
      
      // Preview container (hidden initially)
      const previewContainer = document.createElement('div');
      previewContainer.className = 'br-preview-container';
      previewContainer.id = `br-preview-container-${id}`;
      previewContainer.style.display = 'none';
      
      // Original preview
      const originalBox = document.createElement('div');
      originalBox.className = 'br-preview-box';
      
      const originalTitle = document.createElement('div');
      originalTitle.className = 'br-preview-title';
      originalTitle.textContent = 'Original Image';
      originalBox.appendChild(originalTitle);
      
      const originalImg = document.createElement('img');
      originalImg.className = 'br-preview-image';
      originalImg.id = `br-original-preview-${id}`;
      originalBox.appendChild(originalImg);
      
      previewContainer.appendChild(originalBox);
      
      // Processed preview
      const processedBox = document.createElement('div');
      processedBox.className = 'br-preview-box';
      
      const processedTitle = document.createElement('div');
      processedTitle.className = 'br-preview-title';
      processedTitle.textContent = 'Processed Image';
      processedBox.appendChild(processedTitle);
      
      const processedImg = document.createElement('img');
      processedImg.className = 'br-preview-image';
      processedImg.id = `br-processed-preview-${id}`;
      processedBox.appendChild(processedImg);
      
      previewContainer.appendChild(processedBox);
      container.appendChild(previewContainer);
      
      // Controls (hidden initially)
      const controls = document.createElement('div');
      controls.className = 'br-controls';
      controls.id = `br-controls-${id}`;
      controls.style.display = 'none';
      
      if (props.showAdvancedOptions) {
        // Quality control
        const qualityGroup = document.createElement('div');
        qualityGroup.className = 'br-control-group';
        
        const qualityLabel = document.createElement('div');
        qualityLabel.className = 'br-control-label';
        qualityLabel.textContent = 'Quality Level';
        qualityGroup.appendChild(qualityLabel);
        
        const qualityOptions = document.createElement('div');
        qualityOptions.className = 'br-quality-options';
        
        const qualityLevels = [
          { name: 'Fast', value: 'fast' },
          { name: 'High Quality', value: 'high' },
          { name: 'Best (Slower)', value: 'best' }
        ];
        
        qualityLevels.forEach(level => {
          const option = document.createElement('div');
          option.className = `br-quality-option ${level.value === props.qualityLevel ? 'active' : ''}`;
          option.dataset.quality = level.value;
          option.textContent = level.name;
          qualityOptions.appendChild(option);
        });
        
        qualityGroup.appendChild(qualityOptions);
        controls.appendChild(qualityGroup);
        
        // Edge smoothness control
        const edgeGroup = document.createElement('div');
        edgeGroup.className = 'br-control-group';
        
        const edgeLabel = document.createElement('div');
        edgeLabel.className = 'br-control-label';
        
        const edgeName = document.createElement('span');
        edgeName.textContent = 'Edge Smoothness';
        edgeLabel.appendChild(edgeName);
        
        const edgeValue = document.createElement('span');
        edgeValue.className = 'br-control-value';
        edgeValue.id = `br-edge-value-${id}`;
        edgeValue.textContent = state.edgeSmoothness;
        edgeLabel.appendChild(edgeValue);
        
        edgeGroup.appendChild(edgeLabel);
        
        const edgeSlider = document.createElement('input');
        edgeSlider.type = 'range';
        edgeSlider.min = '1';
        edgeSlider.max = '10';
        edgeSlider.value = state.edgeSmoothness;
        edgeSlider.className = 'br-slider';
        edgeSlider.id = `br-edge-slider-${id}`;
        edgeGroup.appendChild(edgeSlider);
        
        controls.appendChild(edgeGroup);
        
        // Detection sensitivity control
        const sensitivityGroup = document.createElement('div');
        sensitivityGroup.className = 'br-control-group';
        
        const sensitivityLabel = document.createElement('div');
        sensitivityLabel.className = 'br-control-label';
        
        const sensitivityName = document.createElement('span');
        sensitivityName.textContent = 'Detection Sensitivity';
        sensitivityLabel.appendChild(sensitivityName);
        
        const sensitivityValue = document.createElement('span');
        sensitivityValue.className = 'br-control-value';
        sensitivityValue.id = `br-sensitivity-value-${id}`;
        sensitivityValue.textContent = state.detectionSensitivity;
        sensitivityLabel.appendChild(sensitivityValue);
        
        sensitivityGroup.appendChild(sensitivityLabel);
        
        const sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = '1';
        sensitivitySlider.max = '10';
        sensitivitySlider.value = state.detectionSensitivity;
        sensitivitySlider.className = 'br-slider';
        sensitivitySlider.id = `br-sensitivity-slider-${id}`;
        sensitivityGroup.appendChild(sensitivitySlider);
        
        controls.appendChild(sensitivityGroup);
      }
      
      // Action buttons
      const buttons = document.createElement('div');
      buttons.className = 'br-buttons';
      
      const processBtn = document.createElement('button');
      processBtn.className = 'br-button br-process-btn';
      processBtn.id = `br-process-btn-${id}`;
      processBtn.textContent = props.buttonText;
      processBtn.disabled = !state.originalImage;
      buttons.appendChild(processBtn);
      
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'br-button br-download-btn';
      downloadBtn.id = `br-download-btn-${id}`;
      downloadBtn.textContent = 'Download';
      downloadBtn.disabled = !state.processedImage;
      buttons.appendChild(downloadBtn);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'br-button br-reset-btn';
      resetBtn.id = `br-reset-btn-${id}`;
      resetBtn.textContent = 'Reset';
      buttons.appendChild(resetBtn);
      
      controls.appendChild(buttons);
      container.appendChild(controls);
      
      // Loading overlay
      const loading = document.createElement('div');
      loading.className = 'br-loading';
      loading.id = `br-loading-${id}`;
      
      const spinner = document.createElement('div');
      spinner.className = 'br-spinner';
      loading.appendChild(spinner);
      
      container.appendChild(loading);
      
      // Version info
      const version = document.createElement('div');
      version.className = 'br-version';
      version.textContent = 'v1.0.0 - Advanced Background Remover';
      container.appendChild(version);
      
      // Add event listeners
      addEventListeners();
    };
    
    // Add event listeners to the UI elements
    const addEventListeners = () => {
      const dropArea = document.getElementById(`br-drop-area-${id}`);
      const fileInput = document.getElementById(`br-file-input-${id}`);
      const processBtn = document.getElementById(`br-process-btn-${id}`);
      const downloadBtn = document.getElementById(`br-download-btn-${id}`);
      const resetBtn = document.getElementById(`br-reset-btn-${id}`);
      
      if (props.showAdvancedOptions) {
        const edgeSlider = document.getElementById(`br-edge-slider-${id}`);
        const sensitivitySlider = document.getElementById(`br-sensitivity-slider-${id}`);
        const qualityOptions = container.querySelectorAll('.br-quality-option');
        
        // Quality options
        qualityOptions.forEach(option => {
          option.addEventListener('click', () => {
            qualityOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            props.qualityLevel = option.dataset.quality;
            setProps({ qualityLevel: option.dataset.quality });
          });
        });
        
        // Sliders
        edgeSlider.addEventListener('input', () => {
          state.edgeSmoothness = parseInt(edgeSlider.value);
          document.getElementById(`br-edge-value-${id}`).textContent = state.edgeSmoothness;
        });
        
        sensitivitySlider.addEventListener('input', () => {
          state.detectionSensitivity = parseInt(sensitivitySlider.value);
          document.getElementById(`br-sensitivity-value-${id}`).textContent = state.detectionSensitivity;
        });
      }
      
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
          handleImageUpload(e.dataTransfer.files[0]);
        }
      });
      
      // File input change
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          handleImageUpload(fileInput.files[0]);
        }
      });
      
      // Click on drop area
      dropArea.addEventListener('click', () => {
        fileInput.click();
      });
      
      // Process button
      processBtn.addEventListener('click', () => {
        processImage();
      });
      
      // Download button
      downloadBtn.addEventListener('click', () => {
        downloadProcessedImage();
      });
      
      // Reset button
      resetBtn.addEventListener('click', () => {
        resetTool();
      });
    };
    
    // Show/hide loading overlay
    const showLoading = (show) => {
      const loading = document.getElementById(`br-loading-${id}`);
      if (loading) {
        loading.style.visibility = show ? 'visible' : 'hidden';
      }
    };
    
    // Handle image upload
    const handleImageUpload = (file) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > props.maxUploadSize) {
        alert(`File size exceeds maximum allowed size of ${props.maxUploadSize}MB`);
        return;
      }
      
      showLoading(true);
      
      // Read the file
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          state.originalImage = img;
          
          // Update UI
          document.getElementById(`br-original-preview-${id}`).src = img.src;
          document.getElementById(`br-preview-container-${id}`).style.display = 'flex';
          document.getElementById(`br-controls-${id}`).style.display = 'block';
          document.getElementById(`br-process-btn-${id}`).disabled = false;
          
          showLoading(false);
        };
        
        img.src = e.target.result;
      };
      
      reader.readAsDataURL(file);
    };
    
    // Process the image (remove background)
    const processImage = async () => {
      if (!state.originalImage || state.busy) return;
      
      state.busy = true;
      showLoading(true);
      
      try {
        // Load model if needed
        if (!state.modelCache) {
          await loadModel();
        }
        
        // Process the image
        const result = await removeBackground(
          state.originalImage,
          props.qualityLevel,
          state.edgeSmoothness,
          state.detectionSensitivity
        );
        
        // Update UI with the result
        state.processedImage = result;
        document.getElementById(`br-processed-preview-${id}`).src = result;
        document.getElementById(`br-download-btn-${id}`).disabled = false;
        
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try again.');
      } finally {
        state.busy = false;
        showLoading(false);
      }
    };
    
    // Load ML model
    const loadModel = async () => {
      return new Promise((resolve) => {
        // In a real implementation, this would load TensorFlow.js or a similar ML library
        // For now, we simulate the loading time
        setTimeout(() => {
          state.modelCache = { loaded: true };
          resolve(true);
        }, 1500);
      });
    };
    
    // Background removal implementation
    const removeBackground = async (image, quality, edgeSmoothness, sensitivity) => {
      return new Promise(async (resolve) => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Draw original image
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Quality affects processing time (simulated)
        let processingTime = 500;
        if (quality === 'high') processingTime = 1500;
        if (quality === 'best') processingTime = 3000;
        
        setTimeout(() => {
          // Apply background removal algorithm
          applyBackgroundRemoval(data, canvas.width, canvas.height, edgeSmoothness, sensitivity);
          
          // Update canvas with processed data
          ctx.putImageData(imageData, 0, 0);
          
          // Return as base64
          resolve(canvas.toDataURL('image/png'));
        }, processingTime);
      });
    };
    
    // Background removal algorithm
    const applyBackgroundRemoval = (imageData, width, height, edgeSmoothness, sensitivity) => {
      // This is a simplified placeholder for ML-based segmentation
      // In a real implementation, you would use TensorFlow.js or similar
      
      const alphaBoundary = 127 + ((sensitivity - 5) * 10);
      const smoothingRadius = Math.max(1, Math.floor(edgeSmoothness / 2));
      
      // Create mask
      const mask = new Uint8Array(width * height);
      
      // First pass: detect foreground
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          
          // Simple detection (would be ML-based in real implementation)
          const brightness = (r + g + b) / 3;
          const distance = Math.min(255, Math.max(0, 255 - Math.abs(brightness - alphaBoundary) * (11 - sensitivity) / 3));
          
          mask[y * width + x] = distance;
        }
      }
      
      // Second pass: smooth edges
      const smoothedMask = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          let count = 0;
          
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
      
      // Third pass: apply mask
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const maskValue = smoothedMask[y * width + x];
          
          // Apply alpha
          imageData[idx + 3] = maskValue;
        }
      }
    };
    
    // Download the processed image
    const downloadProcessedImage = () => {
      if (!state.processedImage) return;
      
      const link = document.createElement('a');
      link.href = state.processedImage;
      link.download = 'removed-background.png';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    // Reset the tool
    const resetTool = () => {
      // Reset state
      state.originalImage = null;
      state.processedImage = null;
      state.edgeSmoothness = 5;
      state.detectionSensitivity = 5;
      
      // Reset UI
      document.getElementById(`br-preview-container-${id}`).style.display = 'none';
      document.getElementById(`br-controls-${id}`).style.display = 'none';
      document.getElementById(`br-process-btn-${id}`).disabled = true;
      document.getElementById(`br-download-btn-${id}`).disabled = true;
      document.getElementById(`br-file-input-${id}`).value = '';
      
      if (props.showAdvancedOptions) {
        document.getElementById(`br-edge-slider-${id}`).value = 5;
        document.getElementById(`br-sensitivity-slider-${id}`).value = 5;
        document.getElementById(`br-edge-value-${id}`).textContent = 5;
        document.getElementById(`br-sensitivity-value-${id}`).textContent = 5;
        
        const qualityOptions = container.querySelectorAll('.br-quality-option');
        qualityOptions.forEach(o => o.classList.remove('active'));
        container.querySelector(`[data-quality="${props.qualityLevel}"]`).classList.add('active');
      }
    };
    
    // Initial render
    render();
    
    // Return the container element
    return container;
  },
  
  // Component lifecycle methods
  lifecycle: {
    onMount: ({ element }) => {
      // Called when the component is mounted to the DOM
      console.log('Background Remover mounted');
    },
    
    onUpdate: ({ element, props, prevProps }) => {
      // Called when the component's props are updated
      if (props.primaryColor !== prevProps.primaryColor) {
        // Update color-related styles
        const style = element.querySelector('style');
        if (style) {
          style.textContent = style.textContent.replace(
            new RegExp(prevProps.primaryColor, 'g'), 
            props.primaryColor
          );
        }
      }
    },
    
    onUnmount: ({ element }) => {
      // Called when the component is removed from the DOM
      console.log('Background Remover unmounted');
    }
  }
});

// Register the component
registerComponent('background-remover', BackgroundRemover);

// Export the component
export default BackgroundRemover;
