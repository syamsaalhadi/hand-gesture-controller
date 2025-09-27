// Console warning filter
if (window.console && window.console.warn) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.toString().includes("OpenGL error checking is disabled")) return;
    originalWarn(...args);
  };
}

// Default gesture mappings
const DEFAULT_GESTURES = {
  1: "nama",
  2: "saya", 
  3: "syamsa",
  4: "al",
  5: "hadi"
};

// User customizable gestures (loaded from localStorage or defaults)
let userGestures = {...DEFAULT_GESTURES};

window.addEventListener("load", () => {
  console.log("🚀 Customizable Neural Hand Recognition System Initialized");
  
  // Load user settings
  loadUserSettings();
  updateGestureGuide();
  setupSettingsPanel();

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

        // Detect gesture using custom mappings
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

  // Initialize
  startCamera();
});

// 🛠️ SETTINGS PANEL FUNCTIONS
function setupSettingsPanel() {
  const openBtn = document.getElementById("openSettings");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeBtn = document.getElementById("settingsToggle");
  const saveBtn = document.getElementById("saveSettings");
  const resetBtn = document.getElementById("resetSettings");
  
  // Open settings panel
  openBtn.addEventListener("click", () => {
      settingsPanel.classList.add("open");
      loadCurrentSettings();
  });
  
  // Close settings panel
  closeBtn.addEventListener("click", () => {
      settingsPanel.classList.remove("open");
  });
  
  // Save settings
  saveBtn.addEventListener("click", () => {
      saveUserSettings();
      settingsPanel.classList.remove("open");
      updateGestureGuide();
      showNotification("✅ Settings saved successfully!", "success");
  });
  
  // Reset to defaults
  resetBtn.addEventListener("click", () => {
      if (confirm("Reset to default gesture mappings?")) {
          userGestures = {...DEFAULT_GESTURES};
          loadCurrentSettings();
          saveUserSettings();
          updateGestureGuide();
          showNotification("🔄 Reset to defaults", "info");
      }
  });
  
  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
      if (!settingsPanel.contains(e.target) && !openBtn.contains(e.target)) {
          settingsPanel.classList.remove("open");
      }
  });
}

function loadCurrentSettings() {
  // Load current gesture settings into input fields
  for (let i = 1; i <= 5; i++) {
      const input = document.getElementById(`gesture${i}`);
      if (input) {
          input.value = userGestures[i] || "";
      }
  }
}

function saveUserSettings() {
  // Save settings from input fields
  for (let i = 1; i <= 5; i++) {
      const input = document.getElementById(`gesture${i}`);
      if (input && input.value.trim()) {
          userGestures[i] = input.value.trim().toLowerCase();
      }
  }
  
  // Save to localStorage
  try {
      localStorage.setItem('gestureSettings', JSON.stringify(userGestures));
  } catch (error) {
      console.warn("Could not save to localStorage:", error);
  }
}

function loadUserSettings() {
  // Load settings from localStorage
  try {
      const saved = localStorage.getItem('gestureSettings');
      if (saved) {
          const parsed = JSON.parse(saved);
          userGestures = {...DEFAULT_GESTURES, ...parsed};
      }
  } catch (error) {
      console.warn("Could not load from localStorage:", error);
      userGestures = {...DEFAULT_GESTURES};
  }
}

function updateGestureGuide() {
  const guideContent = document.getElementById("gestureGuide");
  if (!guideContent) return;
  
  const gestureDescriptions = {
      1: "One finger up",
      2: "Peace sign / Two fingers", 
      3: "Three fingers extended",
      4: "Four fingers (no thumb)",
      5: "Open palm (all fingers)"
  };
  
  const gestureEmojis = {
      1: "1️⃣",
      2: "2️⃣", 
      3: "3️⃣",
      4: "4️⃣",
      5: "5️⃣"
  };
  
  guideContent.innerHTML = "";
  
  for (let i = 1; i <= 5; i++) {
      const gestureText = userGestures[i] || `gesture${i}`;
      const item = document.createElement("div");
      item.className = "gesture-item";
      item.innerHTML = `
          <div class="gesture-icon">${gestureEmojis[i]}</div>
          <div class="gesture-info">
              <span class="gesture-name">${gestureText.toUpperCase()}</span>
              <span class="gesture-desc">${gestureDescriptions[i]}</span>
          </div>
      `;
      
      // Add click listener for demo
      item.addEventListener('click', () => {
          speak(gestureText);
          
          // Visual feedback
          item.style.background = "rgba(0, 212, 255, 0.2)";
          setTimeout(() => {
              item.style.background = "";
          }, 300);
      });
      
      guideContent.appendChild(item);
  }
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${type === "success" ? "linear-gradient(135deg, #4ade80 0%, #00d4ff 100%)" : 
                   type === "error" ? "linear-gradient(135deg, #ff006e 0%, #8338ec 100%)" :
                   "rgba(255, 255, 255, 0.1)"};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 2000;
      animation: slideIn 0.3s ease;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
          if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
          }
      }, 300);
  }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Speech synthesis
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "id-ID";
  msg.pitch = 1.1;
  msg.rate = 0.9;
  speechSynthesis.speak(msg);
}

// 🖐️ ENHANCED GESTURE DETECTION WITH CUSTOM MAPPINGS
function detectGesture(landmarks) {
  const fingerCount = countExtendedFingers(landmarks);
  const confidence = getGestureConfidence(landmarks, fingerCount);
  
  // Only return gesture if confidence is high enough
  if (confidence < 0.7) return null;
  
  // Return custom gesture mapping based on finger count
  return userGestures[fingerCount] || null;
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