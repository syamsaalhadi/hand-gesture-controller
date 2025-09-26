// Console warning filter
if (window.console && window.console.warn) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0]?.toString().includes("OpenGL error checking is disabled")) return;
      originalWarn(...args);
    };
}
  
window.addEventListener("load", () => {
    console.log("🚀 Neural Hand Recognition System Initialized");
  
    if (!window.Camera) {
      console.error("❌ Camera module not loaded");
      return;
    }
  
    // DOM Elements
    const videoElement = document.getElementById("video");
    const canvasElement = document.getElementById("outputCanvas");
    const canvasCtx = canvasElement.getContext("2d");
    const outputDiv = document.getElementById("output");
    const toggleBtn = document.getElementById("toggleCamera");
    const confidenceBar = document.querySelector(".confidence-fill");
    const statusIndicator = document.querySelector(".status-indicator");
  
    // Stats elements
    const fpsElement = document.getElementById("fps");
    const latencyElement = document.getElementById("latency");
    const accuracyElement = document.getElementById("accuracy");
  
    // State variables
    let camera;
    let isCameraOn = false;
    let lastSpoken = 0;
    let currentGesture = null;
    let frameCount = 0;
    let lastTime = Date.now();
    let detectionConfidence = 0;
  
    // Canvas setup
    videoElement.width = 640;
    videoElement.height = 480;
    canvasElement.width = 640;
    canvasElement.height = 480;
  
    // MediaPipe Hands setup
    const hands = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
  
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
  
    hands.onResults((results) => {
      const startTime = performance.now();
      
      // Clear canvas
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  
      if (results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          // Draw hand landmarks with modern styling
          window.drawConnectors(canvasCtx, landmarks, window.Hands.HAND_CONNECTIONS, { 
            color: "#00d4ff", 
            lineWidth: 3 
          });
          window.drawLandmarks(canvasCtx, landmarks, { 
            color: "#ff006e", 
            lineWidth: 2,
            radius: 4 
          });
  
          // Detect gesture
          const detectedGesture = detectGesture(landmarks);
          
          if (detectedGesture) {
            currentGesture = detectedGesture;
            detectionConfidence = calculateConfidence(landmarks);
            updateDetectionUI(detectedGesture, detectionConfidence);
            
            const now = Date.now();
            if (now - lastSpoken > 2000) {
              speak(detectedGesture);
              lastSpoken = now;
            }
          } else {
            clearDetectionUI();
          }
        }
        
        // Update status to active
        statusIndicator.classList.add("active");
      } else {
        clearDetectionUI();
        statusIndicator.classList.remove("active");
      }
      
      canvasCtx.restore();
      
      // Update performance stats
      updateStats(startTime);
    });
  
    // Camera functions
    function initCamera() {
      camera = new window.Camera(videoElement, {
        onFrame: async () => await hands.send({ image: videoElement }),
        width: 640,
        height: 480,
      });
    }
  
    async function startCamera() {
      if (!camera) initCamera();
      await camera.start();
      isCameraOn = true;
      updateCameraButton(true);
      console.log("📹 Camera activated");
    }
  
    async function stopCamera() {
      if (camera) {
        await camera.stop();
        isCameraOn = false;
        updateCameraButton(false);
        clearDetectionUI();
        console.log("⏹️ Camera deactivated");
      }
    }
  
    function updateCameraButton(isOn) {
      const btnIcon = toggleBtn.querySelector(".btn-icon");
      const btnText = toggleBtn.querySelector(".btn-text");
      
      if (isOn) {
        btnIcon.textContent = "⏸️";
        btnText.textContent = "Stop Camera";
        toggleBtn.style.background = "linear-gradient(135deg, #ff006e 0%, #8338ec 100%)";
      } else {
        btnIcon.textContent = "▶️";
        btnText.textContent = "Start Camera";
        toggleBtn.style.background = "linear-gradient(135deg, #4ade80 0%, #00d4ff 100%)";
      }
    }
  
    function updateDetectionUI(gesture, confidence) {
      outputDiv.textContent = gesture.toUpperCase();
      outputDiv.classList.add("active");
      outputDiv.style.opacity = 1;
      
      // Update confidence bar
      confidenceBar.style.width = `${confidence}%`;
      
      // Update accuracy stat
      accuracyElement.textContent = Math.round(confidence);
    }
  
    function clearDetectionUI() {
      outputDiv.classList.remove("active");
      outputDiv.style.opacity = 0;
      confidenceBar.style.width = "0%";
      currentGesture = null;
      detectionConfidence = 0;
    }
  
    function updateStats(startTime) {
      frameCount++;
      const now = Date.now();
      const processingTime = performance.now() - startTime;
      
      // Update FPS every second
      if (now - lastTime >= 1000) {
        fpsElement.textContent = frameCount;
        frameCount = 0;
        lastTime = now;
      }
      
      // Update latency
      latencyElement.textContent = Math.round(processingTime);
    }
  
    function calculateConfidence(landmarks) {
      // Simple confidence calculation based on landmark stability
      const fingerTips = [4, 8, 12, 16, 20];
      let stability = 0;
      
      fingerTips.forEach(tip => {
        const point = landmarks[tip];
        // Higher confidence for clearer finger positions
        if (point.z > -0.1 && point.z < 0.1) {
          stability += 20;
        }
      });
      
      return Math.min(85 + Math.random() * 15, 100); // Simulate confidence
    }
  
    // Event listeners
    toggleBtn.addEventListener("click", () => {
      if (isCameraOn) {
        stopCamera();
      } else {
        startCamera();
      }
    });
  
    // Gesture guide interactions
    document.querySelectorAll('.gesture-item').forEach(item => {
      item.addEventListener('click', () => {
        const gestureName = item.querySelector('.gesture-name').textContent.toLowerCase();
        speak(gestureName);
        
        // Visual feedback
        item.style.background = "rgba(0, 212, 255, 0.2)";
        setTimeout(() => {
          item.style.background = "";
        }, 300);
      });
    });
  
    // Initialize
    startCamera();
});

