/**
 * Client-side background removal using canvas.
 * Uses edge detection + flood fill to create a transparency mask.
 * Works best with garments on plain/white backgrounds.
 */

export async function removeBackgroundClient(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample corner pixels to detect background color
        const corners = [
          getPixel(data, canvas.width, 0, 0),
          getPixel(data, canvas.width, canvas.width - 1, 0),
          getPixel(data, canvas.width, 0, canvas.height - 1),
          getPixel(data, canvas.width, canvas.width - 1, canvas.height - 1),
        ];
        
        // Average the corners to get likely background color
        const bgColor = {
          r: Math.round(corners.reduce((sum, c) => sum + c.r, 0) / 4),
          g: Math.round(corners.reduce((sum, c) => sum + c.g, 0) / 4),
          b: Math.round(corners.reduce((sum, c) => sum + c.b, 0) / 4),
        };
        
        // Calculate threshold based on background brightness
        const bgBrightness = (bgColor.r + bgColor.g + bgColor.b) / 3;
        const threshold = bgBrightness > 200 ? 45 : bgBrightness > 128 ? 55 : 65;
        
        // Create mask - mark pixels similar to background as transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const diff = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          );
          
          if (diff < threshold) {
            // This pixel is close to background color - make transparent
            data[i + 3] = 0;
          }
        }
        
        // Apply edge smoothing
        smoothEdges(data, canvas.width, canvas.height);
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to PNG (supports transparency)
        const result = canvas.toDataURL("image/png");
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const idx = (y * width + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3],
  };
}

function smoothEdges(data: Uint8ClampedArray, width: number, height: number) {
  // Simple edge feathering - average alpha with neighbors for semi-transparent edges
  const tempAlpha = new Uint8ClampedArray(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      tempAlpha[y * width + x] = data[idx + 3];
    }
  }
  
  // Apply 3x3 blur to alpha channel for smoother edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const currentAlpha = tempAlpha[y * width + x];
      
      // Only process edge pixels (where alpha transitions)
      if (currentAlpha > 0 && currentAlpha < 255) {
        let sum = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += tempAlpha[(y + dy) * width + (x + dx)];
            count++;
          }
        }
        
        data[idx + 3] = Math.round(sum / count);
      }
    }
  }
}

/**
 * Enhanced background removal with flood fill from edges.
 * Better for complex backgrounds.
 */
export async function removeBackgroundFloodFill(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Create visited array
        const visited = new Uint8Array(width * height);
        const toRemove = new Uint8Array(width * height);
        
        // Tolerance for color matching
        const tolerance = 50;
        
        // Flood fill from all edge pixels
        const queue: Array<{ x: number; y: number; refColor: { r: number; g: number; b: number } }> = [];
        
        // Add edge pixels to queue
        for (let x = 0; x < width; x++) {
          const topColor = getPixel(data, width, x, 0);
          const bottomColor = getPixel(data, width, x, height - 1);
          queue.push({ x, y: 0, refColor: topColor });
          queue.push({ x, y: height - 1, refColor: bottomColor });
        }
        for (let y = 0; y < height; y++) {
          const leftColor = getPixel(data, width, 0, y);
          const rightColor = getPixel(data, width, width - 1, y);
          queue.push({ x: 0, y, refColor: leftColor });
          queue.push({ x: width - 1, y, refColor: rightColor });
        }
        
        // Process queue
        while (queue.length > 0) {
          const { x, y, refColor } = queue.shift()!;
          const idx = y * width + x;
          
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          if (visited[idx]) continue;
          
          visited[idx] = 1;
          
          const pixel = getPixel(data, width, x, y);
          const diff = Math.sqrt(
            Math.pow(pixel.r - refColor.r, 2) +
            Math.pow(pixel.g - refColor.g, 2) +
            Math.pow(pixel.b - refColor.b, 2)
          );
          
          if (diff < tolerance) {
            toRemove[idx] = 1;
            
            // Add neighbors
            queue.push({ x: x + 1, y, refColor: pixel });
            queue.push({ x: x - 1, y, refColor: pixel });
            queue.push({ x, y: y + 1, refColor: pixel });
            queue.push({ x, y: y - 1, refColor: pixel });
          }
        }
        
        // Apply transparency
        for (let i = 0; i < toRemove.length; i++) {
          if (toRemove[i]) {
            data[i * 4 + 3] = 0;
          }
        }
        
        // Smooth edges
        smoothEdges(data, width, height);
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}
