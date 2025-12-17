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
        <div v-else class="office-content">
        <div class="office-header">
            <h1>{{ room?.name || 'Virtual Office' }}</h1>
            <div class="header-controls">
                <button @click="toggleChat" class="control-btn" :class="{ active: showChat }">
                    💬 Chat
                </button>
                <button @click="openBackgroundSettings" class="control-btn">🖼️ Background</button>
                <button @click="openProfile" class="control-btn">👤 Profile</button>
                <button @click="openSettings" class="control-btn">⚙️</button>
                <button @click="leaveRoom" class="control-btn danger">Leave</button>
            </div>
        </div>

        <div class="office-canvas-wrapper" ref="canvasWrapperRef" :style="{
            backgroundImage: room?.background_image ? `url('${getImageUrl(room.background_image)}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
        }">
            <div class="zoom-controls">
                <button @click="zoomIn" class="zoom-btn">+</button>
                <button @click="zoomOut" class="zoom-btn">−</button>
                <button @click="resetZoom" class="zoom-btn">⌂</button>
            </div>
            <div class="office-canvas" ref="canvasRef" :style="{ 
                transform: `scale(${zoomLevel})`, 
                transformOrigin: '0 0',
                backgroundImage: room?.background_image ? `url('${getImageUrl(room.background_image)}')` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
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
                        <!-- Show video when camera is ON -->
                        <div v-if="presence.video_enabled && videoStreams[presence.user_id]" class="video-overlay-inner">
                            <video
                                :ref="el => setVideoRef(el, presence.user_id)"
                                autoplay
                                playsinline
                                class="avatar-video"
                                @loadedmetadata="updateProximityAudio"
                            ></video>
                        </div>
                        <!-- Show avatar image when camera is OFF -->
                        <template v-else>
                            <img 
                                v-if="presence.user?.avatar_url || presence.avatar_url" 
                                :src="getImageUrl(presence.user?.avatar_url || presence.avatar_url)" 
                                :alt="presence.user?.name || 'User'"
                                @error="handleImageError"
                                class="avatar-img"
                            />
                            <span v-else class="avatar-initials">{{ getInitials(presence.user?.name || 'User') }}</span>
                        </template>
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
                            @click.stop="toggleAudio" 
                            :class="{ active: audioEnabled }" 
                            class="user-control-btn"
                            title="Toggle Audio"
                        >
                            🔊
                        </button>
                        <button 
                            @click.stop="toggleVideo" 
                            :class="{ active: videoEnabled }" 
                            class="user-control-btn"
                            title="Toggle Video"
                        >
                            📹
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
                            @click.stop="startVideoCall" 
                            class="user-control-btn"
                            title="Video Call"
                        >
                            📞
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

        <div v-if="showBackgroundSettings" class="settings-modal" @click.self="closeBackgroundSettings">
            <div class="settings-content">
                <h2>Background Settings</h2>
                <div class="settings-section">
                    <label>Background Image:</label>
                    <div class="avatar-upload-section">
                        <div v-if="backgroundImagePreview" class="background-preview">
                            <img :src="backgroundImagePreview" alt="Preview" />
                        </div>
                        <div v-else-if="backgroundImageUrl" class="background-preview">
                            <img :src="backgroundImageUrl" alt="Current" />
                        </div>
                        <div v-else class="background-preview placeholder">
                            <span>No Background</span>
                        </div>
                        <input 
                            type="file" 
                            ref="backgroundImageInput"
                            @change="handleBackgroundImageSelect" 
                            accept="image/*" 
                            class="file-input"
                            style="display: none;"
                        />
                        <button @click="$refs.backgroundImageInput.click()" class="btn-secondary" type="button">
                            {{ backgroundImagePreview ? 'Change Image' : 'Upload Image' }}
                        </button>
                        <button v-if="backgroundImageUrl || backgroundImagePreview" @click="backgroundImageUrl = ''; backgroundImagePreview = null; backgroundImageFile = null;" class="btn-secondary" type="button">
                            Remove
                        </button>
                        <div class="avatar-url-section" style="margin-top: 0.5rem;">
                            <label style="font-size: 0.875rem;">Or enter URL:</label>
                            <input type="text" v-model="backgroundImageUrl" class="settings-input" placeholder="https://..." />
                        </div>
                    </div>
                </div>
                <div class="settings-actions">
                    <button @click="saveBackground" class="btn-primary">Save Background</button>
                    <button @click="closeBackgroundSettings" class="btn-secondary">Cancel</button>
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
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
        const audioEnabled = ref(true);
        const videoEnabled = ref(true);
        const canvasRef = ref(null);
        const canvasWrapperRef = ref(null);
        const showSettings = ref(false);
        const showProfile = ref(false);
        const showChat = ref(false);
        const showBackgroundSettings = ref(false);
        const showInviteModal = ref(false);
        const showVideoCall = ref(false);
        const loading = ref(true);
        const error = ref(null);
        const zoomLevel = ref(1);
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
        const isScreenSharing = ref(false);
        const isDragging = ref(false);
        const dragStartPos = ref({ x: 0, y: 0 });
        const dragStartMouse = ref({ x: 0, y: 0 });

        let presenceUpdateInterval = null;
        let iceServers = [];

        const setVideoRef = (el, userId) => {
            if (el) {
                videoRefs.value[userId] = el;
                if (videoStreams.value[userId]) {
                    el.srcObject = videoStreams.value[userId];
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
                    await initializeMedia();
                    // Set local video stream for video call
                    if (localStream.value && localVideoRef.value) {
                        localVideoRef.value.srcObject = localStream.value;
                    }
                } catch (mediaError) {

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
                
                // Add stream to all existing peer connections
                Object.entries(peers.value).forEach(([userId, peer]) => {
                    if (peer && peer.addTrack) {
                        stream.getTracks().forEach(track => {
                            try {
                                peer.addTrack(track, stream);
                            } catch (err) {

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
        const calculateDistance = (presence1, presence2) => {
            const dx = presence1.position_x - presence2.position_x;
            const dy = presence1.position_y - presence2.position_y;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // Update audio volume based on proximity
        const updateProximityAudio = () => {
            const currentPresence = presences.value.find(p => p.user_id === currentUserId.value);
            if (!currentPresence) return;

            const maxDistance = 300; // Maximum distance to hear audio
            const minVolume = 0.1; // Minimum volume (10%)
            const maxVolume = 1.0; // Maximum volume (100%)

            presences.value.forEach(presence => {
                if (presence.user_id === currentUserId.value) return;
                if (!presence.audio_enabled) return;

                const peer = peers.value[presence.user_id];
                if (!peer || !peer._pc) return;

                const distance = calculateDistance(currentPresence, presence);
                const volume = distance > maxDistance 
                    ? 0 
                    : maxVolume - ((distance / maxDistance) * (maxVolume - minVolume));

                // Update audio volume for this peer's stream
                const audioElement = videoRefs.value[presence.user_id];
                if (audioElement) {
                    audioElement.volume = Math.max(0, Math.min(1, volume));
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

        const updatePresence = async (updates) => {
            try {
                await axios.put(`/api/virtual-office/rooms/${props.roomId}/presence`, updates);
            } catch (error) {
                
            }
        };

        const toggleAudio = async () => {
            audioEnabled.value = !audioEnabled.value;
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
                    
                    audioEnabled.value = false;
                }
            }
            await updatePresence({ audio_enabled: audioEnabled.value });
        };

        const toggleVideo = async () => {
            videoEnabled.value = !videoEnabled.value;
            
            if (localStream.value) {
                localStream.value.getVideoTracks().forEach(track => {
                    track.enabled = videoEnabled.value;
                });
                
                // Update all peer connections with the new video track state
                Object.values(peers.value).forEach(peer => {
                    if (peer && peer._pc) {
                        const senders = peer._pc.getSenders();
                        senders.forEach(sender => {
                            if (sender.track && sender.track.kind === 'video' && !sender.track.label.toLowerCase().includes('screen')) {
                                sender.track.enabled = videoEnabled.value;
                            }
                        });
                    }
                });
            } else if (videoEnabled.value) {
                // If stream doesn't exist and we're enabling video, get new stream
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: audioEnabled.value,
                    });
                    localStream.value = stream;
                    // Update all peer connections with new stream
                    Object.values(peers.value).forEach(peer => {
                        stream.getVideoTracks().forEach(track => {
                            peer.addTrack(track, stream);
                        });
                    });
                } catch (error) {
                    
                    videoEnabled.value = false;
                }
            }
            
            await updatePresence({ video_enabled: videoEnabled.value });
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
            zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2);
        };

        const zoomOut = () => {
            zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.5);
        };

        const resetZoom = () => {
            zoomLevel.value = 1;
        };

        const handleWheel = (event) => {
            // Prevent page scroll
            event.preventDefault();
            
            // Zoom in/out with mouse wheel
            const delta = event.deltaY;
            const zoomFactor = 0.1;
            
            if (delta < 0) {
                // Scroll up - zoom in
                zoomLevel.value = Math.min(zoomLevel.value + zoomFactor, 2);
            } else {
                // Scroll down - zoom out
                zoomLevel.value = Math.max(zoomLevel.value - zoomFactor, 0.5);
            }
        };

        const handleMouseDown = (event, presence) => {
            if (presence.user_id === currentUserId.value && event.button === 0) {
                event.preventDefault();
                event.stopPropagation();
                isDragging.value = true;
                draggingUserId.value = presence.user_id;
                
                const rect = canvasRef.value.getBoundingClientRect();
                dragStartPos.value = {
                    x: parseFloat(presence.position_x) || 0,
                    y: parseFloat(presence.position_y) || 0
                };
                dragStartMouse.value = {
                    x: (event.clientX - rect.left) / zoomLevel.value,
                    y: (event.clientY - rect.top) / zoomLevel.value
                };
                
                document.addEventListener('mousemove', handleMouseMove, { passive: false });
                document.addEventListener('mouseup', () => handleMouseUp(presence), { once: true });
            }
        };

        const handleMouseMove = (event) => {
            if (!isDragging.value || !canvasRef.value) return;
            
            event.preventDefault();
            
            const rect = canvasRef.value.getBoundingClientRect();
            const currentMouse = {
                x: (event.clientX - rect.left) / zoomLevel.value,
                y: (event.clientY - rect.top) / zoomLevel.value
            };
            
            const deltaX = currentMouse.x - dragStartMouse.value.x;
            const deltaY = currentMouse.y - dragStartMouse.value.y;
            
            // Allow free movement anywhere on canvas - use fixed canvas dimensions
            const canvasWidth = 2000; // Fixed canvas width
            const canvasHeight = 1500; // Fixed canvas height
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
            backgroundImageUrl.value = room.value?.background_image || '';
            showBackgroundSettings.value = true;
        };

        const closeBackgroundSettings = () => {
            showBackgroundSettings.value = false;
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

        const startVideoCall = () => {
            showVideoCall.value = true;
            // Video call will use existing WebRTC connections
        };

        const closeVideoCall = () => {
            showVideoCall.value = false;
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
                const formData = new FormData();
                
                if (backgroundImageFile.value) {
                    formData.append('background_image', backgroundImageFile.value);
                } else if (backgroundImageUrl.value) {
                    formData.append('background_image_url', backgroundImageUrl.value);
                }
                
                const response = await axios.post(`/api/virtual-office/rooms/${props.roomId}/background`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                
                room.value.background_image = response.data.background_image;
                backgroundImagePreview.value = null;
                backgroundImageFile.value = null;
                if (backgroundImageInput.value) {
                    backgroundImageInput.value.value = '';
                }
                
                await loadRoom();
                closeBackgroundSettings();
            } catch (error) {
                
                alert('Failed to save background. Please try again.');
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
            }, 1000); // Update more frequently for smooth audio

            // Add mouse wheel zoom listener
            if (canvasWrapperRef.value) {
                canvasWrapperRef.value.addEventListener('wheel', handleWheel, { passive: false });
            }
            
        });

        onUnmounted(() => {
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
            toggleAudio,
            toggleVideo,
            handleCanvasClick,
            zoomIn,
            zoomOut,
            resetZoom,
            handleWheel,
            handleMouseDown,
            handleMouseMove,
            handleMouseUp,
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
            calculateDistance,
            updateProximityAudio,
            startVideoCall,
            closeVideoCall,
            showVideoCall,
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
    overflow: auto;
    background: #1a1a1a;
    min-width: 100%;
    min-height: 100%;
}

.zoom-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(42, 42, 42, 0.9);
    padding: 0.5rem;
    border-radius: 0.5rem;
}

.zoom-btn {
    width: 40px;
    height: 40px;
    background: #3a3a3a;
    border: none;
    border-radius: 0.25rem;
    color: #fff;
    cursor: pointer;
    font-size: 1.5rem;
    font-weight: bold;
    transition: background 0.2s;
}

.zoom-btn:hover {
    background: #4a4a4a;
}

.office-canvas {
    position: relative;
    width: 2000px;
    height: 1500px;
    background: transparent;
    cursor: crosshair;
    transition: transform 0.3s ease;
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

.video-overlay-inner {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
}

.avatar-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
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
</style>