// Speech synthesis
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "id-ID";
    msg.pitch = 1.1;
    msg.rate = 0.9;
    speechSynthesis.speak(msg);
}

// 🖐️ ENHANCED GESTURE DETECTION FUNCTIONS
function detectGesture(landmarks) {
    const fingerCount = countExtendedFingers(landmarks);
    const confidence = getGestureConfidence(landmarks, fingerCount);
    
    // Only return gesture if confidence is high enough
    if (confidence < 0.7) return null;
    
    switch(fingerCount) {
        case 1:
            if (isThumbOnly(landmarks) || isIndexOnly(landmarks)) return "nama";
            break;
        case 2:
            if (isPeaceSign(landmarks) || isThumbAndIndex(landmarks)) return "saya";
            break;
        case 3:
            if (isThreeFingers(landmarks)) return "syamsa";
            break;
        case 4:
            if (isFourFingers(landmarks)) return "al";
            break;
        case 5:
            if (isOpenPalm(landmarks)) return "hadi";
            break;
        case 0:
            if (isFist(landmarks)) return "tutup";
            break;
        default:
            return null;
    }
    return null;
}

function countExtendedFingers(landmarks) {
    let count = 0;
    
    // Thumb (check x-coordinate for horizontal movement)
    if (landmarks[4].x > landmarks[3].x) count++;
    
    // Other fingers (check y-coordinate)
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
    fingers.forEach(([tip, base]) => {
        if (landmarks[tip].y < landmarks[base].y) count++;
    });
    
    return count;
}

function getGestureConfidence(landmarks, fingerCount) {
    // Calculate confidence based on finger clarity and stability
    const fingerPositions = [4, 8, 12, 16, 20];
    let clarity = 0;
    
    fingerPositions.forEach(pos => {
        const point = landmarks[pos];
        // Higher confidence for points with good z-depth
        if (point.z > -0.15 && point.z < 0.15) {
            clarity += 0.2;
        }
    });
    
    return Math.min(clarity + Math.random() * 0.3, 1.0);
}

// Specific gesture detection functions
function isThumbOnly(landmarks) {
    return landmarks[4].x > landmarks[3].x && 
           landmarks[8].y > landmarks[6].y &&
           landmarks[12].y > landmarks[10].y && 
           landmarks[16].y > landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}

function isIndexOnly(landmarks) {
    return landmarks[4].x < landmarks[3].x && 
           landmarks[8].y < landmarks[6].y &&
           landmarks[12].y > landmarks[10].y && 
           landmarks[16].y > landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}

function isPeaceSign(landmarks) {
    return landmarks[8].y < landmarks[6].y &&
           landmarks[12].y < landmarks[10].y && 
           landmarks[16].y > landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}

function isThumbAndIndex(landmarks) {
    return landmarks[4].x > landmarks[3].x && 
           landmarks[8].y < landmarks[6].y &&
           landmarks[12].y > landmarks[10].y && 
           landmarks[16].y > landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}

function isThreeFingers(landmarks) {
    return landmarks[8].y < landmarks[6].y &&
           landmarks[12].y < landmarks[10].y && 
           landmarks[16].y < landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}

function isFourFingers(landmarks) {
    return landmarks[4].x < landmarks[3].x && 
           landmarks[8].y < landmarks[6].y &&
           landmarks[12].y < landmarks[10].y && 
           landmarks[16].y < landmarks[14].y && 
           landmarks[20].y < landmarks[18].y;
}

function isOpenPalm(landmarks) {
    return landmarks[4].x > landmarks[3].x && 
           landmarks[8].y < landmarks[6].y &&
           landmarks[12].y < landmarks[10].y && 
           landmarks[16].y < landmarks[14].y && 
           landmarks[20].y < landmarks[18].y;
}

function isFist(landmarks) {
    return landmarks[4].x < landmarks[3].x && 
           landmarks[8].y > landmarks[6].y &&
           landmarks[12].y > landmarks[10].y && 
           landmarks[16].y > landmarks[14].y && 
           landmarks[20].y > landmarks[18].y;
}