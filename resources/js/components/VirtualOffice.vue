<template>
    <div class="virtual-office-container">
        <div v-if="loading" class="loading-screen">
            <div class="loading-content">
                <h2>Loading Virtual Office...</h2>
                <p>Please wait while we set up your workspace</p>
            </div>
        </div>
        <div v-else-if="error" class="error-screen">
            <div class="error-content">
                <h2>Error</h2>
                <p>{{ error }}</p>
                <button @click="window.location.href = '/rooms'" class="btn-primary">Go Back to Rooms</button>
            </div>
        </div>
        <div v-else class="office-content" :class="{ 'has-video-panel': hasActiveCameras }">
        <div class="office-header">
            <h1>{{ room?.name || 'Virtual Office' }}</h1>
            <div class="header-controls">
                <button @click="toggleChat" class="control-btn" :class="{ active: showChat }">
                    💬 Chat
                </button>
                <button @click="toggleVideoPanel" class="control-btn" :class="{ active: showVideoPanel && hasActiveCameras }" title="Toggle Video Panel">
                    📹 Video
                </button>
                <button @click="toggleRecording" class="control-btn" :class="{ active: isRecording, danger: isRecording }" :title="isRecording ? 'Stop Recording' : 'Start Recording'">
                    {{ isRecording ? '⏹️ Recording' : '🔴 Record' }}
                </button>
                <button @click="openBackgroundSettings" class="control-btn">🖼️ Background</button>
                <button @click="openProfile" class="control-btn">👤 Profile</button>
                <button @click="openSettings" class="control-btn">⚙️</button>
                <button @click="leaveRoom" class="control-btn danger">Leave</button>
            </div>
        </div>

        <div class="office-canvas-wrapper" ref="canvasWrapperRef" @wheel="handleWheel" :class="{ 'with-video-panel': hasActiveCameras }">
            <div class="office-canvas" ref="canvasRef" 
                @mousedown="handlePanStart" 
                @mousemove="handlePanMove" 
                @mouseup="handlePanEnd" 
                @mouseleave="handlePanEnd"
                :style="{ 
                    transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`, 
                    transformOrigin: '0 0',
                    backgroundImage: room?.background_image ? `url('${getImageUrl(room.background_image)}')` : 'none',
                    backgroundSize: '100% 100%',
                    backgroundPosition: '0 0',
                    backgroundRepeat: 'no-repeat',
                    width: '4000px',
                    height: '3000px'
                }">
                <div class="workspace-grid"></div>
                
                <!-- User Avatars -->
                <div
                    v-for="(presence, index) in presences"
                    :key="`presence-${presence.user_id}-${presence.id || index}`"
                    class="user-avatar"
                    :style="{
                        left: (presence.position_x || 100 + (index * 150)) + 'px',
                        top: (presence.position_y || 100 + (index * 150)) + 'px',
                        zIndex: presence.user_id === currentUserId ? 1000 : 100
                    }"
                    :class="{ 
                        'audio-muted': !presence.audio_enabled,
                        'video-off': !presence.video_enabled,
                        'current-user': presence.user_id === currentUserId,
                        'dragging': draggingUserId === presence.user_id
                    }"
                    @mousedown="presence.user_id === currentUserId ? handleMouseDown($event, presence) : null"
                >
                    <div class="avatar-circle">
                        <!-- Always show avatar image (video moved to right panel) -->
                        <img 
                            v-if="presence.user?.avatar_url || presence.avatar_url" 
                            :src="getImageUrl(presence.user?.avatar_url || presence.avatar_url)" 
                            :alt="presence.user?.name || 'User'"
                            @error="handleImageError"
                            class="avatar-img"
                        />
                        <span v-else class="avatar-initials">{{ getInitials(presence.user?.name || 'User') }}</span>
                    </div>
                    <div class="user-info">
                        <div class="user-name">{{ presence.user?.name || 'User' }}</div>
                        <div v-if="presence.user?.position" class="user-position">{{ presence.user.position }}</div>
                        <div v-if="presence.user?.department" class="user-department">{{ presence.user.department }}</div>
                    </div>
                    <div class="status-indicator" :class="presence.status || 'online'">
                        <span class="status-icon"></span>
                    </div>
                    <div v-if="!presence.audio_enabled" class="audio-muted-icon">🔇</div>
                    <div v-if="!presence.video_enabled" class="video-off-icon">📷</div>
                    
                    <!-- User Controls (only for current user, show on hover) -->
                    <div v-if="presence.user_id === currentUserId" class="user-controls">
                        <button 
                            @click.stop="toggleProximityAudio" 
                            :class="{ active: proximityAudioEnabled }" 
                            class="user-control-btn speaker-btn-normal"
                            title="Toggle Audio"
                        >
                            <span v-if="proximityAudioEnabled">🔊</span>
                            <span v-else class="icon-off">🔇</span>
                        </button>
                        <button 
                            @click.stop="toggleVideo" 
                            :class="{ active: videoEnabled, off: !videoEnabled }" 
                            class="user-control-btn video-btn"
                            title="Toggle Camera"
                        >
                            <span v-if="videoEnabled">📹</span>
                            <span v-else class="icon-off">📷<span class="cross-mark">✕</span></span>
                        </button>
                        <button 
                            @click.stop="toggleScreenShare" 
                            :class="{ active: isScreenSharing }" 
                            class="user-control-btn"
                            title="Share Screen"
                        >
                            🖥️
                        </button>
                        <button 
                            @click.stop="openInviteModal" 
                            class="user-control-btn"
                            title="Invite Users"
                        >
                            ➕
                        </button>
                    </div>
                    
                    <!-- Screen share overlay -->
                    <video
                        v-if="screenStreams[presence.user_id]"
                        :ref="el => setScreenRef(el, presence.user_id)"
                        autoplay
                        playsinline
                        class="user-screen"
                    ></video>
                </div>
            </div>
        </div>

        <!-- Right Side Video Panel -->
        <div 
            v-if="hasActiveCameras && showVideoPanel" 
            class="video-panel"
            :style="{ left: videoPanelPosition.x + 'px', top: videoPanelPosition.y + 'px', right: 'auto' }"
        >
            <div class="video-panel-header" @mousedown="startDragVideoPanel">
                <h3>Video Call</h3>
                <button @click="closeVideoPanel" class="video-panel-close-btn" title="Hide Video Panel">×</button>
            </div>
            <div class="video-panel-content" :class="{ 'multi-user': activeVideoUsers.length > 1 }" @mousedown.stop>
                <!-- Current User Video -->
                <div v-if="videoEnabled" class="video-panel-item">
                    <div class="video-panel-header-item">
                        <h4>{{ currentUserProfile?.name || 'You' }}</h4>
                    </div>
                    <video
                        :ref="el => setVideoPanelRef(el, currentUserId, 'local')"
                        autoplay
                        playsinline
                        muted
                        class="video-panel-video"
                        @loadedmetadata="handleVideoLoaded"
                        @canplay="handleVideoLoaded"
                        @playing="() => console.log('Video is playing')"
                    ></video>
                </div>
                <!-- Other Users Videos -->
                <div 
                    v-for="presence in presences.filter(p => p.video_enabled && p.user_id !== currentUserId && videoStreams[p.user_id])" 
                    :key="presence.user_id"
                    class="video-panel-item"
                >
                    <div class="video-panel-header-item">
                        <h4>{{ presence.user?.name || 'User' }}</h4>
                    </div>
                    <video
                        :ref="el => setVideoPanelRef(el, presence.user_id, 'remote')"
                        autoplay
                        playsinline
                        class="video-panel-video"
                        @loadedmetadata="handleVideoLoaded"
                        @canplay="handleVideoLoaded"
                    ></video>
                </div>
                <div v-if="!videoEnabled && activeVideoUsers.length === 0" class="video-panel-empty">
                    <p>No active cameras. Turn on your camera to see video.</p>
                </div>
            </div>
        </div>

        <!-- Chat Panel -->
        <div v-if="showChat" class="chat-panel">
            <div class="chat-header">
                <h3>Chat</h3>
                <button @click="toggleChat" class="chat-close-btn">×</button>
            </div>
            <div class="chat-messages" ref="chatMessagesRef">
                <div 
                    v-for="message in chatMessages" 
                    :key="message.id" 
                    class="chat-message"
                    :class="{ 'own-message': message.user_id === currentUserId }"
                >
                    <div class="message-avatar">
                        <img 
                            v-if="message.user?.avatar_url" 
                            :src="getImageUrl(message.user.avatar_url)" 
                            :alt="message.user.name"
                            @error="handleImageError"
                        />
                        <span v-else>{{ getInitials(message.user?.name || 'U') }}</span>
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">{{ message.user?.name || 'User' }}</span>
                            <span class="message-time">{{ formatTime(message.created_at) }}</span>
                        </div>
                        <div v-if="message.type === 'text'" class="message-text">{{ message.content }}</div>
                        <div v-else-if="message.type === 'image'" class="message-image">
                            <img :src="getImageUrl(message.file_url)" :alt="message.content" @click="openImageModal(getImageUrl(message.file_url))" />
                        </div>
                        <div v-else-if="message.type === 'file'" class="message-file">
                            <a :href="getImageUrl(message.file_url)" target="_blank" class="file-link">
                                📎 {{ message.content }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="chat-input-area">
                <div class="chat-input-actions">
                    <button @click="triggerImageUpload" class="chat-action-btn" title="Send Image">🖼️</button>
                    <button @click="triggerFileUpload" class="chat-action-btn" title="Send File">📎</button>
                    <input 
                        type="file" 
                        ref="chatImageInput" 
                        @change="handleImageUpload" 
                        accept="image/*" 
                        style="display: none;"
                    />
                    <input 
                        type="file" 
                        ref="chatFileInput" 
                        @change="handleFileUpload" 
                        style="display: none;"
                    />
                </div>
                <input 
                    v-model="chatInput" 
                    @keyup.enter="sendChatMessage" 
                    type="text" 
                    placeholder="Type a message..." 
                    class="chat-input"
                />
                <button @click="sendChatMessage" class="chat-send-btn">Send</button>
            </div>
        </div>

        <div v-if="showSettings" class="settings-modal" @click.self="closeSettings">
            <div class="settings-content">
                <h2>Settings</h2>
                <div class="settings-section">
                    <label>Camera:</label>
                    <select v-model="selectedCamera">
                        <option v-for="device in cameras" :key="device.deviceId" :value="device.deviceId">
                            {{ device.label }}
                        </option>
                    </select>
                </div>
                <div class="settings-section">
                    <label>Microphone:</label>
                    <select v-model="selectedMicrophone">
                        <option v-for="device in microphones" :key="device.deviceId" :value="device.deviceId">
                            {{ device.label }}
                        </option>
                    </select>
                </div>
                <div class="settings-section">
                    <label>Speaker:</label>
                    <select v-model="selectedSpeaker">
                        <option v-for="device in speakers" :key="device.deviceId" :value="device.deviceId">
                            {{ device.label }}
                        </option>
                    </select>
                </div>
                <button @click="saveSettings" class="btn-primary">Save</button>
            </div>
        </div>

        <div v-if="showBackgroundSettings" class="background-modal" @click.self="closeBackgroundSettings">
            <div class="background-modal-content">
                <div class="background-modal-header">
                    <h2>🎨 Background Settings</h2>
                    <button @click="closeBackgroundSettings" class="modal-close-btn">×</button>
                </div>
                <div class="background-modal-body">
                    <div class="background-preview-container">
                        <label class="preview-label">Preview</label>
                        <div v-if="backgroundImagePreview" class="background-preview-large">
                            <img :src="backgroundImagePreview" alt="Preview" />
                            <div class="preview-overlay">
                                <span class="preview-badge">New Background</span>
                            </div>
                        </div>
                        <div v-else-if="room?.background_image" class="background-preview-large">
                            <img :src="getImageUrl(room.background_image)" alt="Current Background" />
                            <div class="preview-overlay">
                                <span class="preview-badge">Current Background</span>
                            </div>
                        </div>
                        <div v-else class="background-preview-large placeholder">
                            <div class="placeholder-content">
                                <span class="placeholder-icon">🖼️</span>
                                <span>No Background Set</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="background-upload-section">
                        <label class="section-label">Upload Image</label>
                        <input 
                            type="file" 
                            ref="backgroundImageInput"
                            @change="handleBackgroundImageSelect" 
                            accept="image/*" 
                            class="file-input-hidden"
                        />
                        <button @click="backgroundImageInput?.click()" class="upload-btn" type="button">
                            <span class="btn-icon">📤</span>
                            {{ backgroundImagePreview ? 'Change Image' : 'Choose Image File' }}
                        </button>
                        <p class="upload-hint">Supported formats: JPG, PNG, GIF, WebP (Max 10MB)</p>
                    </div>
                    
                    <div class="background-url-section">
                        <label class="section-label">Or Enter Image URL</label>
                        <input 
                            type="text" 
                            v-model="backgroundImageUrl" 
                            class="url-input" 
                            placeholder="https://example.com/image.jpg or /storage/path/to/image.jpg"
                        />
                        <p class="url-hint">Enter a direct image URL or storage path</p>
                    </div>
                    
                    <div v-if="backgroundImageUrl || backgroundImagePreview || room?.background_image" class="background-actions">
                        <button @click="removeBackground" class="remove-btn" type="button">
                            <span class="btn-icon">🗑️</span>
                            Remove Background
                        </button>
                    </div>
                </div>
                <div class="background-modal-footer">
                    <button @click="closeBackgroundSettings" class="cancel-btn">Cancel</button>
                    <button @click="saveBackground" class="save-btn">
                        <span class="btn-icon">💾</span>
                        Save Background
                    </button>
                </div>
            </div>
        </div>

        <!-- Invite Modal -->
        <div v-if="showInviteModal" class="settings-modal" @click.self="closeInviteModal">
            <div class="settings-content">
                <h2>Invite Users</h2>
                <div class="settings-section">
                    <label>Email Address:</label>
                    <input type="email" v-model="inviteEmail" class="settings-input" placeholder="user@example.com" />
                </div>
                <div class="settings-section">
                    <label>Or Share Link:</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" :value="inviteLink" class="settings-input" readonly />
                        <button @click="copyInviteLink" class="btn-secondary">Copy</button>
                    </div>
                </div>
                <div class="settings-actions">
                    <button @click="sendInvite" class="btn-primary">Send Invite</button>
                    <button @click="closeInviteModal" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>

        <!-- Video Call Modal -->
        <div v-if="showVideoCall" class="settings-modal" @click.self="closeVideoCall">
            <div class="video-call-content">
                <div class="video-call-header">
                    <h2>Video Call</h2>
                    <button @click="closeVideoCall" class="chat-close-btn">×</button>
                </div>
                <div class="video-call-grid">
                    <div 
                        v-for="presence in presences.filter(p => p.video_enabled && p.user_id !== currentUserId)" 
                        :key="presence.id"
                        class="video-call-participant"
                    >
                        <video
                            v-if="videoStreams[presence.user_id]"
                            :ref="el => setVideoRef(el, presence.user_id)"
                            autoplay
                            playsinline
                            class="participant-video"
                        ></video>
                        <div class="participant-info">
                            <div class="participant-name">{{ presence.user?.name || 'User' }}</div>
                        </div>
                    </div>
                    <div class="video-call-participant local-participant">
                        <video
                            v-if="localStream && videoEnabled"
                            ref="localVideoRef"
                            autoplay
                            playsinline
                            muted
                            class="participant-video"
                        ></video>
                        <div class="participant-info">
                            <div class="participant-name">You</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showProfile" class="settings-modal" @click.self="closeProfile">
            <div class="settings-content">
                <h2>Profile Management</h2>
                <div class="settings-section">
                    <label>Name:</label>
                    <input type="text" v-model="profileName" class="settings-input" />
                </div>
                <div class="settings-section">
                    <label>Profile Picture:</label>
                    <div class="avatar-upload-section">
                        <div v-if="profileAvatarPreview" class="avatar-preview">
                            <img :src="profileAvatarPreview" alt="Preview" />
                        </div>
                        <div v-else-if="profileAvatarUrl" class="avatar-preview">
                            <img :src="profileAvatarUrl" alt="Current" />
                        </div>
                        <div v-else class="avatar-preview placeholder">
                            <span>No Image</span>
                        </div>
                        <input 
                            type="file" 
                            ref="avatarFileInput"
                            @change="handleAvatarFileSelect" 
                            accept="image/*" 
                            class="file-input"
                            style="display: none;"
                        />
                        <button @click="$refs.avatarFileInput.click()" class="btn-secondary" type="button">
                            {{ profileAvatarPreview ? 'Change Image' : 'Upload Image' }}
                        </button>
                        <button v-if="profileAvatarUrl || profileAvatarPreview" @click="removeAvatar" class="btn-secondary" type="button">
                            Remove
                        </button>
                        <div class="avatar-url-section" style="margin-top: 0.5rem;">
                            <label style="font-size: 0.875rem;">Or enter URL:</label>
                            <input type="text" v-model="profileAvatarUrl" class="settings-input" placeholder="https://..." />
                        </div>
                    </div>
                </div>
                <div class="settings-section">
                    <label>Position:</label>
                    <input type="text" v-model="profilePosition" class="settings-input" placeholder="e.g., Software Engineer" />
                </div>
                <div class="settings-section">
                    <label>Department:</label>
                    <input type="text" v-model="profileDepartment" class="settings-input" placeholder="e.g., Engineering" />
                </div>
                <div class="settings-actions">
                    <button @click="saveProfile" class="btn-primary">Save Profile</button>
                    <button @click="closeProfile" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import axios from 'axios';
import SimplePeer from 'simple-peer';

export default {
    name: 'VirtualOffice',
    props: {
        roomId: {
            type: [String, Number],
            required: true,
        },
    },
    setup(props) {
        
        const room = ref(null);
        const presences = ref([]);
        const currentUserId = ref(null);
        const audioEnabled = ref(false);
        const proximityAudioEnabled = ref(false);
        const videoEnabled = ref(false); // Camera OFF by default
        const canvasRef = ref(null);
        const canvasWrapperRef = ref(null);
        const showSettings = ref(false);
        const showProfile = ref(false);
        const showChat = ref(false);
        const showBackgroundSettings = ref(false);
        const showInviteModal = ref(false);
        const loading = ref(true);
        const error = ref(null);
        const zoomLevel = ref(1);
        const panX = ref(0);
        const panY = ref(0);
        const isPanning = ref(false);
        const panStart = ref({ x: 0, y: 0 });
        const draggingUserId = ref(null);
        const currentUserProfile = ref(null);
        
        // Invite
        const inviteEmail = ref('');
        const inviteLink = ref('');
        
        // Background settings
        const backgroundImageUrl = ref('');
        const backgroundImagePreview = ref(null);
        const backgroundImageFile = ref(null);
        const backgroundImageInput = ref(null);
        
        // Chat
        const chatMessages = ref([]);
        const chatInput = ref('');
        const chatMessagesRef = ref(null);
        const chatImageInput = ref(null);
        const chatFileInput = ref(null);
        
        const selectedCamera = ref('');
        const selectedMicrophone = ref('');
        const selectedSpeaker = ref('');
        const cameras = ref([]);
        const microphones = ref([]);
        const speakers = ref([]);

        // Profile form fields
        const profileName = ref('');
        const profileAvatarUrl = ref('');
        const profilePosition = ref('');
        const profileDepartment = ref('');
        const profileAvatarPreview = ref(null);
        const profileAvatarFile = ref(null);
        const avatarFileInput = ref(null);

        const localStream = ref(null);
        const screenStream = ref(null);
        const localVideoRef = ref(null);
        const peers = ref({});
        const videoStreams = ref({});
        const screenStreams = ref({});
        const videoRefs = ref({});
        const screenRefs = ref({});
        const videoPanelRefs = ref({});
        const isScreenSharing = ref(false);
        const isDragging = ref(false);
        const dragStartPos = ref({ x: 0, y: 0 });
        const dragStartMouse = ref({ x: 0, y: 0 });
        const isRecording = ref(false);
        const mediaRecorder = ref(null);
        const recordedChunks = ref([]);
        const showVideoPanel = ref(true);
        const videoPanelPosition = ref({ x: window.innerWidth - 620, y: 0 });
        const isDraggingVideoPanel = ref(false);
        const videoPanelDragStart = ref({ x: 0, y: 0 });

        let presenceUpdateInterval = null;
        let iceServers = [];

        const setVideoRef = (el, userId) => {
            if (el) {
                videoRefs.value[userId] = el;
                // For current user, use localStream if video is enabled
                if (userId === currentUserId.value && localStream.value && videoEnabled.value) {
                    el.srcObject = localStream.value;
                    el.play().catch(err => console.warn('Video play failed:', err));
                } else if (videoStreams.value[userId]) {
                    el.srcObject = videoStreams.value[userId];
                    el.play().catch(err => console.warn('Video play failed:', err));
                }
            }
        };

        const setScreenRef = (el, userId) => {
            if (el) {
                screenRefs.value[userId] = el;
                if (screenStreams.value[userId]) {
                    el.srcObject = screenStreams.value[userId];
                }
            }
        };

        const setVideoPanelRef = (el, userId, type) => {
            if (el) {
                const key = `${userId}-${type}`;
                videoPanelRefs.value[key] = el;
                console.log('Video panel ref set:', key, 'videoEnabled:', videoEnabled.value, 'localStream:', !!localStream.value);
                // Immediately try to set the stream
                updateVideoPanelStream(el, userId, type);
                // Also set up event listeners
                el.addEventListener('loadedmetadata', () => {
                    console.log('Video metadata loaded for:', key);
                    el.play().catch(err => {
                        console.warn('Video play on metadata failed:', err);
                        setTimeout(() => el.play().catch(() => {}), 100);
                    });
                });
                // Also listen for stream changes
                if (type === 'local' && videoEnabled.value) {
                    // Poll for stream if not ready
                    const checkStream = setInterval(() => {
                        if (localStream.value && el.srcObject !== localStream.value) {
                            console.log('Stream now available, setting srcObject');
                            el.srcObject = localStream.value;
                            el.play().catch(() => {});
                            clearInterval(checkStream);
                        }
                    }, 200);
                    // Clear after 5 seconds
                    setTimeout(() => clearInterval(checkStream), 5000);
                }
            }
        };

        const updateVideoPanelStream = (el, userId, type) => {
            if (!el) return;
            try {
                if (type === 'local' && localStream.value && videoEnabled.value) {
                    // Check if stream has video tracks
                    const videoTracks = localStream.value.getVideoTracks();
                    if (videoTracks.length > 0) {
                        // Set srcObject regardless of readyState - it will become live
                        el.srcObject = localStream.value;
                        // Force play with multiple retries
                        const tryPlay = () => {
                            el.play().catch(err => {
                                console.warn('Video panel play failed, retrying:', err);
                                setTimeout(tryPlay, 200);
                            });
                        };
                        setTimeout(tryPlay, 100);
                    }
                } else if (type === 'remote' && videoStreams.value[userId]) {
                    const stream = videoStreams.value[userId];
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        // Set srcObject regardless of readyState
                        el.srcObject = stream;
                        // Force play with multiple retries
                        const tryPlay = () => {
                            el.play().catch(err => {
                                console.warn('Video panel play failed, retrying:', err);
                                setTimeout(tryPlay, 200);
                            });
                        };
                        setTimeout(tryPlay, 100);
                    }
                }
            } catch (error) {
                console.error('Error updating video panel stream:', error);
            }
        };

        const handleVideoLoaded = (event) => {
            const video = event.target;
            if (video && video.srcObject) {
                // Ensure video plays after metadata is loaded
                const tryPlay = () => {
                    if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                        video.play().catch(err => {
                            console.warn('Video play after load failed:', err);
                            // Try again after a short delay
                            setTimeout(() => {
                                video.play().catch(() => {});
                            }, 200);
                        });
                    } else {
                        // Wait for video to be ready
                        setTimeout(tryPlay, 100);
                    }
                };
                setTimeout(tryPlay, 50);
            }
        };

        // Computed for active video users
        const activeVideoUsers = computed(() => {
            const users = [];
            if (videoEnabled.value && localStream.value) {
                users.push({ userId: currentUserId.value, name: currentUserProfile.value?.name || 'You', type: 'local' });
            }
            presences.value.forEach(p => {
                if (p.video_enabled && p.user_id !== currentUserId.value && videoStreams.value[p.user_id]) {
                    users.push({ userId: p.user_id, name: p.user?.name || 'User', type: 'remote' });
                }
            });
            return users;
        });

        // Computed property to check if any cameras are active
        const hasActiveCameras = computed(() => {
            if (videoEnabled.value && localStream.value) return true;
            return presences.value.some(p => p.video_enabled && p.user_id !== currentUserId.value && videoStreams.value[p.user_id]);
        });

        const closeVideoPanel = () => {
            showVideoPanel.value = false;
        };

        const toggleVideoPanel = () => {
            if (hasActiveCameras.value) {
                showVideoPanel.value = !showVideoPanel.value;
            } else {
                alert('No active cameras. Turn on your camera or wait for others to turn on theirs.');
            }
        };

        // Draggable video panel
        const startDragVideoPanel = (e) => {
            // Don't drag if clicking on close button
            if (e.target.closest('.video-panel-close-btn')) {
                return;
            }
            e.preventDefault();
            isDraggingVideoPanel.value = true;
            videoPanelDragStart.value = {
                x: e.clientX - videoPanelPosition.value.x,
                y: e.clientY - videoPanelPosition.value.y
            };
            document.addEventListener('mousemove', handleVideoPanelDrag);
            document.addEventListener('mouseup', stopDragVideoPanel);
        };

        const handleVideoPanelDrag = (e) => {
            if (!isDraggingVideoPanel.value) return;
            videoPanelPosition.value = {
                x: e.clientX - videoPanelDragStart.value.x,
                y: e.clientY - videoPanelDragStart.value.y
            };
            // Keep panel within viewport
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 100;
            videoPanelPosition.value.x = Math.max(0, Math.min(videoPanelPosition.value.x, maxX));
            videoPanelPosition.value.y = Math.max(0, Math.min(videoPanelPosition.value.y, maxY));
        };

        const stopDragVideoPanel = () => {
            isDraggingVideoPanel.value = false;
            document.removeEventListener('mousemove', handleVideoPanelDrag);
            document.removeEventListener('mouseup', stopDragVideoPanel);
        };

        // Recording functionality
        const toggleRecording = async () => {
            if (isRecording.value) {
                // Stop recording
                if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
                    mediaRecorder.value.stop();
                }
                isRecording.value = false;
            } else {
                // Start recording
                try {
                    await startRecording();
                } catch (error) {
                    console.error('Failed to start recording:', error);
                    alert('Failed to start recording. Please check your permissions.');
                }
            }
        };

        const startRecording = async () => {
            try {
                // Collect all active streams
                const streamsToRecord = [];
                
                // Add local stream if video/audio is enabled
                if (localStream.value) {
                    streamsToRecord.push(localStream.value);
                }
                
                // Add remote video streams
                Object.values(videoStreams.value).forEach(stream => {
                    if (stream) {
                        streamsToRecord.push(stream);
                    }
                });
                
                if (streamsToRecord.length === 0) {
                    alert('No active streams to record');
                    return;
                }
                
                // Create a combined stream (for simplicity, we'll record the local stream with audio from all)
                // In a more advanced implementation, you'd mix multiple streams
                const combinedStream = new MediaStream();
                
                // Add all video tracks
                streamsToRecord.forEach(stream => {
                    stream.getVideoTracks().forEach(track => {
                        combinedStream.addTrack(track);
                    });
                });
                
                // Add all audio tracks
                streamsToRecord.forEach(stream => {
                    stream.getAudioTracks().forEach(track => {
                        combinedStream.addTrack(track);
                    });
                });
                
                // If no tracks, get user media
                if (combinedStream.getTracks().length === 0) {
                    const userMedia = await navigator.mediaDevices.getUserMedia({ 
                        video: videoEnabled.value, 
                        audio: true 
                    });
                    userMedia.getTracks().forEach(track => combinedStream.addTrack(track));
                }
                
                const options = {
                    mimeType: 'video/webm;codecs=vp9,opus',
                    videoBitsPerSecond: 2500000
                };
                
                // Fallback to webm if vp9 not supported
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm;codecs=vp8,opus';
                }
                
                // Final fallback
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                }
                
                recordedChunks.value = [];
                const recorder = new MediaRecorder(combinedStream, options);
                
                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedChunks.value.push(event.data);
                    }
                };
                
                recorder.onstop = () => {
                    const blob = new Blob(recordedChunks.value, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recording-${new Date().toISOString()}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    recordedChunks.value = [];
                };
                
                recorder.onerror = (event) => {
                    console.error('Recording error:', event);
                    isRecording.value = false;
                    alert('Recording error occurred');
                };
                
                mediaRecorder.value = recorder;
                recorder.start(1000); // Collect data every second
                isRecording.value = true;
            } catch (error) {
                console.error('Error starting recording:', error);
                throw error;
            }
        };

        const getInitials = (name) => {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        };

        const getImageUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            if (url.startsWith('/storage/')) {
                return window.location.origin + url;
            }
            return url;
        };

        const fetchAllPresences = async () => {
            try {
                const response = await axios.get(`/api/virtual-office/rooms/${props.roomId}/presences`);
                
                if (response.data && Array.isArray(response.data)) {
                    const fetchedPresences = response.data;
                    
                    if (fetchedPresences.length > 0) {
                        const processedPresences = fetchedPresences.map((p, idx) => ({
                            id: p.id,
                            user_id: p.user_id,
                            room_id: p.room_id,
                            status: p.status || 'online',
                            position_x: p.position_x || (100 + (idx * 150)),
                            position_y: p.position_y || (100 + (idx * 150)),
                            audio_enabled: p.audio_enabled || false,
                            video_enabled: p.video_enabled || false,
                            user: p.user || null,
                            last_seen_at: p.last_seen_at,
                        }));
                        
                        presences.value.splice(0, presences.value.length);
                        processedPresences.forEach((p) => {
                            presences.value.push(p);
                        });
                        
                        await nextTick();
                    }
                }
            } catch (error) {
                // Silently fail - presences will be loaded from joinRoom
            }
        };

        const loadRoom = async () => {
            try {
                const response = await axios.get(`/api/virtual-office/rooms/${props.roomId}`);
                room.value = response.data.room;
                backgroundImageUrl.value = room.value?.background_image || '';
                
                if (presences.value.length === 0 && response.data.presences && Array.isArray(response.data.presences)) {
                    const fallbackPresences = response.data.presences.map((p, idx) => ({
                        id: p.id || `presence-${p.user_id}-${idx}`,
                        user_id: p.user_id,
                        room_id: p.room_id || props.roomId,
                        status: p.status || 'online',
                        position_x: Number(p.position_x) || (100 + (idx * 150)),
                        position_y: Number(p.position_y) || (100 + (idx * 150)),
                        audio_enabled: Boolean(p.audio_enabled),
                        video_enabled: Boolean(p.video_enabled),
                        user: p.user || {
                            id: p.user_id,
                            name: 'User ' + p.user_id,
                            email: null,
                            avatar_url: null,
                            position: null,
                            department: null
                        },
                        last_seen_at: p.last_seen_at || new Date().toISOString(),
                    }));
                    
                    presences.value.splice(0, presences.value.length);
                    presences.value.push(...fallbackPresences);
                }
            } catch (err) {
                // Silently fail - not critical
            }
        };

        const joinRoom = async () => {
            try {

                const response = await axios.post(`/api/virtual-office/rooms/${props.roomId}/join`);

                
                currentUserId.value = response.data.presence.user_id;

                
                const activePresencesFromResponse = response.data.active_presences;
                let allPresences = [];
                
                if (activePresencesFromResponse && Array.isArray(activePresencesFromResponse) && activePresencesFromResponse.length > 0) {
                    // Create a copy to avoid reference issues
                    allPresences = activePresencesFromResponse.map(p => ({ ...p }));

                } else {
                    try {
                        const presencesResponse = await axios.get(`/api/virtual-office/rooms/${props.roomId}/presences`);
                        if (Array.isArray(presencesResponse.data) && presencesResponse.data.length > 0) {
                            allPresences = presencesResponse.data.map(p => ({ ...p }));
                        }
                    } catch (err) {
                        // Silently fail
                    }
                }
                
                const currentPresenceIndex = allPresences.findIndex(p => p.user_id === currentUserId.value);
                if (currentPresenceIndex === -1) {
                    allPresences.push(response.data.presence);
                } else {
                    allPresences[currentPresenceIndex] = response.data.presence;
                }
                
                if (allPresences.length < 2) {
                    try {
                        const presencesResponse = await axios.get(`/api/virtual-office/rooms/${props.roomId}/presences`);
                        if (Array.isArray(presencesResponse.data) && presencesResponse.data.length > allPresences.length) {
                            allPresences = presencesResponse.data;
                        }
                    } catch (err) {
                        // Silently fail
                    }
                }
                
                const usedPositions = new Set();
                allPresences.forEach((presence, index) => {
                    const posKey = `${presence.position_x}_${presence.position_y}`;
                    if (usedPositions.has(posKey) || !presence.position_x || !presence.position_y) {
                        presence.position_x = 100 + (index * 150);
                        presence.position_y = 100 + (index * 150);
                    }
                    usedPositions.add(`${presence.position_x}_${presence.position_y}`);
                });
                
                if (allPresences.length === 0) {
                    try {
                        const presencesResponse = await axios.get(`/api/virtual-office/rooms/${props.roomId}/presences`);
                        if (Array.isArray(presencesResponse.data) && presencesResponse.data.length > 0) {
                            allPresences = presencesResponse.data;
                        }
                    } catch (err) {
                        // Silently fail
                    }
                }
                
                const processedPresences = allPresences.map((p, idx) => {
                    const userObj = p.user || {
                        id: p.user_id,
                        name: 'User ' + p.user_id,
                        email: null,
                        avatar_url: null,
                        position: null,
                        department: null
                    };
                    
                    return {
                        id: p.id || `presence-${p.user_id}-${idx}`,
                        user_id: p.user_id,
                        room_id: p.room_id || props.roomId,
                        status: p.status || 'online',
                        position_x: Number(p.position_x) || (100 + (idx * 150)),
                        position_y: Number(p.position_y) || (100 + (idx * 150)),
                        audio_enabled: Boolean(p.audio_enabled),
                        video_enabled: Boolean(p.video_enabled),
                        user: userObj,
                        last_seen_at: p.last_seen_at || new Date().toISOString(),
                    };
                });
                
                if (processedPresences.length === 0) {
                    return;
                }
                
                presences.value.splice(0, presences.value.length);
                processedPresences.forEach((p) => {
                    presences.value.push(p);
                });
                



                
                // Force Vue update
                await nextTick();

                
                await nextTick();
                
                try {
                    // Initialize media with audio only (camera OFF by default)
                    videoEnabled.value = false;
                    proximityAudioEnabled.value = false;
                    audioEnabled.value = false;
                    await initializeMedia();
                    
                    // Update presence to reflect camera is OFF by default and audio is OFF
                    await updatePresence({ video_enabled: false, audio_enabled: false });
                    
                    // Set local video stream for video call (if enabled later)
                    if (localStream.value && localVideoRef.value) {
                        localVideoRef.value.srcObject = localStream.value;
                    }
                } catch (mediaError) {
                    // If media fails, set video_enabled to false
                    videoEnabled.value = false;
                    await updatePresence({ video_enabled: false });
                    // Continue even if media fails - user can enable later
                }
                
                loading.value = false;
            } catch (err) {
                error.value = err.response?.data?.message || err.message || 'Failed to join room';
                loading.value = false;
            }
        };

        const initializeMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoEnabled.value,
                    audio: audioEnabled.value,
                });
                
                localStream.value = stream;
                
                // Set videoStreams for current user if video is enabled
                if (videoEnabled.value && currentUserId.value) {
                    videoStreams.value[currentUserId.value] = stream;
                    // Update the video element if it exists
                    await nextTick();
                    const videoEl = videoRefs.value[currentUserId.value];
                    if (videoEl) {
                        videoEl.srcObject = stream;
                    }
                    // Update video panel
                    const localKey = `${currentUserId.value}-local`;
                    const panelEl = videoPanelRefs.value[localKey];
                    if (panelEl) {
                        updateVideoPanelStream(panelEl, currentUserId.value, 'local');
                    }
                }
                
                // Add stream to all existing peer connections
                Object.entries(peers.value).forEach(([userId, peer]) => {
                    if (peer && peer.addTrack) {
                        stream.getTracks().forEach(track => {
                            try {
                                peer.addTrack(track, stream);
                            } catch (err) {
                                // Silently fail - peer might already have track
                            }
                        });
                    }
                });
                
                // Get available devices
                const devices = await navigator.mediaDevices.enumerateDevices();
                cameras.value = devices.filter(d => d.kind === 'videoinput');
                microphones.value = devices.filter(d => d.kind === 'audioinput');
                speakers.value = devices.filter(d => d.kind === 'audiooutput');
                
                if (cameras.value.length > 0) selectedCamera.value = cameras.value[0].deviceId;
                if (microphones.value.length > 0) selectedMicrophone.value = microphones.value[0].deviceId;
                if (speakers.value.length > 0) selectedSpeaker.value = speakers.value[0].deviceId;
            } catch (error) {

                // Don't throw - allow user to continue without media
                // They can enable it later via settings
            }
        };

        const getIceServers = async () => {
            try {
                const response = await axios.get('/api/webrtc/ice-servers');
                iceServers = response.data.iceServers || [];

            } catch (error) {
                
                // Fallback to default STUN server
                iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

            }
            
            // Ensure we always have at least one ICE server
            if (!iceServers || iceServers.length === 0) {
                iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
            }
        };

        const setupWebRTC = async () => {
            // Wait for Echo to be ready
            let retries = 0;
            while (!window.EchoReady && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            // Listen for WebRTC events
            if (window.Echo && window.Echo.private) {
                try {
                    const channel = window.Echo.private(`user.${currentUserId.value}`);
                    if (channel && channel.listen) {
                        channel.listen('.webrtc.offer', (data) => handleOffer(data));
                        channel.listen('.webrtc.answer', (data) => handleAnswer(data));
                        channel.listen('.webrtc.ice-candidate', (data) => handleIceCandidate(data));
                    }
                } catch (error) {
                    
                }
            } else {

            }

            // Create peer connections for ALL existing users in the room

            presences.value.forEach(presence => {
                if (presence.user_id !== currentUserId.value && !peers.value[presence.user_id]) {

                    createPeer(presence.user_id, true);
                } else if (presence.user_id === currentUserId.value) {

                } else {

                }
            });
        };

        // Calculate distance between two presences
        const calculateDistance = (x1, y1, x2, y2) => {
            const dx = x1 - x2;
            const dy = y1 - y2;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // Update audio volume based on speaker mode
        const updateProximityAudio = () => {
            if (!canvasRef.value) return;
            
            const currentPresence = presences.value.find(p => p.user_id === currentUserId.value);
            if (!currentPresence) return;
            
            const maxDistance = 300; // Maximum distance for proximity audio
            const minVolume = 0.1; // Minimum volume (10%)
            const maxVolume = 1.0; // Maximum volume (100%)
            
            presences.value.forEach(presence => {
                if (presence.user_id === currentUserId.value) return;
                
                const audioElement = videoRefs.value[presence.user_id];
                if (!audioElement) return;
                
                // Check if the other user has audio enabled
                if (!presence.audio_enabled) {
                    audioElement.volume = 0;
                    return;
                }
                
                // Calculate distance for proximity audio
                const distance = calculateDistance(
                    parseFloat(currentPresence.position_x) || 0,
                    parseFloat(currentPresence.position_y) || 0,
                    parseFloat(presence.position_x) || 0,
                    parseFloat(presence.position_y) || 0
                );
                
                // If current user has global audio ON, everyone hears at full volume
                if (proximityAudioEnabled.value) {
                    audioElement.volume = maxVolume;
                } 
                // If current user has proximity audio ON, use distance-based volume
                else if (proximityAudioEnabled.value) {
                    const volume = distance > maxDistance 
                        ? 0 
                        : maxVolume - ((distance / maxDistance) * (maxVolume - minVolume));
                    audioElement.volume = Math.max(0, Math.min(1, volume));
                } 
                // If both are OFF, no audio
                else {
                    audioElement.volume = 0;
                }
            });
        };

        const createPeer = (userId, initiator) => {
            // Don't create duplicate peers
            if (peers.value[userId]) {

                return;
            }


            
            try {
                // Ensure iceServers is properly formatted
                const peerConfig = {
                    initiator,
                    trickle: false,
                    stream: localStream.value || undefined,
                    config: {
                        iceServers: (iceServers && iceServers.length > 0) ? iceServers : [
                            { urls: 'stun:stun.l.google.com:19302' }
                        ],
                    },
                };
                
                const peer = new SimplePeer(peerConfig);

                peer.on('signal', (data) => {

                    if (initiator) {
                        sendOffer(userId, JSON.stringify(data));
                    } else {
                        sendAnswer(userId, JSON.stringify(data));
                    }
                });

                peer.on('stream', (stream) => {
                    // Check if it's a screen share or video stream
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0 && videoTracks[0].label.toLowerCase().includes('screen')) {
                        screenStreams.value[userId] = stream;
                        nextTick(() => {
                            if (screenRefs.value[userId]) {
                                screenRefs.value[userId].srcObject = stream;
                            }
                        });
                    } else {
                        videoStreams.value[userId] = stream;
                        nextTick(() => {
                            if (videoRefs.value[userId]) {
                                videoRefs.value[userId].srcObject = stream;
                                videoRefs.value[userId].volume = 0.5; // Initial volume
                            }
                            // Update video panel
                            const remoteKey = `${userId}-remote`;
                            const panelEl = videoPanelRefs.value[remoteKey];
                            if (panelEl) {
                                updateVideoPanelStream(panelEl, userId, 'remote');
                            }
                            updateProximityAudio();
                        });
                    }
                });

                peer.on('error', (err) => {
                    
                    // Don't crash on peer errors - just log them
                });

                peers.value[userId] = peer;

            } catch (peerError) {
                
                
                // Don't crash - continue without peer connection
                // User can still see others, just won't have audio/video initially
            }
        };

        const toggleScreenShare = async () => {
            try {
                if (isScreenSharing.value) {
                    // Stop screen sharing
                    if (screenStream.value) {
                        screenStream.value.getTracks().forEach(track => track.stop());
                        screenStream.value = null;
                    }
                    
                    // Remove screen stream from all peers
                    Object.values(peers.value).forEach(peer => {
                        const senders = peer._pc.getSenders();
                        senders.forEach(sender => {
                            if (sender.track && sender.track.label.toLowerCase().includes('screen')) {
                                peer.removeTrack(sender.track, screenStream.value);
                            }
                        });
                    });
                    
                    isScreenSharing.value = false;
                } else {
                    // Start screen sharing
                    const stream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: true
                    });
                    
                    screenStream.value = stream;
                    isScreenSharing.value = true;
                    
                    // Add screen stream to all existing peers
                    Object.entries(peers.value).forEach(([userId, peer]) => {
                        stream.getTracks().forEach(track => {
                            peer.addTrack(track, stream);
                        });
                    });
                    
                    // Handle screen share stop
                    stream.getVideoTracks()[0].onended = () => {
                        toggleScreenShare();
                    };
                }
            } catch (error) {
                
                if (error.name !== 'NotAllowedError') {
                    alert('Failed to share screen: ' + error.message);
                }
            }
        };

        const sendOffer = async (userId, offer) => {
            try {
                await axios.post(`/api/webrtc/rooms/${props.roomId}/offer`, {
                    target_user_id: userId,
                    offer: offer,
                });
            } catch (error) {
                
            }
        };

        const sendAnswer = async (userId, answer) => {
            try {
                await axios.post(`/api/webrtc/rooms/${props.roomId}/answer`, {
                    target_user_id: userId,
                    answer: answer,
                });
            } catch (error) {
                
            }
        };

        const handleOffer = async (data) => {
            if (!peers.value[data.from_user_id]) {
                createPeer(data.from_user_id, false);
            }
            peers.value[data.from_user_id].signal(JSON.parse(data.offer));
        };

        const handleAnswer = (data) => {
            if (peers.value[data.from_user_id]) {
                peers.value[data.from_user_id].signal(JSON.parse(data.answer));
            }
        };

        const handleIceCandidate = (data) => {
            if (peers.value[data.from_user_id]) {
                peers.value[data.from_user_id].signal(JSON.parse(data.candidate));
            }
        };

        let lastPresenceUpdate = 0;
        const PRESENCE_UPDATE_THROTTLE = 2000; // Minimum 2 seconds between updates
        
        const updatePresence = async (updates) => {
            const now = Date.now();
            if (now - lastPresenceUpdate < PRESENCE_UPDATE_THROTTLE) {
                // Throttle updates to prevent rate limiting
                return;
            }
            
            try {
                lastPresenceUpdate = now;
                await axios.put(`/api/virtual-office/rooms/${props.roomId}/presence`, updates);
                
                // Update local presence
                const currentPresenceIndex = presences.value.findIndex(p => p.user_id === currentUserId.value);
                if (currentPresenceIndex !== -1) {
                    Object.assign(presences.value[currentPresenceIndex], updates);
                }
            } catch (error) {
                // Handle rate limiting gracefully
                if (error.response?.status === 429) {
                    // Rate limited - increase throttle temporarily
                    lastPresenceUpdate = now + 10000; // Wait 10 seconds before next update
                }
                // Silently fail for other errors
            }
        };

        const toggleProximityAudio = async () => {
            proximityAudioEnabled.value = !proximityAudioEnabled.value;
            audioEnabled.value = proximityAudioEnabled.value;
            
            if (localStream.value) {
                localStream.value.getAudioTracks().forEach(track => {
                    track.enabled = audioEnabled.value;
                });
                
                // Update all peer connections with the new audio track state
                Object.values(peers.value).forEach(peer => {
                    if (peer && peer._pc) {
                        const senders = peer._pc.getSenders();
                        senders.forEach(sender => {
                            if (sender.track && sender.track.kind === 'audio') {
                                sender.track.enabled = audioEnabled.value;
                            }
                        });
                    }
                });
            } else if (audioEnabled.value) {
                // If stream doesn't exist and we're enabling audio, get new stream
                try {
                    await initializeMedia();
                } catch (error) {
                    console.error('Failed to initialize proximity audio:', error);
                    proximityAudioEnabled.value = false;
                    audioEnabled.value = false;
                }
            }
            await updatePresence({ audio_enabled: audioEnabled.value });
            updateProximityAudio();
        };


        const toggleVideo = async () => {
            try {
                const newVideoState = !videoEnabled.value;
                videoEnabled.value = newVideoState;
                
                if (newVideoState) {
                    // Turning camera ON
                    // Check if we have a valid video track that's not stopped
                    const hasValidVideoTrack = localStream.value && 
                        localStream.value.getVideoTracks().some(track => 
                            !track.label.toLowerCase().includes('screen') && 
                            track.readyState === 'live'
                        );
                    
                    if (!hasValidVideoTrack) {
                        // Need to get a new stream with video
                        try {
                            // Stop old video tracks if they exist
                            if (localStream.value) {
                                localStream.value.getVideoTracks().forEach(track => {
                                    if (!track.label.toLowerCase().includes('screen')) {
                                        track.stop();
                                    }
                                });
                            }
                            
                            // Get new stream with video
                            const newStream = await navigator.mediaDevices.getUserMedia({
                                video: true,
                                audio: audioEnabled.value,
                            });
                            
                            // If we had an existing stream, merge audio tracks if needed
                            if (localStream.value && audioEnabled.value) {
                                // Keep existing audio tracks if they're still live
                                const existingAudioTracks = localStream.value.getAudioTracks().filter(t => t.readyState === 'live');
                                if (existingAudioTracks.length > 0) {
                                    // Use existing audio tracks
                                    newStream.getAudioTracks().forEach(track => track.stop());
                                    existingAudioTracks.forEach(track => {
                                        newStream.addTrack(track);
                                    });
                                }
                                
                                // Stop old stream's video tracks
                                localStream.value.getVideoTracks().forEach(track => {
                                    if (!track.label.toLowerCase().includes('screen')) {
                                        track.stop();
                                    }
                                });
                            }
                            
                            localStream.value = newStream;
                            
                            // Update videoStreams for current user
                            videoStreams.value[currentUserId.value] = newStream;
                            
                            // Update the video element
                            await nextTick();
                            const videoEl = videoRefs.value[currentUserId.value];
                            if (videoEl) {
                                videoEl.srcObject = newStream;
                                videoEl.play().catch(err => console.warn('Video play failed:', err));
                            }
                            // Update video panel - wait a bit for DOM to update
                            await nextTick();
                            setTimeout(() => {
                                const localKey = `${currentUserId.value}-local`;
                                const panelEl = videoPanelRefs.value[localKey];
                                if (panelEl && newStream) {
                                    panelEl.srcObject = newStream;
                                    const tryPlay = () => {
                                        panelEl.play().catch(err => {
                                            console.warn('Video panel play failed, retrying:', err);
                                            setTimeout(tryPlay, 200);
                                        });
                                    };
                                    setTimeout(tryPlay, 100);
                                }
                            }, 200);
                            
                            // Update all peer connections with new video track
                            Object.values(peers.value).forEach(peer => {
                                if (peer && peer._pc) {
                                    newStream.getVideoTracks().forEach(videoTrack => {
                                        if (!videoTrack.label.toLowerCase().includes('screen')) {
                                            try {
                                                const senders = peer._pc.getSenders();
                                                const existingVideoSender = senders.find(s => 
                                                    s.track && s.track.kind === 'video' && 
                                                    !s.track.label.toLowerCase().includes('screen')
                                                );
                                                
                                                if (existingVideoSender) {
                                                    existingVideoSender.replaceTrack(videoTrack);
                                                } else {
                                                    peer._pc.addTrack(videoTrack, newStream);
                                                }
                                            } catch (err) {
                                                console.warn('Failed to update peer video track:', err);
                                            }
                                        }
                                    });
                                }
                            });
                        } catch (error) {
                            console.error('Failed to enable video:', error);
                            videoEnabled.value = false;
                            throw error;
                        }
                    } else {
                        // Video track exists and is live, just enable it
                        localStream.value.getVideoTracks().forEach(track => {
                            if (!track.label.toLowerCase().includes('screen')) {
                                track.enabled = true;
                            }
                        });
                        
                        videoStreams.value[currentUserId.value] = localStream.value;
                        
                        await nextTick();
                        const videoEl = videoRefs.value[currentUserId.value];
                        if (videoEl) {
                            videoEl.srcObject = localStream.value;
                            videoEl.play().catch(err => console.warn('Video play failed:', err));
                        }
                        // Update video panel
                        const localKey = `${currentUserId.value}-local`;
                        const panelEl = videoPanelRefs.value[localKey];
                        if (panelEl) {
                            updateVideoPanelStream(panelEl, currentUserId.value, 'local');
                        }
                        
                        // Update peer connections
                        Object.values(peers.value).forEach(peer => {
                            if (peer && peer._pc) {
                                const senders = peer._pc.getSenders();
                                senders.forEach(sender => {
                                    if (sender.track && sender.track.kind === 'video' && !sender.track.label.toLowerCase().includes('screen')) {
                                        sender.track.enabled = true;
                                    }
                                });
                            }
                        });
                    }
                } else {
                    // Turning camera OFF
                    if (localStream.value) {
                        // STOP video tracks completely (this stops the camera hardware)
                        localStream.value.getVideoTracks().forEach(track => {
                            if (!track.label.toLowerCase().includes('screen')) {
                                track.stop(); // This stops the camera hardware
                                track.enabled = false;
                            }
                        });
                        
                        // Remove video stream for current user
                        delete videoStreams.value[currentUserId.value];
                        
                        // Update the video element
                        await nextTick();
                        const videoEl = videoRefs.value[currentUserId.value];
                        if (videoEl) {
                            videoEl.srcObject = null;
                        }
                        
                        // Update all peer connections
                        Object.values(peers.value).forEach(peer => {
                            if (peer && peer._pc) {
                                const senders = peer._pc.getSenders();
                                senders.forEach(sender => {
                                    if (sender.track && sender.track.kind === 'video' && !sender.track.label.toLowerCase().includes('screen')) {
                                        sender.track.enabled = false;
                                    }
                                });
                            }
                        });
                    }
                }
                
                // Update presence in database and local state
                await updatePresence({ video_enabled: newVideoState });
                
                // Update local presence object to reflect the change immediately
                const currentPresence = presences.value.find(p => p.user_id === currentUserId.value);
                if (currentPresence) {
                    currentPresence.video_enabled = newVideoState;
                }
            } catch (error) {
                console.error('Failed to toggle video:', error);
                videoEnabled.value = !videoEnabled.value; // Revert on error
            }
        };

        const handleCanvasClick = (event) => {
            if (event.target === canvasRef.value || event.target.classList.contains('workspace-grid')) {
                const rect = canvasRef.value.getBoundingClientRect();
                const x = (event.clientX - rect.left) / zoomLevel.value;
                const y = (event.clientY - rect.top) / zoomLevel.value;
                updatePresence({ position_x: x, position_y: y });
            }
        };

        const zoomIn = () => {
            const centerX = canvasWrapperRef.value.clientWidth / 2;
            const centerY = canvasWrapperRef.value.clientHeight / 2;
            const scale = zoomLevel.value;
            const x = (centerX - panX.value) / scale;
            const y = (centerY - panY.value) / scale;
            
            zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
            
            const newScale = zoomLevel.value;
            panX.value = centerX - x * newScale;
            panY.value = centerY - y * newScale;
        };

        const zoomOut = () => {
            const centerX = canvasWrapperRef.value.clientWidth / 2;
            const centerY = canvasWrapperRef.value.clientHeight / 2;
            const scale = zoomLevel.value;
            const x = (centerX - panX.value) / scale;
            const y = (centerY - panY.value) / scale;
            
            zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.5);
            
            const newScale = zoomLevel.value;
            panX.value = centerX - x * newScale;
            panY.value = centerY - y * newScale;
        };

        const resetZoom = () => {
            zoomLevel.value = 1;
            panX.value = 0;
            panY.value = 0;
        };

        const handleWheel = (event) => {
            event.preventDefault();
            
            // Get mouse position relative to canvas wrapper
            const rect = canvasWrapperRef.value.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Calculate zoom factor
            const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.5, Math.min(3, zoomLevel.value * zoomFactor));
            
            // Calculate the point under the mouse before zoom
            const scale = zoomLevel.value;
            const x = (mouseX - panX.value) / scale;
            const y = (mouseY - panY.value) / scale;
            
            // Apply new zoom
            zoomLevel.value = newZoom;
            
            // Adjust pan to keep the point under the mouse in the same place
            const newScale = zoomLevel.value;
            panX.value = mouseX - x * newScale;
            panY.value = mouseY - y * newScale;
        };

        const handlePanStart = (event) => {
            // Only pan if clicking on canvas or workspace grid (not on user avatar or other interactive elements)
            const target = event.target;
            const isInteractiveElement = target.closest('.user-avatar') || 
                                        target.closest('.user-controls') ||
                                        target.closest('button') ||
                                        target.closest('input') ||
                                        target.closest('video');
            
            if (!isInteractiveElement && (target === canvasRef.value || target.classList.contains('workspace-grid'))) {
                if (event.button === 0 && !isDragging.value) { // Left mouse button and not dragging user
                    event.preventDefault();
                    event.stopPropagation();
                    isPanning.value = true;
                    panStart.value = {
                        x: event.clientX - panX.value,
                        y: event.clientY - panY.value
                    };
                }
            }
        };

        const handlePanMove = (event) => {
            if (isPanning.value && !isDragging.value) {
                event.preventDefault();
                event.stopPropagation();
                panX.value = event.clientX - panStart.value.x;
                panY.value = event.clientY - panStart.value.y;
            }
        };

        const handlePanEnd = () => {
            isPanning.value = false;
        };

        const handleMouseDown = (event, presence) => {
            if (presence.user_id === currentUserId.value && event.button === 0) {
                event.preventDefault();
                event.stopPropagation();
                isPanning.value = false; // Stop panning when dragging user
                isDragging.value = true;
                draggingUserId.value = presence.user_id;
                
                const rect = canvasRef.value.getBoundingClientRect();
                dragStartPos.value = {
                    x: parseFloat(presence.position_x) || 0,
                    y: parseFloat(presence.position_y) || 0
                };
                const scale = zoomLevel.value;
                dragStartMouse.value = {
                    x: (event.clientX - rect.left - panX.value) / scale,
                    y: (event.clientY - rect.top - panY.value) / scale
                };
                
                document.addEventListener('mousemove', handleMouseMove, { passive: false });
                document.addEventListener('mouseup', () => handleMouseUp(presence), { once: true });
            }
        };

        const handleMouseMove = (event) => {
            if (!isDragging.value || !canvasRef.value) return;
            
            event.preventDefault();
            
            const rect = canvasRef.value.getBoundingClientRect();
            const scale = zoomLevel.value;
            const currentMouse = {
                x: (event.clientX - rect.left - panX.value) / scale,
                y: (event.clientY - rect.top - panY.value) / scale
            };
            
            const deltaX = currentMouse.x - dragStartMouse.value.x;
            const deltaY = currentMouse.y - dragStartMouse.value.y;
            
            // Allow free movement anywhere on canvas - use fixed canvas dimensions
            const canvasWidth = 4000; // Fixed canvas width
            const canvasHeight = 3000; // Fixed canvas height
            const avatarSize = 100; // Approximate avatar size
            
            // Calculate new position
            let newX = dragStartPos.value.x + deltaX;
            let newY = dragStartPos.value.y + deltaY;
            
            // Constrain to canvas bounds
            newX = Math.max(0, Math.min(newX, canvasWidth - avatarSize));
            newY = Math.max(0, Math.min(newY, canvasHeight - avatarSize));
            
            // Update local position immediately for smooth dragging
            const currentPresence = presences.value.find(p => p.user_id === currentUserId.value);
            if (currentPresence) {
                currentPresence.position_x = newX;
                currentPresence.position_y = newY;
            }
        };

        const handleMouseUp = async (presence) => {
            if (isDragging.value && presence.user_id === currentUserId.value) {
                isDragging.value = false;
                
                const currentPresence = presences.value.find(p => p.user_id === currentUserId.value);
                if (currentPresence) {
                    // Update position on server with current position
                    await updatePresence({
                        position_x: currentPresence.position_x,
                        position_y: currentPresence.position_y
                    });
                }
                
                draggingUserId.value = null;
                document.removeEventListener('mousemove', handleMouseMove);
            }
        };

        const loadProfile = async () => {
            try {
                const response = await axios.get('/api/profile');
                currentUserProfile.value = response.data;
                profileName.value = response.data.name || '';
                profileAvatarUrl.value = response.data.avatar_url || '';
                profilePosition.value = response.data.position || '';
                profileDepartment.value = response.data.department || '';
            } catch (error) {
                
            }
        };

        const openProfile = async () => {
            await loadProfile();
            showProfile.value = true;
        };

        const closeProfile = () => {
            showProfile.value = false;
        };

        const handleAvatarFileSelect = (event) => {
            const file = event.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size should be less than 5MB');
                    return;
                }
                
                profileAvatarFile.value = file;
                
                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    profileAvatarPreview.value = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        const removeAvatar = () => {
            profileAvatarFile.value = null;
            profileAvatarPreview.value = null;
            profileAvatarUrl.value = '';
            if (avatarFileInput.value) {
                avatarFileInput.value.value = '';
            }
        };

        const toggleChat = () => {
            showChat.value = !showChat.value;
        };

        const formatTime = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        };

        const sendChatMessage = async () => {
            if (!chatInput.value.trim()) return;
            
            try {
                await axios.post(`/api/virtual-office/rooms/${props.roomId}/messages`, {
                    content: chatInput.value.trim(),
                    type: 'text',
                });
                chatInput.value = '';
                await loadChatMessages();
                scrollChatToBottom();
            } catch (error) {
                alert('Failed to send message. Please try again.');
            }
        };

        const triggerImageUpload = () => {
            chatImageInput.value?.click();
        };

        const triggerFileUpload = () => {
            chatFileInput.value?.click();
        };

        const handleImageUpload = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'image');
                
                await axios.post(`/api/virtual-office/rooms/${props.roomId}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                await loadChatMessages();
                scrollChatToBottom();
            } catch (error) {
                alert('Failed to send image. Please try again.');
            }
            
            event.target.value = '';
        };

        const handleFileUpload = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'file');
                
                await axios.post(`/api/virtual-office/rooms/${props.roomId}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                await loadChatMessages();
                scrollChatToBottom();
            } catch (error) {
                alert('Failed to send file. Please try again.');
            }
            
            event.target.value = '';
        };

        const scrollChatToBottom = () => {
            nextTick(() => {
                if (chatMessagesRef.value) {
                    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
                }
            });
        };

        const openImageModal = (imageUrl) => {
            // Simple image modal - can be enhanced later
            window.open(imageUrl, '_blank');
        };

        const handleImageError = (event) => {
            // Hide broken image, show initials instead
            event.target.style.display = 'none';
        };

        const openBackgroundSettings = () => {
            if (!room.value) {
                alert('Room not loaded yet. Please wait...');
                return;
            }
            // Reset form state
            backgroundImageUrl.value = room.value?.background_image || '';
            backgroundImagePreview.value = null;
            backgroundImageFile.value = null;
            if (backgroundImageInput.value) {
                backgroundImageInput.value.value = '';
            }
            showBackgroundSettings.value = true;
        };

        const closeBackgroundSettings = () => {
            showBackgroundSettings.value = false;
            // Reset preview when closing
            backgroundImagePreview.value = null;
            backgroundImageFile.value = null;
        };

        const removeBackground = async () => {
            try {
                const formData = new FormData();
                formData.append('background_image_url', '');
                
                const response = await axios.post(`/api/virtual-office/rooms/${props.roomId}/background`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                
                if (room.value) {
                    room.value.background_image = null;
                }
                backgroundImageUrl.value = '';
                backgroundImagePreview.value = null;
                backgroundImageFile.value = null;
                
                await loadRoom();
                alert('Background removed successfully!');
            } catch (error) {
                alert('Failed to remove background. Please try again.');
            }
        };

        const handleBackgroundImageSelect = (event) => {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                }
                
                if (file.size > 10 * 1024 * 1024) {
                    alert('Image size should be less than 10MB');
                    return;
                }
                
                backgroundImageFile.value = file;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    backgroundImagePreview.value = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };


        const openInviteModal = () => {
            inviteLink.value = `${window.location.origin}/rooms/${props.roomId}`;
            showInviteModal.value = true;
        };

        const closeInviteModal = () => {
            showInviteModal.value = false;
        };

        const sendInvite = async () => {
            if (!inviteEmail.value.trim()) {
                alert('Please enter an email address');
                return;
            }
            
            try {
                await axios.post(`/api/virtual-office/rooms/${props.roomId}/invite`, {
                    email: inviteEmail.value.trim(),
                });
                alert('Invitation sent successfully!');
                inviteEmail.value = '';
            } catch (error) {
                
                alert('Failed to send invitation. Please try again.');
            }
        };

        const copyInviteLink = () => {
            navigator.clipboard.writeText(inviteLink.value).then(() => {
                alert('Invite link copied to clipboard!');
            }).catch(() => {
                alert('Failed to copy link');
            });
        };

        const saveBackground = async () => {
            try {
                if (!backgroundImageFile.value && !backgroundImageUrl.value) {
                    alert('Please select an image file or enter an image URL');
                    return;
                }

                const formData = new FormData();
                
                if (backgroundImageFile.value) {
                    formData.append('background_image', backgroundImageFile.value);
                } else if (backgroundImageUrl.value) {
                    formData.append('background_image_url', backgroundImageUrl.value.trim());
                }
                
                const response = await axios.post(`/api/virtual-office/rooms/${props.roomId}/background`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                
                // Update room background image immediately
                if (room.value && response.data.background_image) {
                    room.value.background_image = response.data.background_image;
                } else if (room.value) {
                    room.value.background_image = null;
                }
                
                backgroundImagePreview.value = null;
                backgroundImageFile.value = null;
                if (backgroundImageInput.value) {
                    backgroundImageInput.value.value = '';
                }
                
                // Reload room to ensure background is updated
                await loadRoom();
                closeBackgroundSettings();
                
                alert('Background updated successfully!');
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'Failed to save background. Please try again.';
                alert(errorMessage);
            }
        };

        const loadChatMessages = async () => {
            try {
                const response = await axios.get(`/api/virtual-office/rooms/${props.roomId}/messages`);
                chatMessages.value = response.data.messages || [];
                scrollChatToBottom();
            } catch (error) {
                
            }
        };

        const saveProfile = async () => {
            try {
                const formData = new FormData();
                formData.append('name', profileName.value);
                formData.append('position', profilePosition.value);
                formData.append('department', profileDepartment.value);
                
                // If file is selected, upload it
                if (profileAvatarFile.value) {
                    formData.append('avatar', profileAvatarFile.value);
                } else if (profileAvatarUrl.value) {
                    formData.append('avatar_url', profileAvatarUrl.value);
                }
                
                const response = await axios.post('/api/profile', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                
                currentUserProfile.value = response.data;
                profileAvatarPreview.value = null;
                profileAvatarFile.value = null;
                if (avatarFileInput.value) {
                    avatarFileInput.value.value = '';
                }
                
                closeProfile();
                // Reload room to update user info
                await loadRoom();
            } catch (error) {
                
                
                alert('Failed to save profile: ' + (error.response?.data?.message || error.message));
            }
        };

        const leaveRoom = async () => {
            try {
                await axios.post(`/api/virtual-office/rooms/${props.roomId}/leave`);
                
                // Clean up media streams
                if (localStream.value) {
                    localStream.value.getTracks().forEach(track => track.stop());
                }
                
                // Clean up peer connections
                Object.values(peers.value).forEach(peer => peer.destroy());
                
                if (presenceUpdateInterval) {
                    clearInterval(presenceUpdateInterval);
                }
                
                window.location.href = '/';
            } catch (error) {
                
            }
        };

        const openSettings = () => {
            showSettings.value = true;
        };

        const closeSettings = () => {
            showSettings.value = false;
        };

        const saveSettings = async () => {
            try {
                await axios.put('/api/settings', {
                    preferred_camera: selectedCamera.value,
                    preferred_microphone: selectedMicrophone.value,
                    preferred_speaker: selectedSpeaker.value,
                });
                closeSettings();
            } catch (error) {
                
            }
        };

        onMounted(async () => {
            // Fetch CSRF cookie for Sanctum authentication (required for production)
            try {
                await axios.get('/sanctum/csrf-cookie');
            } catch (csrfError) {
                console.warn('CSRF cookie fetch failed:', csrfError);
            }
            
            if (!props.roomId || props.roomId === 'null' || props.roomId === null) {
                error.value = 'Room ID is required';
                loading.value = false;
                return;
            }
            
            try {

                await getIceServers();
                await joinRoom();
                await fetchAllPresences();
                
                if (presences.value.length < 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await fetchAllPresences();
                }
                
                await loadRoom();
                await loadProfile();

                try {
                    await setupWebRTC();
                } catch (webrtcError) {
                    // Continue without WebRTC
                }

                await loadChatMessages();
            } catch (err) {
                if (!err.message || (!err.message.includes('SimplePeer') && !err.message.includes('WebRTC'))) {
                    error.value = err.message || 'Failed to initialize Virtual Office';
                }
                loading.value = false;
            }

            // Wait for Echo and listen for presence updates
            let retries = 0;
            while (!window.EchoReady && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (window.Echo && window.Echo.private) {
                try {
                    const channel = window.Echo.private(`room.${props.roomId}`);
                    if (channel && channel.listen) {
                        channel.listen('.user.joined', (data) => {

                            const existingIndex = presences.value.findIndex(p => p.user_id === data.presence.user_id);
                            if (existingIndex === -1) {
                                // New user joined
                                presences.value.push(data.presence);
                                if (data.presence.user_id !== currentUserId.value && !peers.value[data.presence.user_id]) {

                                    createPeer(data.presence.user_id, true);
                                }
                            } else {
                                // User already exists, update their presence
                                presences.value[existingIndex] = data.presence;
                            }
                        });
                        channel.listen('.user.left', (data) => {

                            presences.value = presences.value.filter(p => p.user_id !== data.presence?.user_id && p.user_id !== data.user_id);
                            if (peers.value[data.presence?.user_id || data.user_id]) {
                                const userId = data.presence?.user_id || data.user_id;
                                peers.value[userId].destroy();
                                delete peers.value[userId];
                                delete videoStreams.value[userId];
                                delete screenStreams.value[userId];
                            }
                        });
                        channel.listen('.presence.updated', (data) => {

                            const index = presences.value.findIndex(p => p.user_id === data.presence.user_id);
                            if (index !== -1) {
                                presences.value[index] = data.presence;
                                // Update proximity audio when presence position changes
                                if (data.presence.position_x !== undefined || data.presence.position_y !== undefined) {
                                    updateProximityAudio();
                                }
                            } else {
                                // Presence not found, add it
                                presences.value.push(data.presence);
                            }
                        });
                        channel.listen('.message.sent', (data) => {
                            chatMessages.value.push(data.message);
                            scrollChatToBottom();
                        });

                    }
                } catch (error) {
                    
                }
            } else {

            }

            // Update presence periodically
            presenceUpdateInterval = setInterval(() => {
                updatePresence({ last_seen_at: new Date().toISOString() });
                updateProximityAudio(); // Update audio volumes based on proximity
            }, 30000); // Update every 30 seconds to prevent rate limiting

            // Add mouse wheel zoom listener
            if (canvasWrapperRef.value) {
                // Mouse wheel zoom is handled by @wheel directive in template
            }
            
        });

        // Cleanup function to leave room and clean up resources
        const cleanup = async () => {
            try {
                // Stop all media tracks
                if (localStream.value) {
                    localStream.value.getTracks().forEach(track => track.stop());
                    localStream.value = null;
                }
                
                if (screenStream.value) {
                    screenStream.value.getTracks().forEach(track => track.stop());
                    screenStream.value = null;
                }
                
                // Clean up peer connections
                Object.values(peers.value).forEach(peer => {
                    if (peer && peer.destroy) {
                        peer.destroy();
                    }
                });
                peers.value = {};
                
                // Clear intervals
                if (presenceUpdateInterval) {
                    clearInterval(presenceUpdateInterval);
                    presenceUpdateInterval = null;
                }
                
                // Leave room (use sendBeacon for reliability on page unload)
                if (props.roomId && currentUserId.value) {
                    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.content || '';
                    
                    // Try using sendBeacon for better reliability during page unload
                    // sendBeacon only works with FormData or Blob, not JSON
                    if (navigator.sendBeacon) {
                        const formData = new FormData();
                        formData.append('_token', csrfToken);
                        navigator.sendBeacon(
                            `/api/virtual-office/rooms/${props.roomId}/leave`,
                            formData
                        );
                    } else {
                        // Fallback to fetch with keepalive
                        fetch(`/api/virtual-office/rooms/${props.roomId}/leave`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            credentials: 'include',
                            body: JSON.stringify({}),
                            keepalive: true
                        }).catch(() => {
                            // Silently fail - page is unloading
                        });
                    }
                }
            } catch (error) {
                // Silently fail during cleanup
            }
        };
        
        // Handle browser close/tab close
        const handleBeforeUnload = (event) => {
            cleanup();
        };
        
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is being hidden (tab switch or minimize)
                // Don't leave room, just pause updates
            }
        };
        
        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload);
        window.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Watch for video stream changes to update panel
        watch(() => videoEnabled.value, () => {
            if (videoEnabled.value && localStream.value) {
                nextTick(() => {
                    const localKey = `${currentUserId.value}-local`;
                    const el = videoPanelRefs.value[localKey];
                    if (el) {
                        updateVideoPanelStream(el, currentUserId.value, 'local');
                    }
                });
            }
            // Show panel when camera is turned on
            if (videoEnabled.value) {
                showVideoPanel.value = true;
            }
        }, { immediate: true });

        // Watch for local stream changes
        watch(() => localStream.value, (newStream) => {
            if (videoEnabled.value && newStream) {
                nextTick(() => {
                    const localKey = `${currentUserId.value}-local`;
                    const el = videoPanelRefs.value[localKey];
                    if (el) {
                        updateVideoPanelStream(el, currentUserId.value, 'local');
                    }
                });
            }
        }, { immediate: true });

        // Watch for remote video streams
        watch(() => videoStreams.value, () => {
            nextTick(() => {
                Object.keys(videoStreams.value).forEach(userId => {
                    if (userId !== currentUserId.value) {
                        const remoteKey = `${userId}-remote`;
                        const el = videoPanelRefs.value[remoteKey];
                        if (el && videoStreams.value[userId]) {
                            updateVideoPanelStream(el, userId, 'remote');
                        }
                    }
                });
            });
        }, { deep: true, immediate: true });

        onUnmounted(() => {
            // Remove event listeners
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleBeforeUnload);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            
            // Cleanup
            cleanup();
            if (presenceUpdateInterval) {
                clearInterval(presenceUpdateInterval);
            }
            if (localStream.value) {
                localStream.value.getTracks().forEach(track => track.stop());
            }
            if (screenStream.value) {
                screenStream.value.getTracks().forEach(track => track.stop());
            }
            Object.values(peers.value).forEach(peer => peer.destroy());
            
            // Remove mouse wheel listener
            if (canvasWrapperRef.value) {
                canvasWrapperRef.value.removeEventListener('wheel', handleWheel);
            }
            
            // Remove mouse event listeners
            document.removeEventListener('mousemove', handleMouseMove);
        });

        return {
            room,
            presences,
            currentUserId,
            audioEnabled,
            videoEnabled,
            canvasRef,
            canvasWrapperRef,
            showSettings,
            showProfile,
            zoomLevel,
            draggingUserId,
            selectedCamera,
            selectedMicrophone,
            selectedSpeaker,
            cameras,
            microphones,
            speakers,
            videoStreams,
            screenStreams,
            videoRefs,
            screenRefs,
            isScreenSharing,
            profileName,
            profileAvatarUrl,
            profilePosition,
            profileDepartment,
            profileAvatarPreview,
            profileAvatarFile,
            avatarFileInput,
            handleAvatarFileSelect,
            removeAvatar,
            setVideoRef,
            setScreenRef,
            toggleScreenShare,
            getInitials,
            getImageUrl,
            toggleProximityAudio,
            proximityAudioEnabled,
            toggleVideo,
            hasActiveCameras,
            showVideoPanel,
            closeVideoPanel,
            toggleVideoPanel,
            toggleRecording,
            isRecording,
            setVideoPanelRef,
            activeVideoUsers,
            videoPanelPosition,
            startDragVideoPanel,
            handleVideoLoaded,
            handleCanvasClick,
            zoomIn,
            zoomOut,
            resetZoom,
            handleWheel,
            handlePanStart,
            handlePanMove,
            handlePanEnd,
            handleMouseDown,
            handleMouseMove,
            handleMouseUp,
            panX,
            panY,
            leaveRoom,
            openSettings,
            closeSettings,
            saveSettings,
            openProfile,
            closeProfile,
            saveProfile,
            loadProfile,
            toggleChat,
            sendChatMessage,
            loadChatMessages,
            triggerImageUpload,
            triggerFileUpload,
            handleImageUpload,
            handleFileUpload,
            formatTime,
            openImageModal,
            scrollChatToBottom,
            handleImageError,
            openBackgroundSettings,
            closeBackgroundSettings,
            showBackgroundSettings,
            backgroundImageUrl,
            backgroundImagePreview,
            backgroundImageFile,
            backgroundImageInput,
            handleBackgroundImageSelect,
            saveBackground,
            removeBackground,
            calculateDistance,
            updateProximityAudio,
            openInviteModal,
            closeInviteModal,
            showInviteModal,
            inviteEmail,
            inviteLink,
            sendInvite,
            copyInviteLink,
            loading,
            error,
            roomId: props.roomId,
        };
    },
};
</script>

<style scoped>
.virtual-office-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    color: #fff;
}

.office-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.office-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #2a2a2a;
    border-bottom: 1px solid #3a3a3a;
}

.office-header h1 {
    margin: 0;
    font-size: 1.5rem;
}

.header-controls {
    display: flex;
    gap: 0.5rem;
}

.control-btn {
    padding: 0.5rem 1rem;
    background: #3a3a3a;
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
}

.control-btn:hover {
    background: #4a4a4a;
}

.control-btn.active {
    background: #4a90e2;
}

.control-btn.danger {
    background: #e24a4a;
}

.control-btn.danger:hover {
    background: #c43a3a;
}

.office-canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background: #1a1a1a;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
}

.office-canvas-wrapper:active {
    cursor: grabbing;
}

.office-canvas-wrapper.panning {
    cursor: grabbing;
}

.office-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 4000px;
    height: 3000px;
    background: transparent;
    cursor: grab;
    transition: transform 0.1s ease-out;
    will-change: transform;
}

.office-canvas:active {
    cursor: grabbing;
}

.workspace-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.user-avatar {
    position: absolute !important;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    cursor: move;
    transition: transform 0.2s, filter 0.2s;
    z-index: 5 !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    min-width: 80px;
    min-height: 80px;
}

.user-avatar:hover {
    transform: scale(1.15);
    z-index: 20;
}

.user-avatar.current-user {
    z-index: 15;
    cursor: grab;
}

.user-avatar.current-user:active {
    cursor: grabbing;
}

.user-controls {
    position: absolute;
    bottom: -45px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.95);
    padding: 0.5rem;
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    z-index: 30;
    opacity: 0;
    transition: opacity 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.user-avatar:hover .user-controls {
    opacity: 1;
}

.user-control-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 0.5rem;
    background: #3a3a3a;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.user-control-btn:hover {
    background: #4a4a4a;
    transform: scale(1.1);
}

.user-control-btn.active {
    background: #4a90e2;
    border-color: #fff;
}

.user-control-btn.speaker-btn-normal {
    font-size: 1.2rem;
    width: 38px;
    height: 38px;
    background: rgba(42, 42, 42, 0.95);
    border: 2px solid rgba(74, 144, 226, 0.5);
    position: relative;
}

.user-control-btn.speaker-btn-normal:hover {
    background: rgba(74, 144, 226, 0.95);
    border-color: rgba(74, 144, 226, 1);
    transform: scale(1.1);
}

.user-control-btn.speaker-btn-normal.active {
    background: rgba(74, 144, 226, 1);
    border-color: rgba(74, 144, 226, 1);
    box-shadow: 0 0 12px rgba(74, 144, 226, 0.6);
}

.user-control-btn.speaker-btn-normal .icon-off {
    opacity: 0.5;
    position: relative;
    display: inline-block;
}

.user-control-btn.speaker-btn-normal .icon-off::after {
    content: '✕';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #e24a4a;
    font-size: 1.2rem;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
    z-index: 1;
}

/* Video Panel Styles */
.video-panel {
    position: fixed;
    width: 600px;
    min-height: 500px;
    height: auto;
    max-height: 90vh;
    background: rgba(26, 26, 26, 0.98);
    border: 2px solid rgba(74, 144, 226, 0.5);
    border-radius: 0.5rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
    user-select: none;
}

.video-panel:hover {
    border-color: rgba(74, 144, 226, 0.8);
}

.video-panel-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(74, 144, 226, 0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(42, 42, 42, 0.8);
    cursor: move;
    border-radius: 0.5rem 0.5rem 0 0;
    user-select: none;
}

.video-panel-header h3 {
    margin: 0;
    color: #fff;
    font-size: 1.2rem;
}

.video-panel-close-btn {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: all 0.2s;
}

.video-panel-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.video-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    cursor: default;
    min-height: 450px;
}

.video-panel-content.multi-user {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

@media (max-width: 900px) {
    .video-panel-content.multi-user {
        grid-template-columns: 1fr;
    }
}

.video-panel-item {
    background: rgba(42, 42, 42, 0.6);
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid rgba(74, 144, 226, 0.3);
    min-height: 420px;
    display: flex;
    flex-direction: column;
}

.video-panel-header-item {
    padding: 0.75rem;
    background: rgba(42, 42, 42, 0.8);
    border-bottom: 1px solid rgba(74, 144, 226, 0.2);
}

.video-panel-header-item h4 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
}

.video-panel-video {
    width: 100%;
    min-height: 400px;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: #000;
    display: block;
    border-radius: 0 0 0.5rem 0.5rem;
}

.video-panel-content.multi-user .video-panel-item {
    min-width: 0;
}

.video-panel-content.multi-user .video-panel-video {
    min-height: 300px;
    aspect-ratio: 4 / 3;
    object-fit: contain;
}

.video-panel-empty {
    padding: 2rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
}

.user-control-btn.video-btn {
    position: relative;
}

.user-control-btn.video-btn.off {
    opacity: 0.6;
}

.user-control-btn.video-btn .icon-off {
    position: relative;
    display: inline-block;
}

.user-control-btn.video-btn .cross-mark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #e24a4a;
    font-size: 1.2rem;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
    z-index: 1;
    pointer-events: none;
}

@keyframes pulse {
    0%, 100% {
        box-shadow: 0 0 16px rgba(74, 144, 226, 0.8);
    }
    50% {
        box-shadow: 0 0 24px rgba(74, 144, 226, 1);
    }
}

.user-control-btn:hover {
    background: #4a4a4a;
}

.user-control-btn.active {
    background: #4a90e2;
}

.user-screen {
    position: absolute;
    width: 300px;
    height: 200px;
    border-radius: 0.5rem;
    object-fit: contain;
    border: 3px solid #4caf50;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    background: #000;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
}


.user-avatar.dragging {
    opacity: 0.8;
    transform: scale(1.2);
    z-index: 25;
}

.avatar-circle {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4a90e2 0%, #3a80d2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.5rem;
    border: 4px solid #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    position: relative;
}

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
}

.avatar-initials {
    display: block;
    z-index: 1;
}

.avatar-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
    background: #000;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
}

.user-info {
    margin-top: 0.5rem;
    text-align: center;
    background: rgba(0, 0, 0, 0.85);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    min-width: 120px;
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.user-name {
    font-size: 0.875rem;
    font-weight: bold;
    white-space: nowrap;
    color: #fff;
}

.user-position {
    font-size: 0.75rem;
    color: #aaa;
    margin-top: 0.25rem;
    white-space: nowrap;
}

.user-department {
    font-size: 0.7rem;
    color: #888;
    margin-top: 0.15rem;
    white-space: nowrap;
}

.status-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.status-indicator .status-icon {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: block;
}

.status-indicator.online .status-icon {
    background: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.status-indicator.away .status-icon {
    background: #ff9800;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
}

.status-indicator.busy .status-icon {
    background: #f44336;
    box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
}

.status-indicator.offline .status-icon {
    background: #999;
}

.audio-muted-icon {
    position: absolute;
    bottom: -5px;
    left: -5px;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 50%;
    padding: 4px;
    font-size: 0.875rem;
    border: 2px solid #fff;
}

.video-off-icon {
    position: absolute;
    bottom: -5px;
    right: -5px;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 50%;
    padding: 4px;
    font-size: 0.875rem;
    border: 2px solid #fff;
}

.user-video {
    position: absolute;
    width: 200px;
    height: 150px;
    border-radius: 0.5rem;
    object-fit: cover;
    border: 2px solid #4a90e2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.settings-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.settings-content {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 0.5rem;
    min-width: 400px;
}

.settings-content h2 {
    margin-top: 0;
}

.settings-section {
    margin-bottom: 1rem;
}

.settings-section label {
    display: block;
    margin-bottom: 0.5rem;
}

.settings-section select,
.settings-section input {
    width: 100%;
    padding: 0.5rem;
    background: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 0.25rem;
    color: #fff;
}

.settings-input {
    font-size: 0.875rem;
}

.avatar-upload-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.avatar-preview {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #4a4a4a;
    background: #3a3a3a;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-preview.placeholder {
    color: #999;
    font-size: 0.875rem;
}

.avatar-url-section {
    margin-top: 0.5rem;
}

.file-input {
    display: none;
}

.background-preview {
    width: 100%;
    height: 200px;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 3px solid #4a4a4a;
    background: #3a3a3a;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
}

.background-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.background-preview.placeholder {
    color: #999;
    font-size: 0.875rem;
}

.settings-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
}

.btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #3a3a3a;
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    cursor: pointer;
    font-weight: bold;
}

.btn-secondary:hover {
    background: #4a4a4a;
}

.btn-primary {
    padding: 0.75rem 1.5rem;
    background: #4a90e2;
    border: none;
    border-radius: 0.5rem;
    color: #fff;
    cursor: pointer;
    font-weight: bold;
}

.btn-primary:hover {
    background: #3a80d2;
}

.loading-screen, .error-screen {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    color: #fff;
}

.loading-content, .error-content {
    text-align: center;
    padding: 2rem;
}

.loading-content h2, .error-content h2 {
    margin-bottom: 1rem;
}

.loading-content p, .error-content p {
    color: #999;
    margin-bottom: 2rem;
}

/* Background Modal Styles */
.background-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
    backdrop-filter: blur(4px);
}

@keyframes fadeIn {
    from { 
        opacity: 0; 
    }
    to { 
        opacity: 1; 
    }
}

.background-modal-content {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 1rem;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    animation: slideUp 0.3s ease;
    border: 1px solid #3a3a3a;
}

@keyframes slideUp {
    from {
        transform: translateY(30px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.background-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #3a3a3a;
    background: rgba(42, 42, 42, 0.5);
}

.background-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #fff;
    font-weight: 600;
}

.modal-close-btn {
    background: transparent;
    border: none;
    color: #999;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
    line-height: 1;
}

.modal-close-btn:hover {
    background: #3a3a3a;
    color: #fff;
    transform: rotate(90deg);
}

.background-modal-body {
    padding: 2rem;
}

.background-preview-container {
    margin-bottom: 2rem;
}

.preview-label {
    display: block;
    color: #ccc;
    font-weight: 600;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.background-preview-large {
    width: 100%;
    height: 300px;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 2px solid #4a4a4a;
    background: #1a1a1a;
    position: relative;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.background-preview-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.background-preview-large.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
}

.placeholder-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #666;
}

.placeholder-icon {
    font-size: 4rem;
    opacity: 0.5;
}

.preview-overlay {
    position: absolute;
    top: 1rem;
    right: 1rem;
}

.preview-badge {
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.background-upload-section,
.background-url-section {
    margin-bottom: 1.5rem;
}

.section-label {
    display: block;
    color: #ccc;
    font-weight: 600;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.upload-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.upload-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.upload-btn:active {
    transform: translateY(0);
}

.upload-hint,
.url-hint {
    color: #999;
    font-size: 0.75rem;
    margin-top: 0.5rem;
    margin-bottom: 0;
    font-style: italic;
}

.url-input {
    width: 100%;
    padding: 0.875rem 1rem;
    background: #1a1a1a;
    border: 2px solid #3a3a3a;
    border-radius: 0.5rem;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.3s;
    box-sizing: border-box;
}

.url-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    background: #222;
}

.file-input-hidden {
    display: none;
}

.background-actions {
    margin-top: 1rem;
}

.remove-btn {
    width: 100%;
    padding: 0.875rem;
    background: #e24a4a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.remove-btn:hover {
    background: #c43a3a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(226, 74, 74, 0.4);
}

.remove-btn:active {
    transform: translateY(0);
}

.background-modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid #3a3a3a;
    justify-content: flex-end;
    background: rgba(42, 42, 42, 0.3);
}

.cancel-btn {
    padding: 0.75rem 1.5rem;
    background: #3a3a3a;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.cancel-btn:hover {
    background: #4a4a4a;
    transform: translateY(-1px);
}

.save-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.save-btn:active {
    transform: translateY(0);
}

.btn-icon {
    font-size: 1rem;
    display: inline-block;
}
</style>

