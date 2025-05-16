document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const views = {
        camera: document.getElementById('camera-view'),
        stories: document.getElementById('stories-view'),
        chat: document.getElementById('chat-view'),
        discover: document.getElementById('discover-view')
    };
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const flashEffect = document.getElementById('flash');
    const cameraFeed = document.getElementById('camera-feed');
    const photoCanvas = document.getElementById('photo-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const switchCameraBtn = document.getElementById('switch-camera');
    const videoBtn = document.getElementById('video-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // App State
    let currentView = 'camera';
    let stream = null;
    let isFrontCamera = true;
    let isRecording = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    
    // Initialize the app
    initCamera();
    setupEventListeners();
    
    function setupEventListeners() {
        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                switchView(view);
            });
        });
        
        // Camera controls
        captureBtn.addEventListener('click', takePhoto);
        switchCameraBtn.addEventListener('click', switchCamera);
        videoBtn.addEventListener('click', toggleVideoRecording);
        
        // Filters
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                applyFilter(filter);
            });
        });
    }
    
    function switchView(view) {
        // Update UI
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-view="${view}"]`).classList.add('active');
        
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[view].classList.add('active');
        
        // Handle camera when switching views
        if (view === 'camera') {
            initCamera();
        } else if (stream) {
            stopCamera();
        }
        
        currentView = view;
    }
    
    async function initCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: isFrontCamera ? 'user' : 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            cameraFeed.srcObject = stream;
        } catch (err) {
            console.error("Camera error: ", err);
            alert("Could not access the camera. Please check permissions.");
        }
    }
    
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
    
    function switchCamera() {
        isFrontCamera = !isFrontCamera;
        stopCamera();
        initCamera();
    }
    
    function takePhoto() {
        if (!stream) return;
        
        // Set canvas dimensions to match video
        photoCanvas.width = cameraFeed.videoWidth;
        photoCanvas.height = cameraFeed.videoHeight;
        
        // Draw current frame to canvas
        const context = photoCanvas.getContext('2d');
        
        // Flip horizontally for front camera
        if (isFrontCamera) {
            context.translate(photoCanvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // Reset transform
        if (isFrontCamera) {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }
        
        // Show flash effect
        flashEffect.classList.add('active');
        setTimeout(() => {
            flashEffect.classList.remove('active');
        }, 300);
        
        // Get the image data
        const imageData = photoCanvas.toDataURL('image/png');
        
        // In a real app, you would save or send this photo
        console.log('Photo captured:', imageData);
        showToast('Photo captured!');
    }
    
    function toggleVideoRecording() {
        if (isRecording) {
            stopVideoRecording();
        } else {
            startVideoRecording();
        }
    }
    
    function startVideoRecording() {
        if (!stream) return;
        
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);
            
            console.log('Video recorded:', videoUrl);
            showToast('Video recorded!');
            
            // In a real app, you would save or send this video
        };
        
        mediaRecorder.start();
        isRecording = true;
        videoBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>';
    }
    
    function stopVideoRecording() {
        if (!mediaRecorder) return;
        
        mediaRecorder.stop();
        isRecording = false;
        videoBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" stroke="currentColor" stroke-width="2"/></svg>';
    }
    
    function applyFilter(filter) {
        cameraFeed.style.filter = filter;
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.padding = '8px 16px';
        toast.style.borderRadius = '20px';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '14px';
        toast.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
    }
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && currentView === 'camera') {
            stopCamera();
        } else if (document.visibilityState === 'visible' && currentView === 'camera') {
            initCamera();
        }
    });
});
