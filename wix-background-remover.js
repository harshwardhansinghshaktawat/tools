/**
 * Advanced Background Remover - Wix Studio Custom Element
 * 
 * File: wix-background-remover.js
 * Custom Element Tag: <wix-background-remover>
 * 
 * Features:
 * - Client-side background removal without external APIs
 * - Automatic background detection using multiple algorithms
 * - Manual refinement tools (brush, eraser, magic wand)
 * - Edge refinement for smooth results
 * - Alpha matting for accurate edges
 * - Interactive segmentation
 * - Multiple detection modes for different image types
 * - Preview with background color/transparency/image options
 * - High-quality output in PNG format
 * - Mobile-friendly design
 */

class WixBackgroundRemover extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State variables
    this.image = null;
    this.originalImage = null;
    this.maskCanvas = null;
    this.resultCanvas = null;
    this.previewCanvas = null;
    this.brushCanvas = null;
    this.currentTool = 'auto'; // 'auto', 'brush', 'eraser', 'magic-wand'
    this.brushSize = 20;
    this.brushSoftness = 50;
    this.tolerance = 30;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.processingProgress = 0;
    this.autoMaskSettings = {
      sensitivity: 50,
      edgeDetection: true,
      smoothing: 50,
      foregroundBias: 50,
      detailLevel: 'medium',
      algorithm: 'adaptive' // 'adaptive', 'color', 'edge', 'trimap'
    };
    this.outputSettings = {
      format: 'png',
      quality: 0.92,
      transparentBackground: true,
      backgroundColor: '#ffffff',
      backgroundImage: null,
      defringing: true,
      refinementLevel: 'medium'
    };
    
    // Performance settings
    this.processingWorker = null;
    this.useWorker = true;
    this.canUseGPU = false;
    this.maxDimension = 2048; // Max processing dimension
    
    // Render initial UI
    this.render();
  }

  connectedCallback() {
    this.setupEventListeners();
    
    // Check for WebGL2/GPU capabilities
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      this.canUseGPU = !!gl;
    } catch (e) {
      this.canUseGPU = false;
    }
    
    // Initialize web worker for processing if supported
    if (window.Worker && this.useWorker) {
      this.initWorker();
    }
    
    // Notify Wix Studio that the element is ready
    if (window.wixDevelopmentSDK) {
      window.wixDevelopmentSDK.elementReady({
        name: 'wix-background-remover',
        properties: [
          { name: 'maxImageSize', type: 'number', defaultValue: 10 }, // in MB
          { name: 'maxDimension', type: 'number', defaultValue: 2048 },
          { name: 'useGPU', type: 'boolean', defaultValue: true },
          { name: 'useWorker', type: 'boolean', defaultValue: true },
          { name: 'defaultDetectionMode', type: 'string', defaultValue: 'adaptive' },
          { name: 'outputQuality', type: 'number', defaultValue: 0.92 }
        ],
        events: [
          { name: 'backgroundRemoved', data: { imageData: 'string' } },
          { name: 'processingProgress', data: { progress: 'number' } },
          { name: 'processingComplete' },
          { name: 'processingCancelled' },
          { name: 'error', data: { message: 'string' } }
        ]
      });
    }
  }

  disconnectedCallback() {
    this.removeEventListeners();
    
    // Terminate worker if active
    if (this.processingWorker) {
      this.processingWorker.terminate();
      this.processingWorker = null;
    }
  }

  // Initialize web worker for background processing
  initWorker() {
    // Create a blob URL for the worker script
    const workerScript = `
      // Background processing worker
      self.onmessage = function(e) {
        const { command, imageData, settings } = e.data;
        
        if (command === 'removeBackground') {
          try {
            // Report progress periodically
            const reportProgress = (progress) => {
              self.postMessage({ type: 'progress', progress });
            };
            
            // Process the image data
            const result = processImage(imageData, settings, reportProgress);
            
            // Return the processed result
            self.postMessage({ 
              type: 'complete', 
              resultImageData: result.resultImageData,
              maskImageData: result.maskImageData 
            });
          } catch (error) {
            self.postMessage({ type: 'error', message: error.message });
          }
        }
      };
      
      // Image processing functions
      function processImage(imageData, settings, reportProgress) {
        const { width, height, data } = imageData;
        
        // Create output images
        const resultImageData = new ImageData(width, height);
        const maskImageData = new ImageData(width, height);
        
        // Compute image stats
        const imageStats = computeImageStats(imageData);
        
        // Compute initial segmentation mask based on algorithm
        let mask;
        switch(settings.algorithm) {
          case 'color':
            mask = colorBasedSegmentation(imageData, settings, imageStats);
            break;
          case 'edge':
            mask = edgeBasedSegmentation(imageData, settings, imageStats);
            break;
          case 'trimap':
            mask = trimapBasedSegmentation(imageData, settings, imageStats);
            break;
          case 'adaptive':
          default:
            mask = adaptiveSegmentation(imageData, settings, imageStats);
            break;
        }
        
        reportProgress(50);
        
        // Refine the mask
        mask = refineMask(mask, imageData, settings);
        
        reportProgress(80);
        
        // Apply the mask to the original image
        applyMaskToImage(imageData, resultImageData, mask, settings);
        
        // Copy mask to output
        for (let i = 0; i < mask.length; i++) {
          const idx = i * 4;
          const alpha = mask[i] * 255;
          maskImageData.data[idx] = alpha;
          maskImageData.data[idx + 1] = alpha;
          maskImageData.data[idx + 2] = alpha;
          maskImageData.data[idx + 3] = 255;
        }
        
        reportProgress(100);
        
        return { 
          resultImageData: resultImageData,
          maskImageData: maskImageData
        };
      }
      
      function computeImageStats(imageData) {
        const { width, height, data } = imageData;
        
        // Calculate basic stats
        let rSum = 0, gSum = 0, bSum = 0;
        let rMin = 255, gMin = 255, bMin = 255;
        let rMax = 0, gMax = 0, bMax = 0;
        
        // Edge pixel count
        let edgePixels = 0;
        
        // Color histogram (simplified)
        const rHist = new Array(256).fill(0);
        const gHist = new Array(256).fill(0);
        const bHist = new Array(256).fill(0);
        
        // Analyze pixel data
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Update sums
            rSum += r;
            gSum += g;
            bSum += b;
            
            // Update min/max
            rMin = Math.min(rMin, r);
            gMin = Math.min(gMin, g);
            bMin = Math.min(bMin, b);
            
            rMax = Math.max(rMax, r);
            gMax = Math.max(gMax, g);
            bMax = Math.max(bMax, b);
            
            // Update histograms
            rHist[r]++;
            gHist[g]++;
            bHist[b]++;
            
            // Check if edge pixel (simplified)
            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
              const idxLeft = (y * width + (x - 1)) * 4;
              const idxRight = (y * width + (x + 1)) * 4;
              const idxTop = ((y - 1) * width + x) * 4;
              const idxBottom = ((y + 1) * width + x) * 4;
              
              const diffX = Math.abs(data[idxLeft] - data[idxRight]) + 
                           Math.abs(data[idxLeft + 1] - data[idxRight + 1]) + 
                           Math.abs(data[idxLeft + 2] - data[idxRight + 2]);
                           
              const diffY = Math.abs(data[idxTop] - data[idxBottom]) + 
                           Math.abs(data[idxTop + 1] - data[idxBottom + 1]) + 
                           Math.abs(data[idxTop + 2] - data[idxBottom + 2]);
              
              if (diffX > 100 || diffY > 100) {
                edgePixels++;
              }
            }
          }
        }
        
        const pixelCount = width * height;
        
        return {
          width,
          height,
          pixelCount,
          avgColor: [rSum / pixelCount, gSum / pixelCount, bSum / pixelCount],
          minColor: [rMin, gMin, bMin],
          maxColor: [rMax, gMax, bMax],
          colorRange: [rMax - rMin, gMax - gMin, bMax - bMin],
          edgeRatio: edgePixels / pixelCount,
          histograms: {
            r: rHist,
            g: gHist,
            b: bHist
          }
        };
      }
      
      function adaptiveSegmentation(imageData, settings, stats) {
        const { width, height, data } = imageData;
        const pixelCount = width * height;
        const mask = new Float32Array(pixelCount);
        
        // Decide which algorithm to use based on image characteristics
        let algorithm = 'color';
        
        // Use edge-based algorithm if image has a lot of distinct edges
        if (stats.edgeRatio > 0.1) {
          algorithm = 'edge';
        }
        
        // Use color-based algorithm if image has clear color separation
        const colorVariance = stats.colorRange[0] + stats.colorRange[1] + stats.colorRange[2];
        if (colorVariance > 300) {
          algorithm = 'color';
        }
        
        // Detect solid color background
        const bgCandidate = detectPotentialBackground(imageData, stats);
        
        // Background probability threshold
        const sensitivity = settings.sensitivity / 100;
        const threshold = 0.5 - (sensitivity * 0.3);
        
        // Process each pixel
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const idx = i * 4;
            
            // Get pixel color
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Calculate background probability based on color distance
            let bgProb = 0;
            
            // Distance to potential background color
            const colorDist = colorDistance([r, g, b], bgCandidate);
            bgProb = Math.min(colorDist / 255, 1.0);
            
            // Edge detection (for objects with similar color to background)
            let edgeValue = 0;
            if (settings.edgeDetection && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
              edgeValue = calculateEdgeValue(imageData, x, y, width);
            }
            
            // Combine probabilities (higher edge value decreases background probability)
            bgProb = Math.max(0, bgProb - (edgeValue * 0.5));
            
            // Apply foreground bias
            const bias = (settings.foregroundBias - 50) / 100;
            bgProb = Math.max(0, Math.min(1, bgProb + bias));
            
            // Set mask value (1 for foreground, 0 for background)
            mask[i] = bgProb > threshold ? 0.0 : 1.0;
          }
        }
        
        return mask;
      }
      
      function colorBasedSegmentation(imageData, settings, stats) {
        const { width, height, data } = imageData;
        const pixelCount = width * height;
        const mask = new Float32Array(pixelCount);
        
        // Detect background color
        const bgColor = detectPotentialBackground(imageData, stats);
        
        // Background probability threshold
        const sensitivity = settings.sensitivity / 100;
        const threshold = 0.3 - (sensitivity * 0.2);
        
        // Process each pixel
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const idx = i * 4;
            
            // Get pixel color
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Calculate color distance to background
            const dist = colorDistance([r, g, b], bgColor) / 255;
            
            // Apply foreground bias
            const bias = (settings.foregroundBias - 50) / 100;
            const adjustedDist = Math.max(0, Math.min(1, dist + bias));
            
            // Set mask value (1 for foreground, 0 for background)
            mask[i] = adjustedDist < threshold ? 0.0 : 1.0;
          }
        }
        
        return mask;
      }
      
      function edgeBasedSegmentation(imageData, settings, stats) {
        const { width, height, data } = imageData;
        const pixelCount = width * height;
        const mask = new Float32Array(pixelCount);
        
        // Create edge map
        const edgeMap = new Float32Array(pixelCount);
        
        // Compute edge map
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            edgeMap[i] = calculateEdgeValue(imageData, x, y, width);
          }
        }
        
        // Detect foreground based on edges and fill
        const visited = new Uint8Array(pixelCount);
        const queue = [];
        
        // Start from the edges
        const edgeThreshold = 0.2;
        for (let i = 0; i < pixelCount; i++) {
          if (edgeMap[i] > edgeThreshold) {
            mask[i] = 1.0; // Mark edge pixels as foreground
            
            // Add neighbors to the queue
            const x = i % width;
            const y = Math.floor(i / width);
            
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const ni = ny * width + nx;
                  if (!visited[ni] && edgeMap[ni] <= edgeThreshold) {
                    queue.push(ni);
                    visited[ni] = 1;
                  }
                }
              }
            }
          }
        }
        
        // Flood fill from edges
        while (queue.length > 0) {
          const i = queue.shift();
          const x = i % width;
          const y = Math.floor(i / width);
          
          // Check if this pixel should be foreground
          const idx = i * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Simple classifier (can be improved)
          let isForeground = false;
          
          // Check similarity to neighboring foreground pixels
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const ni = ny * width + nx;
                if (mask[ni] > 0.5) { // If neighbor is foreground
                  const nidx = ni * 4;
                  const nr = data[nidx];
                  const ng = data[nidx + 1];
                  const nb = data[nidx + 2];
                  
                  const colorDist = Math.sqrt(
                    Math.pow(r - nr, 2) + 
                    Math.pow(g - ng, 2) + 
                    Math.pow(b - nb, 2)
                  );
                  
                  if (colorDist < 30) {
                    isForeground = true;
                    break;
                  }
                }
              }
            }
            if (isForeground) break;
          }
          
          if (isForeground) {
            mask[i] = 1.0;
            
            // Add unvisited neighbors to the queue
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const ni = ny * width + nx;
                  if (!visited[ni]) {
                    queue.push(ni);
                    visited[ni] = 1;
                  }
                }
              }
            }
          }
        }
        
        // Apply bias
        const bias = (settings.foregroundBias - 50) / 200; // Convert to [-0.25, 0.25]
        
        for (let i = 0; i < pixelCount; i++) {
          mask[i] = Math.max(0, Math.min(1, mask[i] + bias));
        }
        
        return mask;
      }
      
      function trimapBasedSegmentation(imageData, settings, stats) {
        const { width, height, data } = imageData;
        const pixelCount = width * height;
        const mask = new Float32Array(pixelCount);
        
        // Create trimap (0 for definite background, 1 for definite foreground, 0.5 for unknown)
        const trimap = new Float32Array(pixelCount);
        
        // Initialize trimap with a simple scheme (can be improved)
        // Mark the border pixels as definite background
        const borderSize = Math.max(5, Math.floor(Math.min(width, height) * 0.02));
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            
            if (x < borderSize || x >= width - borderSize || 
                y < borderSize || y >= height - borderSize) {
              trimap[i] = 0.0; // Definite background
            } else {
              trimap[i] = 0.5; // Unknown
            }
          }
        }
        
        // Detect potential background and foreground colors
        const bgColor = detectPotentialBackground(imageData, stats);
        const fgColor = detectPotentialForeground(imageData, stats, bgColor);
        
        // Mark definite foreground and background based on color similarity
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (trimap[i] === 0.5) { // Only process unknown regions
              const idx = i * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              const distToBg = colorDistance([r, g, b], bgColor);
              const distToFg = colorDistance([r, g, b], fgColor);
              
              // Clear background/foreground if very similar
              if (distToBg < 20) {
                trimap[i] = 0.0;
              } else if (distToFg < 20) {
                trimap[i] = 1.0;
              }
            }
          }
        }
        
        // Solve alpha matting problem
        solveMattingProblem(imageData, trimap, mask);
        
        return mask;
      }
      
      function solveMattingProblem(imageData, trimap, mask) {
        // This is a simplified alpha matting solver
        // A full implementation would use a more sophisticated algorithm
        const { width, height, data } = imageData;
        
        // First pass: propagate definite foreground/background
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            
            if (trimap[i] === 0.0) {
              mask[i] = 0.0; // Definite background
            } else if (trimap[i] === 1.0) {
              mask[i] = 1.0; // Definite foreground
            } else {
              // For unknown regions, initialize based on color similarity
              const idx = i * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              let fgCount = 0;
              let bgCount = 0;
              let fgSimilarity = 0;
              let bgSimilarity = 0;
              
              // Check surrounding pixels
              for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const ni = ny * width + nx;
                    const nidx = ni * 4;
                    
                    if (trimap[ni] === 1.0) { // Foreground
                      fgCount++;
                      
                      const nr = data[nidx];
                      const ng = data[nidx + 1];
                      const nb = data[nidx + 2];
                      
                      const similarity = 1.0 - (
                        Math.abs(r - nr) + 
                        Math.abs(g - ng) + 
                        Math.abs(b - nb)
                      ) / 765;
                      
                      fgSimilarity += similarity;
                    } else if (trimap[ni] === 0.0) { // Background
                      bgCount++;
                      
                      const nr = data[nidx];
                      const ng = data[nidx + 1];
                      const nb = data[nidx + 2];
                      
                      const similarity = 1.0 - (
                        Math.abs(r - nr) + 
                        Math.abs(g - ng) + 
                        Math.abs(b - nb)
                      ) / 765;
                      
                      bgSimilarity += similarity;
                    }
                  }
                }
              }
              
              // Calculate average similarities
              fgSimilarity = fgCount > 0 ? fgSimilarity / fgCount : 0;
              bgSimilarity = bgCount > 0 ? bgSimilarity / bgCount : 0;
              
              // Calculate alpha based on relative similarity
              const totalSimilarity = fgSimilarity + bgSimilarity;
              if (totalSimilarity > 0) {
                mask[i] = fgSimilarity / totalSimilarity;
              } else {
                // Default to middle value if no known neighbors
                mask[i] = 0.5;
              }
            }
          }
        }
        
        // Second pass: refine with several iterations
        const tempMask = new Float32Array(mask.length);
        const iterations = 3;
        
        for (let iter = 0; iter < iterations; iter++) {
          // Copy current mask
          tempMask.set(mask);
          
          // Refine unknown regions
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = y * width + x;
              
              if (trimap[i] === 0.5) { // Only refine unknown regions
                const idx = i * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                let sum = 0;
                let weight = 0;
                
                // Average neighbors with color-based weighting
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                      const ni = ny * width + nx;
                      const nidx = ni * 4;
                      
                      const nr = data[nidx];
                      const ng = data[nidx + 1];
                      const nb = data[nidx + 2];
                      
                      // Calculate color-based weight
                      const colorDist = Math.sqrt(
                        Math.pow(r - nr, 2) + 
                        Math.pow(g - ng, 2) + 
                        Math.pow(b - nb, 2)
                      );
                      
                      const w = Math.exp(-colorDist / 30);
                      
                      sum += tempMask[ni] * w;
                      weight += w;
                    }
                  }
                }
                
                if (weight > 0) {
                  mask[i] = sum / weight;
                }
              }
            }
          }
        }
        
        // Final threshold tuning
        for (let i = 0; i < mask.length; i++) {
          if (trimap[i] === 0.5) { // Only process unknown regions
            // Apply sigmoid function to sharpen the mask
            mask[i] = 1.0 / (1.0 + Math.exp(-12 * (mask[i] - 0.5)));
          }
        }
      }
      
      function detectPotentialBackground(imageData, stats) {
        const { width, height, data } = imageData;
        
        // Simple method: analyze the border pixels
        const borderPixels = [];
        const borderSize = Math.max(2, Math.floor(Math.min(width, height) * 0.01));
        
        // Sample from the borders
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (x < borderSize || x >= width - borderSize || 
                y < borderSize || y >= height - borderSize) {
              const idx = (y * width + x) * 4;
              borderPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
            }
          }
        }
        
        // Use k-means to find the dominant color in border
        const k = 3; // Number of clusters
        const clusters = kMeansClustering(borderPixels, k);
        
        // Find the largest cluster
        let largestCluster = 0;
        let maxSize = 0;
        
        for (let i = 0; i < k; i++) {
          if (clusters.sizes[i] > maxSize) {
            maxSize = clusters.sizes[i];
            largestCluster = i;
          }
        }
        
        // Return the center of the largest cluster
        return clusters.centers[largestCluster];
      }
      
      function detectPotentialForeground(imageData, stats, bgColor) {
        const { width, height, data } = imageData;
        
        // Sample colors from the center region
        const centerPixels = [];
        const sampleSize = Math.max(10, Math.floor(Math.min(width, height) * 0.2));
        const startX = Math.floor((width - sampleSize) / 2);
        const startY = Math.floor((height - sampleSize) / 2);
        
        for (let y = startY; y < startY + sampleSize; y++) {
          for (let x = startX; x < startX + sampleSize; x++) {
            const idx = (y * width + x) * 4;
            const pixel = [data[idx], data[idx + 1], data[idx + 2]];
            
            // Only include if not similar to background
            if (colorDistance(pixel, bgColor) > 50) {
              centerPixels.push(pixel);
            }
          }
        }
        
        if (centerPixels.length === 0) {
          // No distinct foreground found, use complementary color
          return [
            255 - bgColor[0],
            255 - bgColor[1],
            255 - bgColor[2]
          ];
        }
        
        // Use k-means to find dominant foreground color
        const k = 2;
        const clusters = kMeansClustering(centerPixels, k);
        
        // Find the largest cluster
        let largestCluster = 0;
        let maxSize = 0;
        
        for (let i = 0; i < k; i++) {
          if (clusters.sizes[i] > maxSize) {
            maxSize = clusters.sizes[i];
            largestCluster = i;
          }
        }
        
        return clusters.centers[largestCluster];
      }
      
      function kMeansClustering(points, k) {
        if (points.length === 0) {
          return {
            centers: Array(k).fill([0, 0, 0]),
            sizes: Array(k).fill(0)
          };
        }
        
        // Initialize centers randomly
        const centers = [];
        for (let i = 0; i < k; i++) {
          const randomIndex = Math.floor(Math.random() * points.length);
          centers.push([...points[randomIndex]]);
        }
        
        const assignments = new Array(points.length).fill(0);
        const iterations = 10;
        
        // Run k-means
        for (let iter = 0; iter < iterations; iter++) {
          // Assign points to clusters
          for (let i = 0; i < points.length; i++) {
            let minDist = Infinity;
            let bestCluster = 0;
            
            for (let j = 0; j < k; j++) {
              const dist = colorDistance(points[i], centers[j]);
              if (dist < minDist) {
                minDist = dist;
                bestCluster = j;
              }
            }
            
            assignments[i] = bestCluster;
          }
          
          // Update centers
          const sums = Array(k).fill().map(() => [0, 0, 0]);
          const counts = Array(k).fill(0);
          
          for (let i = 0; i < points.length; i++) {
            const cluster = assignments[i];
            counts[cluster]++;
            
            sums[cluster][0] += points[i][0];
            sums[cluster][1] += points[i][1];
            sums[cluster][2] += points[i][2];
          }
          
          for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
              centers[j] = [
                Math.round(sums[j][0] / counts[j]),
                Math.round(sums[j][1] / counts[j]),
                Math.round(sums[j][2] / counts[j])
              ];
            }
          }
        }
        
        // Count final cluster sizes
        const sizes = Array(k).fill(0);
        for (let i = 0; i < assignments.length; i++) {
          sizes[assignments[i]]++;
        }
        
        return { centers, sizes };
      }
      
      function calculateEdgeValue(imageData, x, y, width) {
        const { data } = imageData;
        const idx = (y * width + x) * 4;
        
        // Get surrounding pixels
        const idxLeft = (y * width + (x - 1)) * 4;
        const idxRight = (y * width + (x + 1)) * 4;
        const idxTop = ((y - 1) * width + x) * 4;
        const idxBottom = ((y + 1) * width + x) * 4;
        
        // Calculate horizontal and vertical gradients
        const diffX = Math.abs(data[idxLeft] - data[idxRight]) + 
                     Math.abs(data[idxLeft + 1] - data[idxRight + 1]) + 
                     Math.abs(data[idxLeft + 2] - data[idxRight + 2]);
                     
        const diffY = Math.abs(data[idxTop] - data[idxBottom]) + 
                     Math.abs(data[idxTop + 1] - data[idxBottom + 1]) + 
                     Math.abs(data[idxTop + 2] - data[idxBottom + 2]);
        
        // Combine gradients and normalize
        return Math.min(1.0, (diffX + diffY) / 765);
      }
      
      function colorDistance(color1, color2) {
        // Weighted RGB distance (human perception)
        return Math.sqrt(
          3 * Math.pow(color1[0] - color2[0], 2) + 
          4 * Math.pow(color1[1] - color2[1], 2) + 
          2 * Math.pow(color1[2] - color2[2], 2)
        );
      }
      
      function refineMask(mask, imageData, settings) {
        const { width, height } = imageData;
        const result = new Float32Array(mask.length);
        result.set(mask);
        
        // Apply smoothing/refinement
        const smoothingLevel = settings.smoothing / 100;
        
        if (smoothingLevel > 0) {
          // Gaussian blur
          const sigma = 1 + smoothingLevel * 2;
          const kernelSize = Math.max(3, Math.ceil(sigma * 3)) | 1; // ensure odd
          const kernel = createGaussianKernel(kernelSize, sigma);
          
          // Apply convolution
          applyKernel(result, kernel, width, height);
        }
        
        // Apply threshold adjustment
        const bias = (settings.foregroundBias - 50) / 100;
        
        for (let i = 0; i < result.length; i++) {
          // Apply sigmoid function for smoother transitions
          const x = result[i] - 0.5 + bias;
          result[i] = 1.0 / (1.0 + Math.exp(-10 * x));
        }
        
        return result;
      }
      
      function createGaussianKernel(size, sigma) {
        const kernel = new Float32Array(size * size);
        const center = Math.floor(size / 2);
        let sum = 0;
        
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            
            kernel[y * size + x] = value;
            sum += value;
          }
        }
        
        // Normalize kernel
        for (let i = 0; i < kernel.length; i++) {
          kernel[i] /= sum;
        }
        
        return { data: kernel, width: size, height: size };
      }
      
      function applyKernel(mask, kernel, width, height) {
        const temp = new Float32Array(mask.length);
        const kw = kernel.width;
        const kh = kernel.height;
        const khalf = Math.floor(kw / 2);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sum = 0;
            let weightSum = 0;
            
            for (let ky = 0; ky < kh; ky++) {
              for (let kx = 0; kx < kw; kx++) {
                const sourceX = x + kx - khalf;
                const sourceY = y + ky - khalf;
                
                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                  const kernelValue = kernel.data[ky * kw + kx];
                  const maskValue = mask[sourceY * width + sourceX];
                  
                  sum += maskValue * kernelValue;
                  weightSum += kernelValue;
                }
              }
            }
            
            temp[y * width + x] = weightSum > 0 ? sum / weightSum : 0;
          }
        }
        
        // Copy back to the original mask
        mask.set(temp);
      }
      
      function applyMaskToImage(srcImageData, destImageData, mask, settings) {
        const { width, height, data } = srcImageData;
        
        // Apply the mask to each pixel
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const idx = i * 4;
            
            // Apply anti-fringing if enabled
            let alpha = mask[i];
            
            if (settings.defringing && alpha > 0.05 && alpha < 0.95) {
              // Get original color
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              // Find nearby fully background/foreground pixels
              let bgColor = null;
              let fgColor = null;
              
              for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const ni = ny * width + nx;
                    const nidx = ni * 4;
                    
                    if (mask[ni] < 0.1 && bgColor === null) {
                      bgColor = [data[nidx], data[nidx + 1], data[nidx + 2]];
                    } else if (mask[ni] > 0.9 && fgColor === null) {
                      fgColor = [data[nidx], data[nidx + 1], data[nidx + 2]];
                    }
                    
                    if (bgColor !== null && fgColor !== null) break;
                  }
                }
              }
              
              // Apply color decontamination if we found bg/fg samples
              if (bgColor !== null && fgColor !== null) {
                // Calculate color similarity to background
                const distToBg = colorDistance([r, g, b], bgColor);
                const distToFg = colorDistance([r, g, b], fgColor);
                
                // Adjust alpha based on color similarity
                if (distToBg < distToFg) {
                  // More similar to background, reduce alpha
                  alpha = Math.max(0, alpha - 0.2 * (1 - distToBg / 255));
                } else {
                  // More similar to foreground, increase alpha
                  alpha = Math.min(1, alpha + 0.2 * (1 - distToFg / 255));
                }
              }
            }
            
            // Set final pixel values
            destImageData.data[idx] = data[idx];
            destImageData.data[idx + 1] = data[idx + 1];
            destImageData.data[idx + 2] = data[idx + 2];
            destImageData.data[idx + 3] = Math.round(alpha * 255);
          }
        }
      }
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.processingWorker = new Worker(workerUrl);
    
    // Set up message handler
    this.processingWorker.onmessage = (e) => {
      const { type, progress, resultImageData, maskImageData, message } = e.data;
      
      switch (type) {
        case 'progress':
          this.updateProgress(progress);
          break;
        case 'complete':
          this.processingComplete(resultImageData, maskImageData);
          break;
        case 'error':
          this.handleProcessingError(message);
          break;
      }
    };
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
          --primary-color: #0078d4;
          --primary-hover: #006cbe;
          --bg-color: #f5f5f5;
          --border-color: #ddd;
          --text-color: #333;
          --text-secondary: #666;
          --success-color: #4CAF50;
          --warning-color: #ff9800;
          --error-color: #f44336;
        }
        
        * {
          box-sizing: border-box;
        }
        
        .remover-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-color);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .upload-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          margin: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .upload-area.drag-over {
          background-color: rgba(0, 120, 212, 0.05);
          border-color: var(--primary-color);
        }
        
        .upload-area svg {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          color: var(--text-secondary);
        }
        
        .upload-area h3 {
          margin: 0 0 8px 0;
          color: var(--text-color);
        }
        
        .supported-formats {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px !important;
        }
        
        .upload-area p {
          margin: 0;
          color: var(--text-secondary);
        }
        
        .upload-btn {
          background-color: var(--primary-color);
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
          background-color: var(--primary-hover);
        }
        
        .workspace {
          display: none;
          flex-direction: column;
          height: 100%;
        }
        
        .workspace-active .workspace {
          display: flex;
        }
        
        .workspace-active .upload-area {
          display: none;
        }
        
        .toolbar {
          display: flex;
          padding: 10px 20px;
          background-color: #fff;
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .tool-group {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .tool-button {
          background-color: #fff;
          border: none;
          border-right: 1px solid var(--border-color);
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }
        
        .tool-button:last-child {
          border-right: none;
        }
        
        .tool-button:hover {
          background-color: #f0f0f0;
        }
        
        .tool-button.active {
          background-color: var(--primary-color);
          color: white;
        }
        
        .tool-button svg {
          width: 16px;
          height: 16px;
          margin-right: 4px;
        }
        
        .workspace-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .editor-area {
          flex: 1;
          position: relative;
          background-color: #222;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        
        .canvas-container {
          position: relative;
          transform-origin: center;
          cursor: grab;
        }
        
        .canvas-container.drawing {
          cursor: crosshair;
        }
        
        .canvas-container.moving {
          cursor: grabbing;
        }
        
        #originalCanvas, #maskCanvas, #brushCanvas, #previewCanvas {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }
        
        #originalCanvas {
          z-index: 1;
        }
        
        #maskCanvas {
          z-index: 2;
          mix-blend-mode: multiply;
          opacity: 0.5;
        }
        
        #brushCanvas {
          z-index: 3;
          pointer-events: none;
        }
        
        #previewCanvas {
          z-index: 4;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .zoom-controls {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 2px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .zoom-btn {
          background: none;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .zoom-btn:hover {
          background-color: rgba(0,0,0,0.1);
        }
        
        .zoom-label {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          font-size: 12px;
          user-select: none;
        }
        
        .brush-size-indicator {
          position: absolute;
          pointer-events: none;
          border: 1px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 1px #000;
          transform: translate(-50%, -50%);
          z-index: 100;
          display: none;
        }
        
        .settings-panel {
          width: 280px;
          background-color: #fff;
          border-left: 1px solid var(--border-color);
          padding: 16px;
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.3s ease;
        }
        
        .settings-panel.open {
          transform: translateX(0);
        }
        
        .settings-group {
          margin-bottom: 20px;
        }
        
        .settings-group h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .settings-group h3 .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        
        .setting-item {
          margin-bottom: 12px;
        }
        
        .setting-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: var(--text-color);
          display: flex;
          justify-content: space-between;
        }
        
        .setting-value {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .slider-container {
          position: relative;
          height: 30px;
        }
        
        .slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          background: #ddd;
          border-radius: 4px;
          outline: none;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .radio-button {
          background-color: #f5f5f5;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .radio-button:hover {
          background-color: #e5e5e5;
        }
        
        .radio-button.active {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }
        
        .color-input {
          width: 40px;
          height: 24px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
        }
        
        .background-preview {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        
        .bg-option {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .bg-option:hover {
          transform: scale(1.05);
        }
        
        .bg-option.active {
          border: 2px solid var(--primary-color);
        }
        
        .bg-transparent {
          background-image: 
            linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 10px 10px;
          background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
        }
        
        .bg-white {
          background-color: white;
        }
        
        .bg-black {
          background-color: black;
        }
        
        .bg-custom {
          position: relative;
        }
        
        .bg-custom::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #f44336;
        }
        
        .bg-custom input {
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        
        .bg-image {
          font-size: 18px;
          color: var(--text-secondary);
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          margin-top: 8px;
          gap: 6px;
        }
        
        .checkbox-container label {
          font-size: 13px;
          color: var(--text-color);
          user-select: none;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 10;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        
        .loading-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-text {
          font-size: 16px;
          margin-bottom: 10px;
        }
        
        .progress-bar {
          width: 200px;
          height: 6px;
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background-color: var(--primary-color);
          width: 0%;
          transition: width 0.2s;
        }
        
        .progress-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .actions-panel {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: #fff;
          border-top: 1px solid var(--border-color);
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
          border: 1px solid var(--border-color);
          color: var(--text-color);
        }
        
        .btn-cancel:hover {
          background-color: #e5e5e5;
        }
        
        .btn-settings {
          background-color: #f5f5f5;
          border: 1px solid var(--border-color);
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-settings svg {
          width: 16px;
          height: 16px;
        }
        
        .btn-settings:hover {
          background-color: #e5e5e5;
        }
        
        .btn-apply {
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-apply svg {
          width: 16px;
          height: 16px;
        }
        
        .btn-apply:hover {
          background-color: var(--primary-hover);
        }
        
        .btn-preview {
          background-color: #f5f5f5;
          border: 1px solid var(--border-color);
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-preview svg {
          width: 16px;
          height: 16px;
        }
        
        .btn-preview:hover {
          background-color: #e5e5e5;
        }
        
        .hidden {
          display: none !important;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .toolbar {
            padding: 8px;
          }
          
          .settings-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 280px;
            z-index: 100;
          }
          
          .settings-panel.open {
            box-shadow: -2px 0 10px rgba(0,0,0,0.2);
          }
          
          .tool-button {
            padding: 6px 8px;
          }
          
          .tool-button span {
            display: none;
          }
          
          .tool-button svg {
            margin-right: 0;
          }
          
          .actions-panel {
            padding: 10px;
          }
          
          .btn {
            padding: 6px 12px;
            font-size: 13px;
          }
        }
        
        /* Animation keyframes */
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 120, 212, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(0, 120, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 120, 212, 0); }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
      </style>
      
      <div class="remover-container">
        <div class="upload-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3>Upload an image</h3>
          <p>Drag & drop or click to select</p>
          <p class="supported-formats">Supported formats: JPG, PNG, WEBP</p>
          <button class="upload-btn">Select Image</button>
          <input type="file" accept="image/*" style="display: none;" id="fileInput">
        </div>
        
        <div class="workspace">
          <div class="toolbar">
            <div class="tool-group">
              <button class="tool-button active" data-tool="auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Auto</span>
              </button>
              <button class="tool-button" data-tool="brush">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
                <span>Brush</span>
              </button>
              <button class="tool-button" data-tool="eraser">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L21 10C21.5 10.5 21.5 11.5 21 12L11 22"></path>
                </svg>
                <span>Eraser</span>
              </button>
              <button class="tool-button" data-tool="magic-wand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="6" cy="12" r="1"></circle>
                  <path d="M9 12a18 18 0 0 1 18 0"></path>
                  <path d="M9 12a18 18 0 0 0 18 0"></path>
                </svg>
                <span>Magic Wand</span>
              </button>
            </div>
            
            <div class="tool-group brushes-group hidden">
              <div class="slider-container" style="width: 100px;">
                <input type="range" min="1" max="100" value="20" class="slider" id="brushSizeSlider">
              </div>
              <div class="slider-container" style="width: 100px;">
                <input type="range" min="0" max="100" value="50" class="slider" id="brushSoftnessSlider">
              </div>
            </div>
            
            <div class="tool-group magic-wand-group hidden">
              <div class="slider-container" style="width: 100px;">
                <input type="range" min="1" max="100" value="30" class="slider" id="toleranceSlider">
              </div>
            </div>
          </div>
          
          <div class="workspace-main">
            <div class="editor-area">
              <div class="canvas-container">
                <canvas id="originalCanvas"></canvas>
                <canvas id="maskCanvas"></canvas>
                <canvas id="brushCanvas"></canvas>
                <canvas id="previewCanvas"></canvas>
              </div>
              
              <div class="brush-size-indicator"></div>
              
              <div class="zoom-controls">
                <button class="zoom-btn" id="zoomOutBtn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span class="zoom-label">100%</span>
                <button class="zoom-btn" id="zoomInBtn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button class="zoom-btn" id="resetZoomBtn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </button>
              </div>
              
              <div class="loading-overlay">
                <div class="spinner"></div>
                <div class="loading-text">Removing Background...</div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
                <div class="progress-text">0%</div>
              </div>
            </div>
            
            <div class="settings-panel">
              <div class="settings-group">
                <h3>
                  Detection Settings
                  <button class="toggle-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </h3>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Algorithm
                  </label>
                  <div class="radio-group">
                    <button class="radio-button active" data-algorithm="adaptive">Adaptive</button>
                    <button class="radio-button" data-algorithm="color">Color</button>
                    <button class="radio-button" data-algorithm="edge">Edge</button>
                    <button class="radio-button" data-algorithm="trimap">Trimap</button>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Sensitivity
                    <span class="setting-value">50</span>
                  </label>
                  <div class="slider-container">
                    <input type="range" min="0" max="100" value="50" class="slider" id="sensitivitySlider">
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Foreground Bias
                    <span class="setting-value">50</span>
                  </label>
                  <div class="slider-container">
                    <input type="range" min="0" max="100" value="50" class="slider" id="foregroundBiasSlider">
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Smoothing
                    <span class="setting-value">50</span>
                  </label>
                  <div class="slider-container">
                    <input type="range" min="0" max="100" value="50" class="slider" id="smoothingSlider">
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Detail Level
                  </label>
                  <div class="radio-group">
                    <button class="radio-button" data-detail="low">Low</button>
                    <button class="radio-button active" data-detail="medium">Medium</button>
                    <button class="radio-button" data-detail="high">High</button>
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="checkbox-container">
                    <input type="checkbox" id="edgeDetectionCheckbox" checked>
                    <label for="edgeDetectionCheckbox">Enable Edge Detection</label>
                  </div>
                </div>
              </div>
              
              <div class="settings-group">
                <h3>
                  Output Settings
                  <button class="toggle-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </h3>
                
                <div class="setting-item">
                  <label class="setting-label">Background</label>
                  <div class="background-preview">
                    <div class="bg-option bg-transparent active" data-bg="transparent"></div>
                    <div class="bg-option bg-white" data-bg="white"></div>
                    <div class="bg-option bg-black" data-bg="black"></div>
                    <div class="bg-option bg-custom" data-bg="custom">
                      <input type="color" id="bgColorPicker" value="#ff0000">
                    </div>
                    <div class="bg-option bg-image" data-bg="image">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Output Quality
                    <span class="setting-value">92%</span>
                  </label>
                  <div class="slider-container">
                    <input type="range" min="50" max="100" value="92" class="slider" id="qualitySlider">
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">Format</label>
                  <div class="radio-group">
                    <button class="radio-button active" data-format="png">PNG</button>
                    <button class="radio-button" data-format="webp">WebP</button>
                    <button class="radio-button" data-format="jpeg">JPEG</button>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Edge Refinement
                  </label>
                  <div class="radio-group">
                    <button class="radio-button" data-refinement="low">Low</button>
                    <button class="radio-button active" data-refinement="medium">Medium</button>
                    <button class="radio-button" data-refinement="high">High</button>
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="checkbox-container">
                    <input type="checkbox" id="defringingCheckbox" checked>
                    <label for="defringingCheckbox">Enable Defringing</label>
                  </div>
                </div>
              </div>
              
              <div class="settings-group">
                <h3>
                  Performance Settings
                  <button class="toggle-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </h3>
                
                <div class="setting-item">
                  <div class="checkbox-container">
                    <input type="checkbox" id="useGPUCheckbox" checked>
                    <label for="useGPUCheckbox">Use GPU acceleration (if available)</label>
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="checkbox-container">
                    <input type="checkbox" id="useWorkerCheckbox" checked>
                    <label for="useWorkerCheckbox">Use background processing</label>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label class="setting-label">
                    Max Processing Dimension
                  </label>
                  <div class="radio-group">
                    <button class="radio-button" data-max-dim="1024">1024px</button>
                    <button class="radio-button active" data-max-dim="2048">2048px</button>
                    <button class="radio-button" data-max-dim="4096">4096px</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="actions-panel">
            <div>
              <button class="btn btn-cancel" id="cancelBtn">Cancel</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-settings" id="settingsBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Settings
              </button>
              <button class="btn btn-preview" id="previewBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Preview
              </button>
              <button class="btn btn-apply" id="applyBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Upload area events
    const uploadArea = this.shadowRoot.querySelector('.upload-area');
    const fileInput = this.shadowRoot.querySelector('#fileInput');
    const uploadBtn = this.shadowRoot.querySelector('.upload-btn');
    
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
    
    // Toolbar events
    const toolButtons = this.shadowRoot.querySelectorAll('.tool-button');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tool = btn.getAttribute('data-tool');
        this.setActiveTool(tool);
      });
    });
    
    // Brush controls
    const brushSizeSlider = this.shadowRoot.querySelector('#brushSizeSlider');
    const brushSoftnessSlider = this.shadowRoot.querySelector('#brushSoftnessSlider');
    
    brushSizeSlider.addEventListener('input', () => {
      this.brushSize = parseInt(brushSizeSlider.value);
      this.updateBrushIndicator();
    });
    
    brushSoftnessSlider.addEventListener('input', () => {
      this.brushSoftness = parseInt(brushSoftnessSlider.value);
    });
    
    // Magic wand controls
    const toleranceSlider = this.shadowRoot.querySelector('#toleranceSlider');
    
    toleranceSlider.addEventListener('input', () => {
      this.tolerance = parseInt(toleranceSlider.value);
    });
    
    // Canvas events
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    
    canvasContainer.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
    canvasContainer.addEventListener('touchstart', this.onCanvasTouchStart.bind(this), { passive: false });
    
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.addEventListener('touchmove', this.onDocumentTouchMove.bind(this), { passive: false });
    
    document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    document.addEventListener('touchend', this.onDocumentTouchEnd.bind(this));
    
    // Zoom controls
    const zoomInBtn = this.shadowRoot.querySelector('#zoomInBtn');
    const zoomOutBtn = this.shadowRoot.querySelector('#zoomOutBtn');
    const resetZoomBtn = this.shadowRoot.querySelector('#resetZoomBtn');
    const zoomLabel = this.shadowRoot.querySelector('.zoom-label');
    
    zoomInBtn.addEventListener('click', () => {
      this.zoomLevel = Math.min(5, this.zoomLevel + 0.25);
      this.updateZoom();
      zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    });
    
    zoomOutBtn.addEventListener('click', () => {
      this.zoomLevel = Math.max(0.25, this.zoomLevel - 0.25);
      this.updateZoom();
      zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    });
    
    resetZoomBtn.addEventListener('click', () => {
      this.zoomLevel = 1;
      this.panOffset = { x: 0, y: 0 };
      this.updateZoom();
      zoomLabel.textContent = '100%';
    });
    
    // Mouse wheel zoom
    const editorArea = this.shadowRoot.querySelector('.editor-area');
    editorArea.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.zoomLevel = Math.max(0.25, Math.min(5, this.zoomLevel + delta));
        this.updateZoom();
        zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
      }
    });
    
    // Settings panel events
    const settingsBtn = this.shadowRoot.querySelector('#settingsBtn');
    const settingsPanel = this.shadowRoot.querySelector('.settings-panel');
    
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.toggle('open');
    });
    
    // Algorithm selection
    const algorithmButtons = this.shadowRoot.querySelectorAll('[data-algorithm]');
    algorithmButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        algorithmButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.autoMaskSettings.algorithm = btn.getAttribute('data-algorithm');
      });
    });
    
    // Detail level selection
    const detailButtons = this.shadowRoot.querySelectorAll('[data-detail]');
    detailButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        detailButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.autoMaskSettings.detailLevel = btn.getAttribute('data-detail');
      });
    });
    
    // Output format selection
    const formatButtons = this.shadowRoot.querySelectorAll('[data-format]');
    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        formatButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.outputSettings.format = btn.getAttribute('data-format');
      });
    });
    
    // Refinement level selection
    const refinementButtons = this.shadowRoot.querySelectorAll('[data-refinement]');
    refinementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        refinementButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.outputSettings.refinementLevel = btn.getAttribute('data-refinement');
      });
    });
    
    // Max dimension selection
    const maxDimButtons = this.shadowRoot.querySelectorAll('[data-max-dim]');
    maxDimButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        maxDimButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.maxDimension = parseInt(btn.getAttribute('data-max-dim'));
      });
    });
    
    // Background options
    const bgOptions = this.shadowRoot.querySelectorAll('.bg-option');
    bgOptions.forEach(option => {
      option.addEventListener('click', () => {
        bgOptions.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        const bgType = option.getAttribute('data-bg');
        
        if (bgType === 'transparent') {
          this.outputSettings.transparentBackground = true;
        } else {
          this.outputSettings.transparentBackground = false;
          
          if (bgType === 'white') {
            this.outputSettings.backgroundColor = '#ffffff';
          } else if (bgType === 'black') {
            this.outputSettings.backgroundColor = '#000000';
          } else if (bgType === 'custom') {
            this.outputSettings.backgroundColor = this.shadowRoot.querySelector('#bgColorPicker').value;
          } else if (bgType === 'image') {
            // Open a file picker to select background image
            const bgImageInput = document.createElement('input');
            bgImageInput.type = 'file';
            bgImageInput.accept = 'image/*';
            
            bgImageInput.addEventListener('change', () => {
              if (bgImageInput.files && bgImageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const img = new Image();
                  img.onload = () => {
                    this.outputSettings.backgroundImage = img;
                    this.outputSettings.transparentBackground = false;
                    
                    // Show a small preview of the background in the button
                    const bgImageOption = this.shadowRoot.querySelector('[data-bg="image"]');
                    bgImageOption.innerHTML = '';
                    const miniCanvas = document.createElement('canvas');
                    miniCanvas.width = 30;
                    miniCanvas.height = 30;
                    const ctx = miniCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 30, 30);
                    bgImageOption.appendChild(miniCanvas);
                  };
                  img.src = e.target.result;
                };
                reader.readAsDataURL(bgImageInput.files[0]);
              }
            });
            
            bgImageInput.click();
          }
          
          // Update preview if visible
          if (this.previewCanvas && this.previewCanvas.style.opacity > 0) {
            this.showPreview();
          }
        });
      });
    });
    
    // Custom background color picker
    const bgColorPicker = this.shadowRoot.querySelector('#bgColorPicker');
    bgColorPicker.addEventListener('input', () => {
      this.outputSettings.backgroundColor = bgColorPicker.value;
      
      // Update the custom color button background
      const bgCustomOption = this.shadowRoot.querySelector('.bg-custom');
      bgCustomOption.style.setProperty('--custom-bg-color', bgColorPicker.value);
      
      // Update preview if visible
      if (this.previewCanvas && this.previewCanvas.style.opacity > 0) {
        this.showPreview();
      }
    });
    
    // Sliders for auto mask settings
    const sensitivitySlider = this.shadowRoot.querySelector('#sensitivitySlider');
    const foregroundBiasSlider = this.shadowRoot.querySelector('#foregroundBiasSlider');
    const smoothingSlider = this.shadowRoot.querySelector('#smoothingSlider');
    
    sensitivitySlider.addEventListener('input', () => {
      const value = parseInt(sensitivitySlider.value);
      this.autoMaskSettings.sensitivity = value;
      this.shadowRoot.querySelector('label[for="sensitivitySlider"] .setting-value').textContent = value;
    });
    
    foregroundBiasSlider.addEventListener('input', () => {
      const value = parseInt(foregroundBiasSlider.value);
      this.autoMaskSettings.foregroundBias = value;
      this.shadowRoot.querySelector('label[for="foregroundBiasSlider"] .setting-value').textContent = value;
    });
    
    smoothingSlider.addEventListener('input', () => {
      const value = parseInt(smoothingSlider.value);
      this.autoMaskSettings.smoothing = value;
      this.shadowRoot.querySelector('label[for="smoothingSlider"] .setting-value').textContent = value;
    });
    
    // Quality slider
    const qualitySlider = this.shadowRoot.querySelector('#qualitySlider');
    qualitySlider.addEventListener('input', () => {
      const value = parseInt(qualitySlider.value);
      this.outputSettings.quality = value / 100;
      this.shadowRoot.querySelector('label[for="qualitySlider"] .setting-value').textContent = `${value}%`;
    });
    
    // Checkboxes
    const edgeDetectionCheckbox = this.shadowRoot.querySelector('#edgeDetectionCheckbox');
    const defringingCheckbox = this.shadowRoot.querySelector('#defringingCheckbox');
    const useGPUCheckbox = this.shadowRoot.querySelector('#useGPUCheckbox');
    const useWorkerCheckbox = this.shadowRoot.querySelector('#useWorkerCheckbox');
    
    edgeDetectionCheckbox.addEventListener('change', () => {
      this.autoMaskSettings.edgeDetection = edgeDetectionCheckbox.checked;
    });
    
    defringingCheckbox.addEventListener('change', () => {
      this.outputSettings.defringing = defringingCheckbox.checked;
    });
    
    useGPUCheckbox.addEventListener('change', () => {
      this.canUseGPU = useGPUCheckbox.checked;
    });
    
    useWorkerCheckbox.addEventListener('change', () => {
      this.useWorker = useWorkerCheckbox.checked;
      
      // Reinitialize worker if needed
      if (this.useWorker && !this.processingWorker) {
        this.initWorker();
      } else if (!this.useWorker && this.processingWorker) {
        this.processingWorker.terminate();
        this.processingWorker = null;
      }
    });
    
    // Disable GPU checkbox if not available
    if (!this.canUseGPU) {
      useGPUCheckbox.disabled = true;
      useGPUCheckbox.checked = false;
      this.shadowRoot.querySelector('label[for="useGPUCheckbox"]').style.color = '#999';
    }
    
    // Preview button
    const previewBtn = this.shadowRoot.querySelector('#previewBtn');
    previewBtn.addEventListener('click', () => {
      this.togglePreview();
    });
    
    // Apply button
    const applyBtn = this.shadowRoot.querySelector('#applyBtn');
    applyBtn.addEventListener('click', () => {
      this.downloadImage();
    });
    
    // Cancel button
    const cancelBtn = this.shadowRoot.querySelector('#cancelBtn');
    cancelBtn.addEventListener('click', () => {
      this.resetEditor();
      this.dispatchEvent(new CustomEvent('processingCancelled'));
    });
    
    // Settings group toggle
    const toggleButtons = this.shadowRoot.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const settingsGroup = btn.closest('.settings-group');
        const items = settingsGroup.querySelectorAll('.setting-item');
        
        btn.classList.toggle('collapsed');
        
        items.forEach(item => {
          item.classList.toggle('hidden');
        });
      });
    });
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.removeEventListener('touchmove', this.onDocumentTouchMove.bind(this));
    document.removeEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    document.removeEventListener('touchend', this.onDocumentTouchEnd.bind(this));
  }

  handleFileSelect(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: 'Please select a valid image file (JPG, PNG, WEBP).' }
      }));
      return;
    }
    
    // Validate file size
    const maxSize = this.getAttribute('maxImageSize') || 10; // in MB
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
        this.originalImage = img;
        this.setupEditor();
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  }

  setupEditor() {
    // Activate workspace
    const container = this.shadowRoot.querySelector('.remover-container');
    container.classList.add('workspace-active');
    
    // Set up canvases
    this.setupCanvases();
    
    // Set initial tool
    this.setActiveTool('auto');
    
    // Process image automatically
    this.processImage();
  }

  setupCanvases() {
    const originalCanvas = this.shadowRoot.querySelector('#originalCanvas');
    const maskCanvas = this.shadowRoot.querySelector('#maskCanvas');
    const brushCanvas = this.shadowRoot.querySelector('#brushCanvas');
    const previewCanvas = this.shadowRoot.querySelector('#previewCanvas');
    
    // Calculate dimensions
    let width = this.originalImage.naturalWidth;
    let height = this.originalImage.naturalHeight;
    
    // Scale down if larger than maxDimension
    if (width > this.maxDimension || height > this.maxDimension) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = this.maxDimension;
        height = width / aspectRatio;
      } else {
        height = this.maxDimension;
        width = height * aspectRatio;
      }
    }
    
    // Set dimensions for all canvases
    [originalCanvas, maskCanvas, brushCanvas, previewCanvas].forEach(canvas => {
      canvas.width = width;
      canvas.height = height;
    });
    
    // Draw original image
    const ctx = originalCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.originalImage, 0, 0, width, height);
    
    // Store reference to the image data
    this.image = ctx.getImageData(0, 0, width, height);
    
    // Clear other canvases
    maskCanvas.getContext('2d').clearRect(0, 0, width, height);
    brushCanvas.getContext('2d').clearRect(0, 0, width, height);
    previewCanvas.getContext('2d').clearRect(0, 0, width, height);
    
    // Reset zoom and pan
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    this.updateZoom();
  }

  setActiveTool(tool) {
    this.currentTool = tool;
    
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    const brushesGroup = this.shadowRoot.querySelector('.brushes-group');
    const magicWandGroup = this.shadowRoot.querySelector('.magic-wand-group');
    
    // Update cursor and tool controls visibility
    switch (tool) {
      case 'auto':
        canvasContainer.classList.remove('drawing');
        brushesGroup.classList.add('hidden');
        magicWandGroup.classList.add('hidden');
        break;
      case 'brush':
      case 'eraser':
        canvasContainer.classList.add('drawing');
        brushesGroup.classList.remove('hidden');
        magicWandGroup.classList.add('hidden');
        this.updateBrushIndicator();
        break;
      case 'magic-wand':
        canvasContainer.classList.remove('drawing');
        brushesGroup.classList.add('hidden');
        magicWandGroup.classList.remove('hidden');
        break;
    }
  }

  updateBrushIndicator() {
    const indicator = this.shadowRoot.querySelector('.brush-size-indicator');
    
    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      indicator.style.width = `${this.brushSize}px`;
      indicator.style.height = `${this.brushSize}px`;
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  updateZoom() {
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    
    canvasContainer.style.transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.zoomLevel})`;
  }

  onCanvasMouseDown(e) {
    if (!this.image) return;
    
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    
    // Calculate canvas-relative coordinates
    const x = (e.clientX - rect.left) / this.zoomLevel;
    const y = (e.clientY - rect.top) / this.zoomLevel;
    
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey || this.currentTool === 'auto'))) {
      // Middle button or Ctrl+left button for panning
      this.isPanning = true;
      canvasContainer.classList.add('moving');
      this.panStart = {
        x: e.clientX - this.panOffset.x,
        y: e.clientY - this.panOffset.y
      };
    } else if (e.button === 0) {
      // Left button for drawing/erasing/magic wand
      if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
        this.draw(x, y, false);
      } else if (this.currentTool === 'magic-wand') {
        this.useMagicWand(x, y);
      }
    }
  }

  onCanvasTouchStart(e) {
    if (!this.image) return;
    e.preventDefault();
    
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Calculate canvas-relative coordinates
      const x = (touch.clientX - rect.left) / this.zoomLevel;
      const y = (touch.clientY - rect.top) / this.zoomLevel;
      
      if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
        this.draw(x, y, false);
      } else if (this.currentTool === 'magic-wand') {
        this.useMagicWand(x, y);
      } else {
        // Pan with one finger when not in drawing mode
        this.isPanning = true;
        canvasContainer.classList.add('moving');
        this.panStart = {
          x: touch.clientX - this.panOffset.x,
          y: touch.clientY - this.panOffset.y
        };
      }
    } else if (e.touches.length === 2) {
      // Pan with two fingers in any mode
      this.isDrawing = false;
      this.isPanning = true;
      canvasContainer.classList.add('moving');
      
      const touch = e.touches[0];
      this.panStart = {
        x: touch.clientX - this.panOffset.x,
        y: touch.clientY - this.panOffset.y
      };
    }
    
    // Update brush position
    this.updateBrushPosition(e);
  }

  onDocumentMouseMove(e) {
    if (!this.image) return;
    
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    
    // Calculate canvas-relative coordinates
    const x = (e.clientX - rect.left) / this.zoomLevel;
    const y = (e.clientY - rect.top) / this.zoomLevel;
    
    if (this.isPanning) {
      this.panOffset = {
        x: e.clientX - this.panStart.x,
        y: e.clientY - this.panStart.y
      };
      this.updateZoom();
    } else if (this.isDrawing) {
      this.draw(x, y, true);
      this.lastX = x;
      this.lastY = y;
    }
    
    // Update brush indicator position
    this.updateBrushPosition(e);
  }

  onDocumentTouchMove(e) {
    if (!this.image) return;
    e.preventDefault();
    
    const canvasContainer = this.shadowRoot.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    
    if (e.touches.length === 1 && this.isDrawing) {
      const touch = e.touches[0];
      
      // Calculate canvas-relative coordinates
      const x = (touch.clientX - rect.left) / this.zoomLevel;
      const y = (touch.clientY - rect.top) / this.zoomLevel;
      
      this.draw(x, y, true);
      this.lastX = x;
      this.lastY = y;
    } else if (e.touches.length >= 1 && this.isPanning) {
      const touch = e.touches[0];
      
      this.panOffset = {
        x: touch.clientX - this.panStart.x,
        y: touch.clientY - this.panStart.y
      };
      this.updateZoom();
    }
    
    // Update brush position
    this.updateBrushPosition(e);
  }

  onDocumentMouseUp() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.updateMaskFromBrush();
    }
    
    if (this.isPanning) {
      this.isPanning = false;
      this.shadowRoot.querySelector('.canvas-container').classList.remove('moving');
    }
  }

  onDocumentTouchEnd() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.updateMaskFromBrush();
    }
    
    if (this.isPanning) {
      this.isPanning = false;
      this.shadowRoot.querySelector('.canvas-container').classList.remove('moving');
    }
  }

  updateBrushPosition(e) {
    if (!this.image) return;
    
    // Only show for brush/eraser tools
    if (this.currentTool !== 'brush' && this.currentTool !== 'eraser') return;
    
    const indicator = this.shadowRoot.querySelector('.brush-size-indicator');
    
    // Get position from mouse or touch event
    let clientX, clientY;
    
    if (e.touches) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    indicator.style.left = `${clientX}px`;
    indicator.style.top = `${clientY}px`;
  }

  draw(x, y, isMove) {
    if (!this.brushCanvas) return;
    
    const ctx = this.brushCanvas.getContext('2d');
    
    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      ctx.globalCompositeOperation = this.currentTool === 'brush' ? 'source-over' : 'destination-out';
      
      // Calculate brush opacity based on softness
      const opacity = 1 - (this.brushSoftness / 100) * 0.8;
      const color = this.currentTool === 'brush' ? 'rgba(255, 255, 255, ' + opacity + ')' : 'rgba(0, 0, 0, ' + opacity + ')';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = this.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (isMove) {
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  updateMaskFromBrush() {
    if (!this.maskCanvas || !this.brushCanvas) return;
    
    // Merge brush canvas with mask canvas
    const maskCtx = this.maskCanvas.getContext('2d');
    
    // Draw brush strokes onto mask
    maskCtx.drawImage(this.brushCanvas, 0, 0);
    
    // Clear brush canvas for next strokes
    const brushCtx = this.brushCanvas.getContext('2d');
    brushCtx.clearRect(0, 0, this.brushCanvas.width, this.brushCanvas.height);
  }

  useMagicWand(x, y) {
    if (!this.image) return;
    
    // Convert to integer coordinates
    x = Math.floor(x);
    y = Math.floor(y);
    
    // Make sure coordinates are within bounds
    if (x < 0 || y < 0 || x >= this.image.width || y >= this.image.height) return;
    
    // Get pixel at click position
    const idx = (y * this.image.width + x) * 4;
    const targetColor = [
      this.image.data[idx],
      this.image.data[idx + 1],
      this.image.data[idx + 2]
    ];
    
    // Show loading indicator
    this.showLoadingOverlay();
    
    // Use setTimeout to allow UI to update before processing
    setTimeout(() => {
      this.floodFill(x, y, targetColor, this.tolerance);
      this.hideLoadingOverlay();
    }, 50);
  }

  floodFill(startX, startY, targetColor, tolerance) {
    const width = this.image.width;
    const height = this.image.height;
    const maskCanvas = this.maskCanvas;
    const maskCtx = maskCanvas.getContext('2d');
    
    // Get current mask data
    const maskData = maskCtx.getImageData(0, 0, width, height);
    
    // Create visited array
    const visited = new Uint8Array(width * height);
    
    // Queue for flood fill
    const queue = [];
    queue.push([startX, startY]);
    visited[startY * width + startX] = 1;
    
    // Get target mask value (0 = background, 255 = foreground)
    // If we clicked on an already marked foreground pixel, we're removing from selection
    const targetIdx = (startY * width + startX) * 4;
    const maskValue = maskData.data[targetIdx] > 128 ? 0 : 255;
    
    // Process queue
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const idx = (y * width + x) * 4;
      
      // Set mask pixel
      maskData.data[idx] = maskValue;
      maskData.data[idx + 1] = maskValue;
      maskData.data[idx + 2] = maskValue;
      maskData.data[idx + 3] = 255;
      
      // Check 4-connected neighbors
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        // Check bounds
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        
        const ni = ny * width + nx;
        
        // Skip if already visited
        if (visited[ni]) continue;
        
        // Get neighbor pixel color
        const nidx = ni * 4;
        const neighborColor = [
          this.image.data[nidx],
          this.image.data[nidx + 1],
          this.image.data[nidx + 2]
        ];
        
        // Check if color is similar enough
        const colorDist = this.colorDistance(targetColor, neighborColor);
        
        if (colorDist <= tolerance) {
          queue.push([nx, ny]);
          visited[ni] = 1;
        }
      }
    }
    
    // Update mask canvas
    maskCtx.putImageData(maskData, 0, 0);
  }

  colorDistance(color1, color2) {
    // Simple Euclidean distance in RGB space
    return Math.sqrt(
      Math.pow(color1[0] - color2[0], 2) +
      Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2)
    );
  }

  processImage() {
    if (!this.image) return;
    
    // Show loading overlay
    this.showLoadingOverlay();
    
    // Reset processing progress
    this.processingProgress = 0;
    this.updateProgress(0);
    
    if (this.useWorker && this.processingWorker) {
      // Process in worker thread
      this.processingWorker.postMessage({
        command: 'removeBackground',
        imageData: this.image,
        settings: this.autoMaskSettings
      });
    } else {
      // Process in main thread (fallback)
      setTimeout(() => {
        try {
          this.processImageMainThread();
        } catch (error) {
          this.handleProcessingError(error.message);
        }
      }, 100);
    }
  }

  processImageMainThread() {
    // This is a simplified version of the algorithm for main thread processing
    // It doesn't include all the features of the worker version
    const { width, height, data } = this.image;
    
    // Create mask canvas
    const maskCanvas = this.maskCanvas;
    const maskCtx = maskCanvas.getContext('2d');
    
    // Create result canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d');
    
    // Update progress
    this.updateProgress(10);
    
    // Detect potential background color (simplified)
    const bgColor = this.detectBackground();
    
    // Update progress
    this.updateProgress(30);
    
    // Create mask based on color distance
    const maskData = maskCtx.createImageData(width, height);
    const sensitivity = this.autoMaskSettings.sensitivity / 100;
    const threshold = 0.3 - (sensitivity * 0.2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const idx = i * 4;
        
        // Get pixel color
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate color distance to background
        const dist = this.colorDistance([r, g, b], bgColor) / 255;
        
        // Apply foreground bias
        const bias = (this.autoMaskSettings.foregroundBias - 50) / 100;
        const adjustedDist = Math.max(0, Math.min(1, dist + bias));
        
        // Set mask value (1 for foreground, 0 for background)
        const maskValue = adjustedDist < threshold ? 0 : 255;
        
        maskData.data[idx] = maskValue;
        maskData.data[idx + 1] = maskValue;
        maskData.data[idx + 2] = maskValue;
        maskData.data[idx + 3] = 255;
      }
      
      // Update progress periodically
      if (y % 20 === 0) {
        const progress = 30 + (y / height) * 40;
        this.updateProgress(progress);
      }
    }
    
    // Apply smoothing
    this.smoothMask(maskData, width, height);
    
    // Update progress
    this.updateProgress(80);
    
    // Draw the mask
    maskCtx.putImageData(maskData, 0, 0);
    
    // Create result with transparent background
    this.createFinalResult();
    
    // Update progress to complete
    this.updateProgress(100);
    
    // Hide loading overlay
    setTimeout(() => {
      this.hideLoadingOverlay();
    }, 500);
  }

  detectBackground() {
    // Simplified background detection
    // Samples the border pixels
    const { width, height, data } = this.image;
    const borderPixels = [];
    const borderSize = 2;
    
    // Sample from the borders
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x < borderSize || x >= width - borderSize || 
            y < borderSize || y >= height - borderSize) {
          const idx = (y * width + x) * 4;
          borderPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
    }
    
    // Find average color
    let rSum = 0, gSum = 0, bSum = 0;
    
    for (const pixel of borderPixels) {
      rSum += pixel[0];
      gSum += pixel[1];
      bSum += pixel[2];
    }
    
    return [
      Math.round(rSum / borderPixels.length),
      Math.round(gSum / borderPixels.length),
      Math.round(bSum / borderPixels.length)
    ];
  }

  smoothMask(maskData, width, height) {
    // Simple box blur for smoothing
    const tempData = new Uint8ClampedArray(maskData.data);
    const kernelSize = Math.max(1, Math.floor(this.autoMaskSettings.smoothing / 20));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        let sum = 0;
        let count = 0;
        
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const nx = x + kx;
            const ny = y + ky;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = (ny * width + nx) * 4;
              sum += tempData[nidx];
              count++;
            }
          }
        }
        
        const avg = count > 0 ? sum / count : 0;
        
        // Apply threshold to make it either black or white
        const threshold = 128;
        const value = avg > threshold ? 255 : 0;
        
        maskData.data[idx] = value;
        maskData.data[idx + 1] = value;
        maskData.data[idx + 2] = value;
      }
    }
  }

  updateProgress(progress) {
    this.processingProgress = progress;
    
    const progressFill = this.shadowRoot.querySelector('.progress-fill');
    const progressText = this.shadowRoot.querySelector('.progress-text');
    
    if (progressFill && progressText) {
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;
    }
    
    // Dispatch progress event
    this.dispatchEvent(new CustomEvent('processingProgress', {
      detail: { progress: progress }
    }));
  }

  showLoadingOverlay() {
    const overlay = this.shadowRoot.querySelector('.loading-overlay');
    overlay.classList.add('active');
  }

  hideLoadingOverlay() {
    const overlay = this.shadowRoot.querySelector('.loading-overlay');
    overlay.classList.remove('active');
  }

  processingComplete(resultImageData, maskImageData) {
    // Update mask canvas
    if (maskImageData) {
      const maskCtx = this.maskCanvas.getContext('2d');
      maskCtx.putImageData(maskImageData, 0, 0);
    }
    
    // Create final result with transparent background
    this.createFinalResult();
    
    // Hide loading overlay
    setTimeout(() => {
      this.hideLoadingOverlay();
      
      // Dispatch completion event
      this.dispatchEvent(new CustomEvent('processingComplete'));
    }, 500);
  }

  createFinalResult() {
    if (!this.image || !this.maskCanvas) return;
    
    // Get the mask
    const maskCtx = this.maskCanvas.getContext('2d');
    const maskData = maskCtx.getImageData(0, 0, this.image.width, this.image.height);
    
    // Create result canvas
    this.resultCanvas = document.createElement('canvas');
    this.resultCanvas.width = this.image.width;
    this.resultCanvas.height = this.image.height;
    const resultCtx = this.resultCanvas.getContext('2d');
    
    // Create result image data
    const resultData = resultCtx.createImageData(this.image.width, this.image.height);
    
    // Apply mask to original image
    for (let i = 0; i < this.image.data.length; i += 4) {
      const alpha = maskData.data[i]; // Use red channel as alpha
      
      resultData.data[i] = this.image.data[i];
      resultData.data[i + 1] = this.image.data[i + 1];
      resultData.data[i + 2] = this.image.data[i + 2];
      resultData.data[i + 3] = alpha;
      
      // Apply defringing if enabled
      if (this.outputSettings.defringing && alpha > 0 && alpha < 255) {
        // Simple defringing by pushing semi-transparent pixels to either fully transparent or fully opaque
        resultData.data[i + 3] = alpha < 128 ? 0 : 255;
      }
    }
    
    // Put the result
    resultCtx.putImageData(resultData, 0, 0);
  }

  handleProcessingError(message) {
    this.hideLoadingOverlay();
    
    // Dispatch error event
    this.dispatchEvent(new CustomEvent('error', {
      detail: { message: message || 'Error processing image.' }
    }));
  }

  togglePreview() {
    if (!this.previewCanvas) return;
    
    const isVisible = this.previewCanvas.style.opacity > 0;
    
    if (isVisible) {
      // Hide preview
      this.previewCanvas.style.opacity = '0';
    } else {
      // Show preview
      this.showPreview();
    }
  }

  showPreview() {
    if (!this.resultCanvas || !this.previewCanvas) return;
    
    const previewCtx = this.previewCanvas.getContext('2d');
    
    // Clear the canvas
    previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    
    if (this.outputSettings.transparentBackground) {
      // Draw checkerboard pattern for transparency
      this.drawCheckerboard(previewCtx);
    } else if (this.outputSettings.backgroundImage) {
      // Draw image background
      previewCtx.drawImage(
        this.outputSettings.backgroundImage,
        0, 0,
        this.previewCanvas.width, this.previewCanvas.height
      );
    } else {
      // Draw solid color background
      previewCtx.fillStyle = this.outputSettings.backgroundColor;
      previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }
    
    // Draw result image
    previewCtx.drawImage(this.resultCanvas, 0, 0);
    
    // Show preview
    this.previewCanvas.style.opacity = '1';
  }

  drawCheckerboard(ctx) {
    const size = 10;
    const width = this.previewCanvas.width;
    const height = this.previewCanvas.height;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#d0d0d0';
    
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((x / size + y / size) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  downloadImage() {
    if (!this.resultCanvas) return;
    
    // Create a temporary canvas for the output
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = this.resultCanvas.width;
    outputCanvas.height = this.resultCanvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    // If not transparent, draw background
    if (!this.outputSettings.transparentBackground) {
      if (this.outputSettings.backgroundImage) {
        // Draw image background
        outputCtx.drawImage(
          this.outputSettings.backgroundImage,
          0, 0,
          outputCanvas.width, outputCanvas.height
        );
      } else {
        // Draw solid color background
        outputCtx.fillStyle = this.outputSettings.backgroundColor;
        outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      }
    }
    
    // Draw result image
    outputCtx.drawImage(this.resultCanvas, 0, 0);
    
    // Convert to data URL
    let mimeType = 'image/png';
    if (this.outputSettings.format === 'webp') mimeType = 'image/webp';
    if (this.outputSettings.format === 'jpeg') mimeType = 'image/jpeg';
    
    const dataURL = outputCanvas.toDataURL(mimeType, this.outputSettings.quality);
    
    // Create link and trigger download
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `removed-bg-${Date.now()}.${this.outputSettings.format}`;
    link.click();
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('backgroundRemoved', {
      detail: { imageData: dataURL }
    }));
  }

  resetEditor() {
    // Reset state
    this.image = null;
    this.originalImage = null;
    this.resultCanvas = null;
    
    // Reset UI
    const container = this.shadowRoot.querySelector('.remover-container');
    container.classList.remove('workspace-active');
    
    // Reset file input
    const fileInput = this.shadowRoot.querySelector('#fileInput');
    fileInput.value = '';
    
    // Reset settings to defaults
    this.brushSize = 20;
    this.brushSoftness = 50;
    this.tolerance = 30;
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
    
    this.autoMaskSettings = {
      sensitivity: 50,
      edgeDetection: true,
      smoothing: 50,
      foregroundBias: 50,
      detailLevel: 'medium',
      algorithm: 'adaptive'
    };
    
    this.outputSettings = {
      format: 'png',
      quality: 0.92,
      transparentBackground: true,
      backgroundColor: '#ffffff',
      backgroundImage: null,
      defringing: true,
      refinementLevel: 'medium'
    };
    
    // Reset any canvases
    if (this.maskCanvas) {
      const maskCtx = this.maskCanvas.getContext('2d');
      maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }
    
    if (this.brushCanvas) {
      const brushCtx = this.brushCanvas.getContext('2d');
      brushCtx.clearRect(0, 0, this.brushCanvas.width, this.brushCanvas.height);
    }
    
    if (this.previewCanvas) {
      const previewCtx = this.previewCanvas.getContext('2d');
      previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.previewCanvas.style.opacity = '0';
    }
    
    // Reset settings panel UI to defaults
    this.resetSettingsUI();
  }

  resetSettingsUI() {
    // Reset algorithm buttons
    const algorithmButtons = this.shadowRoot.querySelectorAll('[data-algorithm]');
    algorithmButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-algorithm') === 'adaptive');
    });
    
    // Reset detail buttons
    const detailButtons = this.shadowRoot.querySelectorAll('[data-detail]');
    detailButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-detail') === 'medium');
    });
    
    // Reset format buttons
    const formatButtons = this.shadowRoot.querySelectorAll('[data-format]');
    formatButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-format') === 'png');
    });
    
    // Reset refinement buttons
    const refinementButtons = this.shadowRoot.querySelectorAll('[data-refinement]');
    refinementButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-refinement') === 'medium');
    });
    
    // Reset max dimension buttons
    const maxDimButtons = this.shadowRoot.querySelectorAll('[data-max-dim]');
    maxDimButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-max-dim') === '2048');
    });
    
    // Reset background options
    const bgOptions = this.shadowRoot.querySelectorAll('.bg-option');
    bgOptions.forEach(option => {
      option.classList.toggle('active', option.getAttribute('data-bg') === 'transparent');
    });
    
    // Reset sliders
    this.shadowRoot.querySelector('#sensitivitySlider').value = 50;
    this.shadowRoot.querySelector('#foregroundBiasSlider').value = 50;
    this.shadowRoot.querySelector('#smoothingSlider').value = 50;
    this.shadowRoot.querySelector('#qualitySlider').value = 92;
    this.shadowRoot.querySelector('#brushSizeSlider').value = 20;
    this.shadowRoot.querySelector('#brushSoftnessSlider').value = 50;
    this.shadowRoot.querySelector('#toleranceSlider').value = 30;
    
    // Reset slider labels
    this.shadowRoot.querySelector('label[for="sensitivitySlider"] .setting-value').textContent = '50';
    this.shadowRoot.querySelector('label[for="foregroundBiasSlider"] .setting-value').textContent = '50';
    this.shadowRoot.querySelector('label[for="smoothingSlider"] .setting-value').textContent = '50';
    this.shadowRoot.querySelector('label[for="qualitySlider"] .setting-value').textContent = '92%';
    
    // Reset checkboxes
    this.shadowRoot.querySelector('#edgeDetectionCheckbox').checked = true;
    this.shadowRoot.querySelector('#defringingCheckbox').checked = true;
    this.shadowRoot.querySelector('#useGPUCheckbox').checked = this.canUseGPU;
    this.shadowRoot.querySelector('#useWorkerCheckbox').checked = true;
    
    // Close settings panel if open
    this.shadowRoot.querySelector('.settings-panel').classList.remove('open');
  }
}

// Register the custom element
customElements.define('wix-background-remover', WixBackgroundRemover);
