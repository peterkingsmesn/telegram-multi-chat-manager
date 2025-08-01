// 애플리케이션 상태 관리
const appState = {
    apis: [],
    expertApis: [], // 전문가 섹션 API들
    activeFirepower: 1,
    activeExpert: null, // 현재 활성화된 전문가 인덱스 (하나만 선택 가능)
    rooms: {
        expert: [],
        firepower: {} // 1-30까지 각각 독립적으로 관리
    },
    currentRoom: null,
    templates: [], // 메시지 템플릿
    currentPhone: null, // 현재 연결된 전화번호
    currentUser: null, // 현재 로그인한 사용자 정보
    
    // 세션 레벨 중복 방지 시스템
    profitImageSession: {
        shuffledImagesByCapacity: {}, // 용량별로 셔플된 이미지 순서 저장
        usedImageIndices: {}, // 용량별로 사용된 이미지 인덱스 추적
        sessionStartTime: null // 세션 시작 시간
    },
    
    // 메시지 전송 속도 설정
    messageSpeed: {
        current: 800, // 현재 설정된 속도 (밀리초)
        default: 800  // 기본 속도
    },
    
    // 자동 동기화 설정
    autoSync: {
        enabled: false, // 자동 동기화 활성화/비활성화
        interval: 5 * 60 * 1000 // 5분 간격
    }
};

// DOM 요소들을 저장할 객체
let elements = {};

// 초기화
function init() {
    console.log('=== Initializing app ===');
    console.log('🔍 앱 초기화 시작 - appState.rooms:', appState.rooms);
    console.log('🔍 앱 초기화 시작 - appState.rooms.expert:', appState.rooms.expert);
    initializeElements();
    setupEventListeners();
    
    // 각 렌더링 단계에서 에러 체크
    try {
        renderApiGrid();
    } catch (e) {
        console.error('Error in renderApiGrid:', e);
    }
    
    try {
        renderFirepowerRooms(1);
    } catch (e) {
        console.error('Error in renderFirepowerRooms:', e);
    }
    
    try {
        renderExpertRooms();
    } catch (e) {
        console.error('Error in renderExpertRooms:', e);
    }
    
    try {
        loadSavedData();
    } catch (e) {
        console.error('Error in loadSavedData:', e);
    }
    
    try {
        loadTemplates();
        console.log('loadTemplates completed');
    } catch (e) {
        console.error('Error in loadTemplates:', e);
    }
    
    try {
        renderFirepowerAccountsList();
        console.log('renderFirepowerAccountsList completed');
    } catch (e) {
        console.error('Error in renderFirepowerAccountsList:', e);
    }
    
    // AGGRESSIVE 화력 계정 정리 시스템 비활성화 (전문가 계정 보호)
    console.log('🛡️ 전문가 계정 보호를 위해 AGGRESSIVE 정리 비활성화');
    
    // 🚫 자동 서버 동기화 비활성화 (그룹 상태 보존을 위해)
    console.log('🚫 자동 서버 동기화 비활성화 - 수동 새로고침만 사용');
    
    try {
        loadMessageSpeed();
        updateSpeedDisplay(); // 초기 로드 후 화면 업데이트
        console.log('loadMessageSpeed completed');
    } catch (e) {
        console.error('Error in loadMessageSpeed:', e);
    }
}

// DOM 요소 초기화
function initializeElements() {
    elements = {
        activeApiCount: document.getElementById('activeApiCount'),
        expertRooms: document.getElementById('expertRooms'),
        firepowerRooms: document.getElementById('firepowerRooms'),
        apiGrid: document.getElementById('apiGrid'),
        messagePanel: document.getElementById('messagePanel'),
        messageList: document.getElementById('messageList'),
        messageInput: document.getElementById('messageInput'),
        sendMessageBtn: document.getElementById('sendMessageBtn'),
        apiModal: document.getElementById('apiModal'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        apiBotNameInput: document.getElementById('apiBotNameInput'),
        addApiBtn: document.getElementById('addApiBtn'),
        saveApiBtn: document.getElementById('saveApiBtn'),
        cancelApiBtn: document.getElementById('cancelApiBtn'),
        closePanelBtn: document.getElementById('closePanelBtn'),
        // 전문가 섹션 요소들
        addExpertApiBtn: document.getElementById('addExpertApiBtn'),
        broadcastBtn: document.getElementById('broadcastBtn'),
        autoSetupBtn: document.getElementById('autoSetupBtn'),
        expertApiModal: document.getElementById('expertApiModal'),
        expertPhoneInput: document.getElementById('expertPhoneInput'),
        connectApiBtn: document.getElementById('connectApiBtn'),
        verificationSection: document.getElementById('verificationSection'),
        verificationCode: document.getElementById('verificationCode'),
        verifyCodeBtn: document.getElementById('verifyCodeBtn'),
        connectionStatus: document.getElementById('connectionStatus'),
        testConnectionBtn: document.getElementById('testConnectionBtn'),
        loadGroupsBtn: document.getElementById('loadGroupsBtn'),
        availableGroups: document.getElementById('availableGroups'),
        saveExpertApiBtn: document.getElementById('saveExpertApiBtn'),
        cancelExpertApiBtn: document.getElementById('cancelExpertApiBtn'),
        // 전체 전송 모달
        broadcastModal: document.getElementById('broadcastModal'),
        broadcastMessage: document.getElementById('broadcastMessage'),
        broadcastFile: document.getElementById('broadcastFile'),
        selectAllGroups: document.getElementById('selectAllGroups'),
        groupList: document.getElementById('groupList'),
        sendBroadcastBtn: document.getElementById('sendBroadcastBtn'),
        cancelBroadcastBtn: document.getElementById('cancelBroadcastBtn'),
        // 수익인증 모달
        profitModal: document.getElementById('profitModal'),
        profitImageInput: document.getElementById('profitImageInput'),
        profitMessage: document.getElementById('profitMessage'),
        sendProfitBtn: document.getElementById('sendProfitBtn'),
        cancelProfitBtn: document.getElementById('cancelProfitBtn'),
        // 화력 리스트
        firepowerAccountsList: document.getElementById('firepowerAccountsList'),
        refreshAllGroupsBtn: document.getElementById('refreshAllGroupsBtn'),
        // 사용자 API 등록 모달
        apiRegisterModal: document.getElementById('apiRegisterModal'),
        registerPhoneInput: document.getElementById('registerPhoneInput'),
        registerApiIdInput: document.getElementById('registerApiIdInput'),
        registerApiHashInput: document.getElementById('registerApiHashInput'),
        registerApiBtn: document.getElementById('registerApiBtn'),
        cancelRegisterBtn: document.getElementById('cancelRegisterBtn'),
        registerStatus: document.getElementById('registerStatus'),
        // API 관리 모달
        showApiManagerBtn: document.getElementById('showApiManagerBtn'),
        apiManagerModal: document.getElementById('apiManagerModal'),
        cancelApiManagerBtn: document.getElementById('cancelApiManagerBtn'),
        expertApiTab: document.getElementById('expertApiTab'),
        firepowerApiTab: document.getElementById('firepowerApiTab'),
        expertApiList: document.getElementById('expertApiList'),
        firepowerApiList: document.getElementById('firepowerApiList'),
        addExpertApiConfig: document.getElementById('addExpertApiConfig'),
        addFirepowerApiConfig: document.getElementById('addFirepowerApiConfig'),
        saveApiConfigBtn: document.getElementById('saveApiConfigBtn'),
        // API 편집 모달
        apiEditModal: document.getElementById('apiEditModal'),
        apiEditTitle: document.getElementById('apiEditTitle'),
        apiEditPhone: document.getElementById('apiEditPhone'),
        apiEditId: document.getElementById('apiEditId'),
        apiEditHash: document.getElementById('apiEditHash'),
        apiEditType: document.getElementById('apiEditType'),
        apiEditFirepowerNumber: document.getElementById('apiEditFirepowerNumber'),
        firepowerNumberGroup: document.getElementById('firepowerNumberGroup'),
        saveApiEditBtn: document.getElementById('saveApiEditBtn'),
        cancelApiEditBtn: document.getElementById('cancelApiEditBtn')
    };
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 화력 탭 클릭
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const firepower = parseInt(e.target.dataset.firepower);
            switchFirepower(firepower);
        });
    });

    // null 체크를 추가하여 각 요소별로 이벤트 리스너 설정
    if (elements.addApiBtn) {
        elements.addApiBtn.addEventListener('click', () => {
            elements.apiModal.classList.add('active');
        });
    }

    if (elements.saveApiBtn) {
        elements.saveApiBtn.addEventListener('click', saveApi);
    }
    
    if (elements.cancelApiBtn) {
        elements.cancelApiBtn.addEventListener('click', () => {
            elements.apiModal.classList.remove('active');
            clearApiModal();
        });
    }

    if (elements.sendMessageBtn) {
        elements.sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (elements.closePanelBtn) {
        elements.closePanelBtn.addEventListener('click', () => {
            elements.messagePanel.classList.remove('active');
        });
    }
    
    // 클립보드 이미지 붙여넣기 처리
    elements.messageTextarea = document.getElementById('messageTextarea');
    elements.attachedFiles = document.getElementById('attachedFiles');
    
    if (elements.messageTextarea) {
        elements.messageTextarea.addEventListener('paste', handlePaste);
        
        // 엔터키로 메시지 전송 (Shift+Enter는 줄바꿈)
        elements.messageTextarea.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // 기본 줄바꿈 방지
                sendMessage(); // 메시지 전송
            }
        });
    }

    // 전문가 섹션 이벤트
    if (elements.addExpertApiBtn) {
        elements.addExpertApiBtn.addEventListener('click', () => {
            elements.expertApiModal.classList.add('active');
        });
    }

    if (elements.saveExpertApiBtn) {
        elements.saveExpertApiBtn.addEventListener('click', () => {
            saveSelectedGroups();
        });
    }
    
    if (elements.cancelExpertApiBtn) {
        elements.cancelExpertApiBtn.addEventListener('click', () => {
            elements.expertApiModal.classList.remove('active');
            clearExpertApiModal();
        });
    }

    if (elements.broadcastBtn) {
        elements.broadcastBtn.addEventListener('click', () => {
            showBroadcastModal();
        });
    }

    if (elements.sendBroadcastBtn) {
        elements.sendBroadcastBtn.addEventListener('click', sendBroadcast);
    }
    
    if (elements.cancelBroadcastBtn) {
        elements.cancelBroadcastBtn.addEventListener('click', () => {
            elements.broadcastModal.classList.remove('active');
            clearBroadcastModal();
        });
    }

    if (elements.selectAllGroups) {
        elements.selectAllGroups.addEventListener('change', (e) => {
            const groupCheckboxes = elements.groupList.querySelectorAll('input[name="groups"]');
            const accountToggleCheckboxes = elements.groupList.querySelectorAll('.account-toggle');
            
            groupCheckboxes.forEach(cb => cb.checked = e.target.checked);
            accountToggleCheckboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }
    
    // 템플릿 이벤트는 renderTemplates에서 처리
    
    // 텔레그램 User API 연결 이벤트
    if (elements.connectApiBtn) {
        elements.connectApiBtn.addEventListener('click', connectTelegramAPI);
    }
    
    if (elements.verifyCodeBtn) {
        elements.verifyCodeBtn.addEventListener('click', verifyTelegramCode);
    }
    
    // 전문가 앱 인증 버튼
    const expertAppAuthBtn = document.getElementById('expertAppAuthBtn');
    if (expertAppAuthBtn) {
        expertAppAuthBtn.addEventListener('click', requestExpertAppAuth);
    }
    
    if (elements.testConnectionBtn) {
        elements.testConnectionBtn.addEventListener('click', testTelegramConnection);
    }
    
    if (elements.loadGroupsBtn) {
        elements.loadGroupsBtn.addEventListener('click', loadTelegramGroups);
    }
    
    // 자동 등록 버튼
    if (elements.autoSetupBtn) {
        elements.autoSetupBtn.addEventListener('click', startAutoSetup);
    }
    
    // 수익인증 버튼들
    document.querySelectorAll('.clipboard-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const capacity = e.currentTarget.dataset.capacity;
            const btnNumber = e.currentTarget.querySelector('.btn-number').textContent;
            showProfitVerificationModal(btnNumber, capacity);
        });
    });
    
    // 모든 그룹 새로고침 버튼
    if (elements.refreshAllGroupsBtn) {
        elements.refreshAllGroupsBtn.addEventListener('click', async () => {
            elements.refreshAllGroupsBtn.disabled = true;
            elements.refreshAllGroupsBtn.textContent = '⏳';
            
            try {
                await refreshAllAccountGroups();
                elements.refreshAllGroupsBtn.textContent = '✅';
                setTimeout(() => {
                    elements.refreshAllGroupsBtn.textContent = '🔄';
                    elements.refreshAllGroupsBtn.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Error refreshing groups:', error);
                elements.refreshAllGroupsBtn.textContent = '❌';
                setTimeout(() => {
                    elements.refreshAllGroupsBtn.textContent = '🔄';
                    elements.refreshAllGroupsBtn.disabled = false;
                }, 2000);
            }
        });
    }
    
    // 사용자 API 등록 모달 이벤트
    if (elements.registerApiBtn) {
        elements.registerApiBtn.addEventListener('click', registerUserAPI);
    }
    
    if (elements.cancelRegisterBtn) {
        elements.cancelRegisterBtn.addEventListener('click', () => {
            elements.apiRegisterModal.classList.remove('active');
            clearRegistrationModal();
        });
    }
    
    // API 등록 모달 열기 버튼 추가 (필요시)
    const showRegisterModalBtn = document.getElementById('showRegisterModalBtn');
    if (showRegisterModalBtn) {
        showRegisterModalBtn.addEventListener('click', () => {
            elements.apiRegisterModal.classList.add('active');
        });
    }
    
    // 중복 정리 버튼
    const cleanupDuplicatesBtn = document.getElementById('cleanupDuplicatesBtn');
    if (cleanupDuplicatesBtn) {
        cleanupDuplicatesBtn.addEventListener('click', () => {
            if (confirm('화력과 중복된 전문가 계정을 정리하시겠습니까?')) {
                cleanupDuplicateAccounts();
            }
        });
    }
    
    // 계정 디버그 버튼
    const debugAccountsBtn = document.getElementById('debugAccountsBtn');
    if (debugAccountsBtn) {
        debugAccountsBtn.addEventListener('click', () => {
            showAccountDebugInfo();
        });
    }
    
    // 계정 재구성 버튼
    const resetAccountsBtn = document.getElementById('resetAccountsBtn');
    if (resetAccountsBtn) {
        resetAccountsBtn.addEventListener('click', () => {
            if (confirm('모든 계정 정보를 재구성하시겠습니까? 현재 설정이 초기화될 수 있습니다.')) {
                resetAndRebuildAccounts();
            }
        });
    }
    
    // 이미지 세션 초기화 버튼
    const resetImageSessionBtn = document.getElementById('resetImageSessionBtn');
    if (resetImageSessionBtn) {
        resetImageSessionBtn.addEventListener('click', () => {
            const success = resetAllImageSessions();
            if (success) {
                // 성공 메시지 표시
                resetImageSessionBtn.textContent = '🎲 모든 이미지 세션이 초기화되었습니다';
                resetImageSessionBtn.style.background = '#28a745';
                resetImageSessionBtn.style.color = 'white';
                
                // 3초 후 원래 상태로 복구
                setTimeout(() => {
                    resetImageSessionBtn.textContent = '🎲 이미지 세션 초기화';
                    resetImageSessionBtn.style.background = '';
                    resetImageSessionBtn.style.color = '';
                }, 3000);
            } else {
                // 실패 메시지 표시
                resetImageSessionBtn.textContent = '❌ 초기화 실패';
                resetImageSessionBtn.style.background = '#dc3545';
                resetImageSessionBtn.style.color = 'white';
                
                // 3초 후 원래 상태로 복구
                setTimeout(() => {
                    resetImageSessionBtn.textContent = '🎲 이미지 세션 초기화';
                    resetImageSessionBtn.style.background = '';
                    resetImageSessionBtn.style.color = '';
                }, 3000);
            }
        });
    }
    
    // 중요 계정 재연결 버튼
    const reconnectAccountsBtn = document.getElementById('reconnectAccountsBtn');
    if (reconnectAccountsBtn) {
        reconnectAccountsBtn.addEventListener('click', async () => {
            reconnectAccountsBtn.disabled = true;
            reconnectAccountsBtn.textContent = '재연결 중...';
            
            try {
                const success = await reconnectMissingAccounts();
                if (success) {
                    console.log('✅ 중요 계정 재연결이 완료되었습니다.');
                    // showSuccessMessage('중요 계정 재연결이 완료되었습니다.');
                } else {
                    console.error('❌ 재연결 중 일부 오류가 발생했습니다.');
                    // showErrorMessage('재연결 중 일부 오류가 발생했습니다.');
                }
            } catch (error) {
                console.error('Reconnect error:', error);
                showErrorMessage('재연결 중 오류가 발생했습니다.');
            } finally {
                reconnectAccountsBtn.disabled = false;
                reconnectAccountsBtn.textContent = '중요 계정 재연결';
            }
        });
    }
    
    // API 관리 이벤트 리스너
    if (elements.showApiManagerBtn) {
        elements.showApiManagerBtn.addEventListener('click', showApiManager);
    }
    
    if (elements.cancelApiManagerBtn) {
        elements.cancelApiManagerBtn.addEventListener('click', closeApiManager);
    }
    
    if (elements.addExpertApiConfig) {
        elements.addExpertApiConfig.addEventListener('click', () => addApiConfig('expert'));
    }
    
    if (elements.addFirepowerApiConfig) {
        elements.addFirepowerApiConfig.addEventListener('click', () => addApiConfig('firepower'));
    }
    
    if (elements.saveApiConfigBtn) {
        elements.saveApiConfigBtn.addEventListener('click', saveApiConfigs);
    }
    
    if (elements.cancelApiEditBtn) {
        elements.cancelApiEditBtn.addEventListener('click', closeApiEditModal);
    }
    
    if (elements.saveApiEditBtn) {
        elements.saveApiEditBtn.addEventListener('click', saveApiEdit);
    }
    
    if (elements.apiEditType) {
        elements.apiEditType.addEventListener('change', toggleFirepowerNumberField);
    }
    
    // API 관리 탭 이벤트
    document.querySelectorAll('.api-manager-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchApiTab(tabName);
        });
    });
    
    // 메시지 속도 설정 이벤트
    const speedSettingsBtn = document.getElementById('speedSettingsBtn');
    if (speedSettingsBtn) {
        speedSettingsBtn.addEventListener('click', showSpeedSettingsModal);
    }
    
    // 속도 프리셋 버튼들
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const speed = parseInt(e.target.dataset.speed);
            if (speed) {
                // 모든 프리셋 버튼에서 active 클래스 제거
                document.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
                // 현재 버튼에 active 클래스 추가
                e.target.classList.add('active');
                // 커스텀 입력 필드에 값 설정
                const customSpeedInput = document.getElementById('customSpeedInput');
                if (customSpeedInput) {
                    customSpeedInput.value = speed;
                    updateSpeedPreview();
                }
            }
        });
    });
    
    // 커스텀 속도 입력
    const customSpeedInput = document.getElementById('customSpeedInput');
    if (customSpeedInput) {
        customSpeedInput.addEventListener('input', updateSpeedPreview);
    }
    
    // 속도 설정 적용 버튼
    const applySpeedBtn = document.getElementById('applySpeedBtn');
    if (applySpeedBtn) {
        applySpeedBtn.addEventListener('click', () => {
            const customSpeedInput = document.getElementById('customSpeedInput');
            if (customSpeedInput) {
                const newSpeed = parseInt(customSpeedInput.value);
                if (newSpeed && newSpeed >= 100 && newSpeed <= 5000) {
                    appState.messageSpeed.current = newSpeed;
                    saveToLocalStorage();
                    
                    // 모달 닫기 - 올바른 함수 사용
                    hideSpeedSettingsModal();
                    
                    // 성공 메시지 표시 (선택사항)
                    console.log(`메시지 속도가 ${newSpeed}ms로 설정되었습니다.`);
                }
            }
        });
    }
    
    // 속도 설정 취소 버튼
    const cancelSpeedBtn = document.getElementById('cancelSpeedBtn');
    if (cancelSpeedBtn) {
        cancelSpeedBtn.addEventListener('click', () => {
            hideSpeedSettingsModal();
        });
    }
}

// 클립보드 붙여넣기 처리 함수
function handlePaste(event) {
    const items = event.clipboardData.items;
    
    // 클립보드에 이미지가 있는지 확인
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // 이미지 파일인 경우
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault(); // 기본 붙여넣기 방지
            
            const file = item.getAsFile();
            if (file) {
                // 첨부된 파일 표시 영역에 이미지 추가
                displayAttachedImage(file);
                console.log('📎 이미지가 첨부되었습니다:', file.name, file.size, 'bytes');
            }
            return; // 이미지 처리 후 함수 종료
        }
    }
    
    // 텍스트만 있는 경우 기본 붙여넣기 허용
    console.log('📝 텍스트 내용이 붙여넣기되었습니다.');
}

// 첨부된 이미지를 표시하는 함수
function displayAttachedImage(file) {
    if (!elements.attachedFiles) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imagePreview = document.createElement('div');
        imagePreview.className = 'attached-image-preview';
        imagePreview.style.cssText = `
            display: inline-block;
            margin: 5px;
            position: relative;
            border: 2px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        `;
        
        imagePreview.innerHTML = `
            <img src="${e.target.result}" style="width: 100px; height: 100px; object-fit: cover;">
            <button onclick="removeAttachedImage(this)" style="
                position: absolute;
                top: 2px;
                right: 2px;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                cursor: pointer;
                font-size: 12px;
            ">×</button>
            <div style="font-size: 10px; padding: 2px; background: rgba(0,0,0,0.7); color: white; text-align: center;">
                ${file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name}
            </div>
        `;
        
        elements.attachedFiles.appendChild(imagePreview);
    };
    reader.readAsDataURL(file);
}

// 첨부된 이미지 제거 함수
function removeAttachedImage(button) {
    const imagePreview = button.parentElement;
    imagePreview.remove();
}

// 모든 이미지 세션 초기화 함수
function resetAllImageSessions() {
    try {
        // 세션 레벨 중복 방지 시스템 초기화
        appState.profitImageSession = {
            shuffledImagesByCapacity: {}, // 용량별로 셔플된 이미지 순서 저장
            usedImageIndices: {}, // 용량별로 사용된 이미지 인덱스 추적
            sessionStartTime: Date.now() // 세션 시작 시간을 현재 시간으로 설정
        };
        
        console.log('✅ 모든 이미지 세션이 초기화되었습니다.');
        return true;
    } catch (error) {
        console.error('❌ 이미지 세션 초기화 중 오류 발생:', error);
        return false;
    }
}

// API 그리드 렌더링
function renderApiGrid() {
    if (!elements.apiGrid) {
        console.log('apiGrid element not found');
        return;
    }
    elements.apiGrid.innerHTML = '';
    
    for (let i = 0; i < 30; i++) {
        const slot = document.createElement('div');
        slot.className = 'api-slot';
        slot.dataset.index = i;
        
        if (appState.apis[i]) {
            slot.classList.add('active');
            slot.innerHTML = `
                <h4>API ${i + 1}</h4>
                <p>${appState.apis[i].botName}</p>
                <p style="color: #4caf50;">활성</p>
            `;
        } else {
            slot.innerHTML = `
                <h4>API ${i + 1}</h4>
                <p>비어있음</p>
            `;
        }
        
        slot.addEventListener('click', () => handleApiSlotClick(i));
        elements.apiGrid.appendChild(slot);
    }
    
    updateApiCount();
}

// API 슬롯 클릭 처리
function handleApiSlotClick(index) {
    if (appState.apis[index]) {
        // API 상세 정보 표시 또는 편집
        const api = appState.apis[index];
        const confirmDelete = confirm(`${api.botName} API를 삭제하시겠습니까?`);
        if (confirmDelete) {
            appState.apis[index] = null;
            renderApiGrid();
            saveToLocalStorage();
        }
    } else {
        // 새 API 추가
        elements.apiModal.classList.add('active');
        elements.apiModal.dataset.targetIndex = index;
    }
}

// API 저장
function saveApi() {
    const apiKey = elements.apiKeyInput.value.trim();
    const botName = elements.apiBotNameInput.value.trim();
    
    if (!apiKey || !botName) {
        alert('API 키와 봇 이름을 모두 입력해주세요.');
        return;
    }
    
    const targetIndex = elements.apiModal.dataset.targetIndex;
    const index = targetIndex !== undefined ? parseInt(targetIndex) : findEmptyApiSlot();
    
    if (index === -1) {
        alert('사용 가능한 API 슬롯이 없습니다.');
        return;
    }
    
    appState.apis[index] = {
        apiKey,
        botName,
        active: true,
        assignedRooms: []
    };
    
    renderApiGrid();
    elements.apiModal.classList.remove('active');
    clearApiModal();
    saveToLocalStorage();
}

// 빈 API 슬롯 찾기
function findEmptyApiSlot() {
    for (let i = 0; i < 30; i++) {
        if (!appState.apis[i]) return i;
    }
    return -1;
}

// API 모달 초기화
function clearApiModal() {
    elements.apiKeyInput.value = '';
    elements.apiBotNameInput.value = '';
    delete elements.apiModal.dataset.targetIndex;
}

// API 카운트 업데이트
function updateApiCount() {
    const activeCount = appState.apis.filter(api => api && api.active).length;
    elements.activeApiCount.textContent = activeCount;
}

// 화력 전환
function switchFirepower(firepower) {
    appState.activeFirepower = firepower;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-firepower="${firepower}"]`).classList.add('active');
    
    // 해당 화력의 방 렌더링
    renderFirepowerRooms(firepower);
    
    // LocalStorage에 현재 화력 저장
    saveToLocalStorage();
}

// 화력별 방 렌더링
function renderFirepowerRooms(firepower) {
    // 화력별 방 초기화 (없으면)
    if (!appState.rooms.firepower[firepower]) {
        appState.rooms.firepower[firepower] = [{
            id: `firepower-${firepower}-main`,
            name: `화력 ${firepower}`,
            phone: null,
            user: null,
            selectedGroups: [], // 각 그룹은 {id, name, active} 형태
            active: false
        }];
    }
    
    const firepowerData = appState.rooms.firepower[firepower];
    if (!firepowerData || !firepowerData[0]) return;
    const room = firepowerData[0];
    
    // 현재 화력 번호 업데이트
    const currentFirepowerSpan = document.getElementById('currentFirepower');
    if (currentFirepowerSpan) {
        currentFirepowerSpan.textContent = firepower;
    }
    
    // API 등록 버튼과 정보 표시 토글
    const addApiBtn = document.getElementById('addFirepowerApiBtn');
    const apiInfo = document.getElementById('firepowerApiInfo');
    
    if (room.phone && room.user) {
        // API가 등록된 경우
        if (addApiBtn) addApiBtn.style.display = 'none';
        if (apiInfo) apiInfo.style.display = 'block';
        
        // 계정 이름 표시 (대화명+전화번호)
        const accountNameSpan = document.getElementById('firepowerAccountName');
        if (accountNameSpan) {
            const displayName = room.user.first_name || '사용자';
            accountNameSpan.textContent = `${displayName} (${room.phone})`;
        }
        
        // 선택된 그룹 수 업데이트
        const groupCountSpan = document.getElementById('firepowerGroupCount');
        if (groupCountSpan) {
            groupCountSpan.textContent = room.selectedGroups ? room.selectedGroups.length : 0;
        }
    } else {
        // API가 등록되지 않은 경우
        if (addApiBtn) addApiBtn.style.display = 'block';
        if (apiInfo) apiInfo.style.display = 'none';
    }
    
    // 선택된 그룹 목록 표시
    const firepowerGroups = document.getElementById('firepowerGroups');
    if (firepowerGroups) {
        firepowerGroups.innerHTML = '';
        if (room.selectedGroups && room.selectedGroups.length > 0) {
            // 그룹 데이터 구조 확인을 위한 로그
            console.log(`🔍 화력 ${firepower} 그룹 데이터 구조:`, room.selectedGroups);
            
            room.selectedGroups.forEach((group, index) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'selected-group-item';
                const isActive = group.active !== false; // 기본값은 true
                
                // 그룹명 결정 로직 (안전한 fallback 포함)
                let groupName = group.name || group.title || '그룹명 없음';
                
                // 개별 그룹의 데이터 구조 확인
                if (!group.name && !group.title) {
                    console.warn(`⚠️ 그룹 ${index}의 name/title이 없습니다:`, group);
                }
                
                groupDiv.innerHTML = `
                    <input type="checkbox" id="group-${firepower}-${index}" ${isActive ? 'checked' : ''} onchange="toggleGroupInFirepower(${firepower}, ${index})">
                    <label for="group-${firepower}-${index}">${groupName}</label>
                `;
                firepowerGroups.appendChild(groupDiv);
            });
        } else if (room.phone) {
            firepowerGroups.innerHTML = '<p style="text-align: center; color: #999; font-size: 14px;">선택된 그룹이 없습니다</p>';
        }
    }
    
    // 버튼 이벤트 업데이트
    if (addApiBtn) {
        addApiBtn.onclick = () => showFirepowerApiModal(firepower);
    }
    
    const refreshGroupsBtn = document.getElementById('refreshGroupsBtn');
    if (refreshGroupsBtn) {
        refreshGroupsBtn.onclick = () => loadGroupsForFirepower(firepower);
    }
    
    const changeApiBtn = document.getElementById('changeApiBtn');
    if (changeApiBtn) {
        changeApiBtn.onclick = () => changeFirepowerApi(firepower);
    }
    
    const deleteApiBtn = document.getElementById('deleteApiBtn');
    if (deleteApiBtn) {
        deleteApiBtn.onclick = () => deleteFirepowerApi(firepower);
    }
    
    // 선택된 그룹 수 업데이트
    updateSelectedGroupCount();
}

// 방 카드 생성
function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    
    // User API 연결 상태 확인
    const isConnected = appState.currentPhone && room.active;
    const statusClass = isConnected ? 'active' : 'inactive';
    const statusText = isConnected ? '활성' : '비활성';
    
    card.innerHTML = `
        <div class="room-header">
            <h3>${room.name}</h3>
            <span class="room-status ${statusClass}">${statusText}</span>
        </div>
        <div class="room-info">
            <p>선택된 그룹: <span class="group-count">${room.selectedGroups ? room.selectedGroups.length : 0}</span>개</p>
        </div>
        <div class="room-actions">
            <button class="btn-select-group" onclick="selectGroupsForFirepower(${appState.activeFirepower})">그룹 선택</button>
        </div>
    `;
    
    return card;
}

// 방 연결
function connectRoom(roomId) {
    appState.currentRoom = roomId;
    elements.messagePanel.classList.add('active');
    loadRoomMessages(roomId);
}

// 방 관리
function manageRoom(roomId) {
    // API 할당 모달 표시
    const availableApis = appState.apis
        .map((api, index) => api ? { ...api, index } : null)
        .filter(api => api !== null);
    
    if (availableApis.length === 0) {
        alert('사용 가능한 API가 없습니다. 먼저 API를 추가해주세요.');
        return;
    }
    
    const apiList = availableApis.map(api => `${api.index + 1}. ${api.botName}`).join('\n');
    const selectedIndex = prompt(`이 방에 할당할 API를 선택하세요:\n${apiList}`);
    
    if (selectedIndex) {
        const index = parseInt(selectedIndex) - 1;
        if (availableApis.find(api => api.index === index)) {
            assignApiToRoom(roomId, index);
        }
    }
}

// API를 방에 할당
function assignApiToRoom(roomId, apiIndex) {
    // 전문가 방 찾기
    let room = appState.rooms.expert.find(r => r.id === roomId);
    
    // 화력별 방에서 찾기
    if (!room) {
        for (let firepower in appState.rooms.firepower) {
            room = appState.rooms.firepower[firepower].find(r => r.id === roomId);
            if (room) break;
        }
    }
    
    if (room) {
        room.apiIndex = apiIndex;
        room.active = true;
        
        // API에도 방 정보 추가
        if (appState.apis[apiIndex]) {
            if (!appState.apis[apiIndex].assignedRooms) {
                appState.apis[apiIndex].assignedRooms = [];
            }
            appState.apis[apiIndex].assignedRooms.push(roomId);
        }
        
        // 현재 화력의 방 다시 렌더링
        renderFirepowerRooms(appState.activeFirepower);
        saveToLocalStorage();
    }
}

// 메시지 전송
async function sendMessage() {
    console.log('🔍 elements.messageTextarea:', elements.messageTextarea);
    console.log('🔍 messageTextarea 존재:', !!elements.messageTextarea);
    
    // 메시지 입력란 값 직접 확인
    console.log('🔍 실제 textarea 값:', document.getElementById('messageTextarea')?.value);
    console.log('🔍 elements를 통한 값:', elements.messageTextarea?.value);
    
    const message = (document.getElementById('messageTextarea')?.value || elements.messageTextarea?.value || '').trim();
    
    // 기존 붙여넣기 이미지 확인 (권한 요청 없이)
    const attachedFile = elements.attachedFiles.querySelector('.file-item');
    const hasAttachedImage = !!attachedFile;
    
    console.log('🔍 메시지 체크:', message);
    console.log('🔍 붙여넣기 이미지 있음:', hasAttachedImage);
    console.log('🔍 메시지 길이:', message ? message.length : 0);
    
    if (!message && !hasAttachedImage) {
        console.log('❌ 메시지나 이미지를 입력해주세요.');
        return;
    }
    
    // 최종 전송할 메시지 = 입력한 텍스트 (이미지는 별도 처리됨)
    let finalMessage = message || '';
    
    console.log('🔍 전송할 최종 메시지:', finalMessage);
    
    // 선택된 그룹들 가져오기
    console.log('🚀 sendMessage: getSelectedGroups 호출 시작');
    const selectedGroups = getSelectedGroups();
    console.log('🚀 sendMessage: 선택된 그룹들:', selectedGroups);
    console.log('🚀 sendMessage: 선택된 그룹 개수:', selectedGroups.length);
    
    // 선택된 그룹이 없으면 에러 메시지
    if (selectedGroups.length === 0) {
        showErrorMessage('전송할 그룹을 선택해주세요.');
        return;
    }
    
    // 전송 버튼 비활성화
    elements.sendMessageBtn.disabled = true;
    elements.sendMessageBtn.textContent = '전송 중...';
    
    let totalSent = 0;
    let totalFailed = 0;
    
    try {
        // 첨부파일이 있는 경우
        const attachedFile = elements.attachedFiles.querySelector('.file-item');
        
        if (attachedFile) {
            // 이미지 전송
            const fileData = attachedFile.dataset.fileData;
            const fileType = attachedFile.dataset.fileType;
            
            for (const group of selectedGroups) {
                try {
                    const response = await fetch(`${API_BASE_URL}/send-images`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: group.phone,
                            group_ids: [group.groupId],
                            message: finalMessage,
                            images: [{
                                data: fileData.split(',')[1],
                                type: fileType
                            }]
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        totalSent++;
                        console.log(`Message with image sent to ${group.phone} - ${group.groupId}`);
                    } else {
                        totalFailed++;
                        console.error(`Failed to send to ${group.phone}:`, result.error);
                    }
                } catch (error) {
                    totalFailed++;
                    console.error(`Error sending to ${group.phone}:`, error);
                }
                
                // 전송 간격 (동적 속도 적용)
                const currentSpeed = getCurrentMessageSpeed();
                console.log(`⚡ 현재 설정된 메시지 전송 속도: ${currentSpeed}ms`);
                await new Promise(resolve => setTimeout(resolve, currentSpeed));
            }
        } else {
            // 텍스트만 전송
            for (const group of selectedGroups) {
                console.log(`📤 Sending message to: ${group.phone} -> ${group.groupTitle} (ID: ${group.groupId})`);
                
                try {
                    const response = await fetch(`${API_BASE_URL}/send-message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: group.phone,
                            group_ids: [group.groupId],
                            message: finalMessage
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        totalSent++;
                        console.log(`✅ Message sent successfully to ${group.phone} -> ${group.groupTitle}`);
                    } else {
                        totalFailed++;
                        console.error(`❌ Failed to send to ${group.phone} -> ${group.groupTitle}:`, result.error);
                        
                        // 10번 계정 특별 디버깅
                        if (group.phone === '+821080670664') {
                            console.error(`🚨 10번 계정 (${group.phone}) 전송 실패 상세:`, {
                                phone: group.phone,
                                groupId: group.groupId,
                                groupTitle: group.groupTitle,
                                error: result.error,
                                fullResponse: result
                            });
                        }
                    }
                } catch (error) {
                    totalFailed++;
                    console.error(`💥 Network error sending to ${group.phone}:`, error);
                    
                    // 10번 계정 특별 디버깅
                    if (group.phone === '+821080670664') {
                        console.error(`🚨 10번 계정 (${group.phone}) 네트워크 오류:`, error);
                    }
                }
                
                // 전송 간격 (동적 속도 적용)
                const currentSpeed = getCurrentMessageSpeed();
                console.log(`⚡ 현재 설정된 메시지 전송 속도: ${currentSpeed}ms`);
                await new Promise(resolve => setTimeout(resolve, currentSpeed));
            }
        }
        
        // 결과 로그만 표시 (팝업 제거)
        if (totalSent > 0) {
            console.log(`✅ 메시지 전송 완료: 성공 ${totalSent}개, 실패 ${totalFailed}개`);
            
            // 전송 성공 시 입력창과 첨부파일 초기화
            elements.messageTextarea.value = '';
            elements.attachedFiles.innerHTML = '';
        } else {
            console.error(`❌ 전송 실패: ${totalFailed}개 그룹 전송 실패`);
            showErrorMessage(`전송 실패: ${totalFailed}개 그룹 전송 실패`);
        }
        
    } catch (error) {
        console.error('Send message error:', error);
        showErrorMessage('메시지 전송 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복원
        elements.sendMessageBtn.disabled = false;
        elements.sendMessageBtn.textContent = '전송';
    }
}

// 전화번호 정규화 함수 (전역 사용)
function normalizePhone(phone) {
    if (!phone) return phone;
    
    // 공백과 특수문자 제거
    let normalized = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
    
    // +82로 시작하지 않으면 추가
    if (!normalized.startsWith('+82')) {
        if (normalized.startsWith('82')) {
            normalized = '+' + normalized;
        } else if (normalized.startsWith('010')) {
            normalized = '+82' + normalized.substring(1);
        } else {
            normalized = '+82' + normalized;
        }
    }
    
    return normalized;
}

// 알려진 화력 계정 목록 (서버 API_CONFIGS 기준)
function getKnownFirepowerAccounts() {
    // 🔄 새로운 정책: 모든 계정을 화력으로 표시하고 사용자가 직접 전문가로 이동
    // 모든 알려진 계정을 여기에 포함하여 기본적으로 화력 섹션에 표시
    return [
        '+821039655066', // 1번
        '+821077893897', // 2번  
        '+821057334084', // 3번
        '+821080406011', // 4번
        '+821082019001', // 5번
        '+821039622144', // 6번
        '+821081724416', // 7번
        '+821039040988', // 8번
        '+821084095699', // 9번
        '+821083554890', // 10번
        '+821080670664', // 11번 (10번 계정)
        '+821077871056', // 12번 (11번 계정)
        // 추가로 알려진 모든 계정들을 여기에 포함
        // 사용자가 수동으로 전문가로 이동시킬 수 있음
        // 📝 여기에 추가 계정들을 넣어야 함 (제로, 신혜성, 김굽불 등)
    ];
}

// 화력 계정 여부 확인
function isFirepowerAccount(phone) {
    return getKnownFirepowerAccounts().includes(normalizePhone(phone));
}

// 🔥 안전한 전문가 계정 추가 함수 (화력 계정 차단)
function safeAddToExpertRooms(expertRoom) {
    const phone = expertRoom.phone;
    const normalizedPhone = normalizePhone(phone);
    const isFirepower = getKnownFirepowerAccounts().includes(normalizedPhone);
    
    if (isFirepower) {
        console.log(`🚫 전문가 섹션 추가 차단: ${phone} (화력 계정)`);
        return false;
    }
    
    // 중복 확인
    const existingIndex = appState.rooms.expert.findIndex(room => 
        room && normalizePhone(room.phone) === normalizedPhone
    );
    
    if (existingIndex >= 0) {
        appState.rooms.expert[existingIndex] = expertRoom;
        console.log(`✅ 전문가 계정 업데이트: ${phone}`);
    } else {
        appState.rooms.expert.push(expertRoom);
        console.log(`✅ 전문가 계정 추가: ${phone}`);
    }
    
    return true;
}

// 선택된 그룹들 가져오기
function getSelectedGroups() {
    console.log('🔍🔍🔍 getSelectedGroups 함수 시작!!! 🔍🔍🔍');
    
    const selectedGroups = [];
    console.log('🔍 appState exists:', typeof appState !== 'undefined');
    if (typeof appState !== 'undefined') {
        console.log('🔍 appState:', appState);
        console.log('🔍 appState.rooms exists:', appState.rooms !== undefined);
        if (appState.rooms) {
            console.log('🔍 appState.rooms:', appState.rooms);
            console.log('🔍 appState.rooms.expert exists:', appState.rooms.expert !== undefined);
            console.log('🔍 appState.rooms.expert:', appState.rooms.expert);
            console.log('🔍 appState.rooms.expert.length:', appState.rooms.expert ? appState.rooms.expert.length : 'N/A');
        }
    } else {
        console.log('❌ appState가 정의되지 않았습니다!');
    }
    
    console.log('🔍 전체 조건 체크:', 
        typeof appState !== 'undefined', 
        appState?.rooms !== undefined,
        appState?.rooms?.expert !== undefined,
        appState?.rooms?.expert?.length > 0
    );
    
    // 전문가 계정들의 선택된 그룹 - enabled된 전문가만 포함
    if (typeof appState !== 'undefined' && appState.rooms && appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((expertRoom, expertIndex) => {
            // 전문가 계정 강제 활성화
            if (expertRoom.enabled === false) {
                console.log(`🔧 전문가 ${expertIndex} 강제 활성화: enabled false → true`);
                expertRoom.enabled = true;
            }
            console.log(`🔍 전문가 ${expertIndex}:`, expertRoom);
            console.log(`🔍 전문가 ${expertIndex} enabled:`, expertRoom?.enabled);
            console.log(`🔍 전문가 ${expertIndex} selectedGroups:`, expertRoom?.selectedGroups);
            
            // enabled된 전문가만 메시지 전송에 포함 (조건 완전 완화)
            if (expertRoom && expertRoom.selectedGroups && expertRoom.selectedGroups.length > 0) {
                console.log(`🔍 전문가 ${expertIndex} enabled 상태:`, expertRoom.enabled);
                console.log(`🔍 전문가 ${expertIndex} phone:`, expertRoom.phone);
                if (expertRoom.enabled === false) {
                    console.log(`⚠️ 전문가 ${expertIndex}는 enabled=false이지만 그룹 선택 확인을 진행합니다`);
                }
                if (!expertRoom.phone) {
                    console.log(`⚠️ 전문가 ${expertIndex}는 phone이 없지만 그룹 선택 확인을 진행합니다`);
                }
                expertRoom.selectedGroups.forEach((group, groupIndex) => {
                    console.log(`🔍 전문가 ${expertIndex} 그룹 ${groupIndex}:`, group);
                    console.log(`🔍 전문가 ${expertIndex} 그룹 ${groupIndex} active:`, group.active);
                    
                    // 정확히 체크된(active: true) 그룹만 포함
                    if (group.active === true) {
                        console.log(`✅ 전문가 ${expertIndex} 그룹 ${groupIndex} 선택됨`);
                        selectedGroups.push({
                            phone: expertRoom.phone,
                            groupId: group.id,
                            groupTitle: group.name || group.title,
                            accountType: 'expert',
                            accountIndex: expertIndex
                        });
                    }
                });
            }
        });
    }
    
    // 화력별 계정들의 선택된 그룹 (현재 활성 화력만)
    let currentFirepowerData = null;
    let currentFirepowerRoom = null;
    
    if (typeof appState !== 'undefined' && appState.rooms && appState.rooms.firepower && appState.activeFirepower !== undefined) {
        currentFirepowerData = appState.rooms.firepower[appState.activeFirepower];
        currentFirepowerRoom = currentFirepowerData && currentFirepowerData[0];
    }
    
    if (currentFirepowerRoom && currentFirepowerRoom.phone && currentFirepowerRoom.selectedGroups && currentFirepowerRoom.selectedGroups.length > 0) {
        currentFirepowerRoom.selectedGroups.forEach(group => {
            if (group.active === true) { // 정확히 체크된 그룹만 선택
                selectedGroups.push({
                    phone: currentFirepowerRoom.phone,
                    groupId: group.id,
                    groupTitle: group.name || group.title,
                    accountType: 'firepower',
                    accountIndex: (typeof appState !== 'undefined') ? appState.activeFirepower : 0
                });
            }
        });
    }
    
    return selectedGroups;
}

// 선택된 그룹 수 업데이트
function updateSelectedGroupCount() {
    // 약간의 지연을 두어 데이터 로드 완료 후 실행
    setTimeout(() => {
        const selectedGroups = getSelectedGroups();
        console.log('Updated - Selected groups:', selectedGroups);
        console.log('Updated - Expert rooms:', appState.rooms.expert);
        
        // 🔍 전문가 그룹 상태 상세 디버깅
        if (appState.rooms.expert && appState.rooms.expert.length > 0) {
            appState.rooms.expert.forEach((room, index) => {
                console.log(`🔍 전문가 ${index} 그룹 상태 분석:`, room.selectedGroups);
                console.log(`🔍 전문가 ${index} enabled:`, room.enabled);
                if (room.selectedGroups) {
                    room.selectedGroups.forEach((group, gIndex) => {
                        console.log(`🔍 전문가 ${index} 그룹 ${gIndex}: id=${group.id}, active=${group.active}, name=${group.name}`);
                        if (group.active === true) {
                            console.log(`✅ 전문가 ${index} 그룹 ${gIndex} 활성화됨!`);
                        }
                    });
                }
            });
        }
        
        const countElement = document.getElementById('selectedGroupCount');
        if (countElement) {
            countElement.textContent = selectedGroups.length;
        }
    }, 100);
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4caf50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 에러 메시지 표시
function showErrorMessage(message) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.error-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 방 메시지 로드
function loadRoomMessages(roomId) {
    // TODO: 실제 메시지 로드 구현
    elements.messageList.innerHTML = `<p style="text-align: center; color: #666;">메시지를 불러오는 중...</p>`;
}

// 로컬 스토리지에 저장
function saveToLocalStorage() {
    // 🎓 전문가 계정은 그대로 유지 (화력 계정 제거 로직 비활성화)
    const cleanedExpertRooms = appState.rooms.expert;
    
    const stateToSave = {
        ...appState,
        rooms: {
            ...appState.rooms,
            expert: cleanedExpertRooms  // 정리된 전문가 목록만 저장
        },
        timestamp: Date.now()
    };
    
    localStorage.setItem('telegramWorldState', JSON.stringify(stateToSave));
    console.log(`💾 저장 완료 - 전문가: ${cleanedExpertRooms.length}개`);
    console.log('💾 저장된 데이터 크기:', JSON.stringify(stateToSave).length, 'bytes');
}

// 저장된 데이터 로드 (강화된 버전)
async function loadSavedData() {
    try {
        console.log('🔍 === loadSavedData 시작 ===');
        const savedData = localStorage.getItem('telegramWorldState');
        console.log('🔍 localStorage에서 가져온 raw 데이터:', savedData ? '존재함' : '없음');
        console.log('🔍 localStorage raw 데이터 길이:', savedData ? savedData.length : '0');
        
        if (savedData) {
            const data = JSON.parse(savedData);
            console.log('🔍 파싱된 데이터 전체:', data);
            console.log('🔍 data.rooms:', data.rooms);
            console.log('🔍 data.rooms.expert:', data.rooms ? data.rooms.expert : 'N/A');
            console.log('💾 Loading saved data from localStorage:', data);
            
            // 저장된 데이터로 상태 복원
            if (data.apis) appState.apis = data.apis;
            if (data.expertApis) appState.expertApis = data.expertApis;
            if (data.rooms) {
                console.log('🔍 rooms 데이터 복원 시작');
                console.log('🔍 복원 전 appState.rooms:', appState.rooms);
                appState.rooms = data.rooms;
                console.log('🔍 복원 후 appState.rooms:', appState.rooms);
                console.log('🔍 복원 후 appState.rooms.expert:', appState.rooms.expert);
                
                // 🎓 전문가 계정 보존 (화력 계정 제거 로직 비활성화)
                if (Array.isArray(appState.rooms.expert)) {
                    console.log('🔍 전문가 계정 배열 확인됨. 그대로 유지');
                    console.log('🔍 전문가 계정 수:', appState.rooms.expert.length);
                    console.log('🔍 전문가 계정 데이터:', appState.rooms.expert);
                } else {
                    console.log('🔍 전문가 계정이 배열이 아님. 빈 배열로 초기화');
                    appState.rooms.expert = [];
                }
                
                // firepower rooms가 객체가 아닌 경우 수정
                if (!appState.rooms.firepower || typeof appState.rooms.firepower !== 'object') {
                    appState.rooms.firepower = {};
                }
            }
            if (data.activeFirepower) appState.activeFirepower = data.activeFirepower;
            if (data.activeExpert !== undefined) appState.activeExpert = data.activeExpert;
            if (data.templates) appState.templates = data.templates;
            
            // UI 업데이트
            console.log('🔍 UI 업데이트 시작');
            console.log('🔍 renderExpertRooms 호출 전 appState.rooms.expert:', appState.rooms.expert);
            renderApiGrid();
            renderExpertRooms();
            renderFirepowerRooms(appState.activeFirepower);
            updateSelectedGroupCount();
            console.log('🔍 UI 업데이트 완료');
            
            console.log('✅ Data loaded successfully from localStorage');
            
            // localStorage에 데이터가 있으면 서버 복원은 하지 않음 (중복 방지)
            console.log('📂 LocalStorage 데이터가 있으므로 서버 복원을 건너뜁니다.');
            
            // 기존 데이터 마이그레이션 실행 (이미 저장된 데이터는 마이그레이션 불필요)
            console.log('📂 LocalStorage 데이터 로드 완료 - 마이그레이션 및 재연결 건너뜀');
            // migrateExistingGroupData(); // 새로고침 시 그룹 초기화 방지를 위해 비활성화
            
        } else {
            console.log('📂 No saved data found - 서버 동기화 비활성화됨');
            // await loadAccountsFromServer(); // 비활성화
            
            // 중요 계정들이 연결되어 있는지 확인하고 재연결 시도 (새 데이터만)
            // await reconnectMissingAccounts(); // 비활성화
        }
        
    } catch (error) {
        console.error('❌ Error loading saved data:', error);
        // 데이터가 손상된 경우 초기화
        localStorage.removeItem('telegramWorldState');
        console.log('🧹 Corrupted data cleared - 서버 동기화 비활성화됨');
        // await loadAccountsFromServer(); // 비활성화
        
        // 중요 계정들이 연결되어 있는지 확인하고 재연결 시도 (에러 상황에서만)
        // await reconnectMissingAccounts(); // 비활성화
    }
}

// 🚀 통합 서버 동기화 시스템 - 실제 로그인된 계정들을 자동으로 화력/전문가 섹션에 동기화
async function loadAccountsFromServer() {
    try {
        console.log('🔄 서버와 계정 동기화 시작...');
        
        // 1. 서버에서 로그인된 계정 목록 가져오기
        const response = await fetch(`${API_BASE_URL}/get-logged-accounts`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ 서버에서 계정 정보를 가져올 수 없습니다:', data.error);
            return;
        }
        
        if (!data.accounts || data.accounts.length === 0) {
            console.log('📭 서버에 로그인된 계정이 없습니다.');
            return;
        }
        
        console.log(`📊 서버에서 ${data.accounts.length}개 계정 발견`);
        
        // 2. 기존 화력 섹션 초기화 (서버 데이터로 완전 동기화)
        appState.rooms.firepower = {};
        
        // 3. 각 계정별로 그룹 정보와 함께 동기화
        const syncedAccounts = [];
        let firepowerCount = 1; // 화력 번호 자동 할당
        
        for (const account of data.accounts) {
            if (account.status !== 'logged_in' || !account.user) {
                console.log(`⚠️ ${account.phone} - 로그인 상태가 아니거나 사용자 정보 없음`);
                continue;
            }
            
            try {
                // 4. 각 계정의 그룹 목록 가져오기
                const groupResponse = await fetch(`${API_BASE_URL}/get-groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: account.phone })
                });
                
                const groupData = await groupResponse.json();
                const groups = groupData.success ? groupData.groups : [];
                
                const accountInfo = {
                    phone: account.phone,
                    user: {
                        id: account.user.id,
                        username: account.user.username,
                        first_name: account.user.first_name,
                        phone: account.user.phone
                    },
                    groups: groups,
                    status: 'logged_in',
                    syncedAt: new Date().toISOString()
                };
                
                // 5. 전문가 계정 확인 후 배치 결정
                const isExpertAccount = appState.rooms.expert && 
                    appState.rooms.expert.some(expertRoom => expertRoom.phone === account.phone);
                
                if (isExpertAccount) {
                    console.log(`🎓 ${account.phone} (${account.user.first_name}) → 전문가 계정이므로 화력 배치 건너뜀`);
                    syncedAccounts.push(accountInfo);
                } else {
                    // 기존 화력 계정이 있는지 확인
                    let existingRoom = null;
                    Object.keys(appState.rooms.firepower).forEach(key => {
                        const room = appState.rooms.firepower[key][0];
                        if (room && room.phone === account.phone) {
                            existingRoom = room;
                        }
                    });
                    
                    // 화력 섹션에 자동 배치 (1번부터 순서대로)
                    const firepowerRoom = {
                        phone: account.phone,
                        user: account.user,
                        selectedGroups: existingRoom ? 
                            normalizeGroupData(groups, true) : // 기존 계정이 있으면 상태 보존
                            normalizeGroupData(groups, false), // 새 계정이면 기본 선택 해제
                        availableGroups: groups,
                        active: true,
                        firepowerNumber: firepowerCount
                    };
                    
                    // 기존 선택 상태를 새 그룹에 적용
                    if (existingRoom && existingRoom.selectedGroups) {
                        firepowerRoom.selectedGroups.forEach(newGroup => {
                            const existingGroup = existingRoom.selectedGroups.find(g => g.id === newGroup.id);
                            if (existingGroup) {
                                newGroup.active = existingGroup.active; // 기존 선택 상태 복원
                            }
                        });
                    }
                    
                    // 화력 배치
                    appState.rooms.firepower[firepowerCount] = [firepowerRoom];
                    
                    console.log(`✅ ${account.phone} (${account.user.first_name}) → 화력 ${firepowerCount}번에 배치 (${groups.length}개 그룹)`);
                    
                    syncedAccounts.push(accountInfo);
                    firepowerCount++;
                }
                
                // 최대 30개까지만 배치
                if (firepowerCount > 30) {
                    console.log('⚠️ 화력 섹션 최대 용량(30개) 도달');
                    break;
                }
                
            } catch (groupError) {
                console.error(`❌ ${account.phone} 그룹 정보 로드 실패:`, groupError);
                
                // 그룹 정보를 가져올 수 없어도 기본 계정으로 배치
                const basicAccountInfo = {
                    phone: account.phone,
                    user: account.user,
                    selectedGroups: [],
                    availableGroups: [],
                    active: true,
                    firepowerNumber: firepowerCount
                };
                
                appState.rooms.firepower[firepowerCount] = [basicAccountInfo];
                
                console.log(`✅ ${account.phone} (${account.user.first_name}) → 화력 ${firepowerCount}번에 기본 배치 (그룹 정보 없음)`);
                firepowerCount++;
            }
        }
        
        // 6. UI 업데이트
        console.log('🎨 UI 업데이트 중...');
        saveToLocalStorage(); // 상태 저장
        renderFirepowerRooms(appState.activeFirepower);
        renderExpertRooms();
        renderFirepowerAccountsList();
        
        // 7. 동기화 완료 알림
        const syncMessage = `🎉 동기화 완료: ${syncedAccounts.length}개 계정이 화력 섹션에 자동 배치되었습니다.`;
        console.log(syncMessage);
        
        // 성공 알림 표시 - 팝업 비활성화
        // if (typeof showSuccessMessage === 'function') {
        //     showSuccessMessage(syncMessage);
        // }
        
        return syncedAccounts;
        
    } catch (error) {
        console.error('❌ 서버 동기화 중 오류 발생:', error);
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('서버와의 동기화 중 오류가 발생했습니다.');
        }
        return [];
    }
}

// 누락된 중요 계정들을 자동으로 재연결 시도
async function reconnectMissingAccounts() {
    const criticalAccounts = ['+821080670664', '+821077871056']; // 10번, 11번 계정
    
    try {
        console.log('🔄 Critical accounts reconnection check...');
        
        // 현재 로그인된 계정 목록 가져오기
        const loggedResponse = await fetch('http://127.0.0.1:5000/api/get-logged-accounts');
        const loggedData = await loggedResponse.json();
        
        const loggedPhones = loggedData.success ? loggedData.accounts.map(acc => acc.phone) : [];
        
        // 누락된 계정 찾기
        const missingAccounts = criticalAccounts.filter(phone => !loggedPhones.includes(phone));
        
        if (missingAccounts.length === 0) {
            console.log('✅ All critical accounts are connected');
            return true;
        }
        
        console.log(`🚨 Missing critical accounts: ${missingAccounts.join(', ')}`);
        
        // 각 누락된 계정에 대해 재연결 시도
        for (const phone of missingAccounts) {
            console.log(`🔄 Attempting to reconnect ${phone}...`);
            
            try {
                // connect API 호출 (세션이 있으면 자동 로그인)
                const connectResponse = await fetch(`${API_BASE_URL}/connect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: phone
                    })
                });
                
                const connectResult = await connectResponse.json();
                
                if (connectResult.success) {
                    console.log(`✅ Reconnected ${phone} successfully`);
                    
                    // 연결 후 그룹 목록 가져와서 복원
                    try {
                        const groupResponse = await fetch(`${API_BASE_URL}/get-groups`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                phone: phone
                            })
                        });
                        
                        const groupData = await groupResponse.json();
                        
                        if (groupData.success && groupData.groups && groupData.groups.length > 0) {
                            console.log(`📋 Restored ${groupData.groups.length} groups for ${phone}`);
                            
                            // 전문가 섹션에 복원 (첫 번째 그룹 자동 활성화)
                            const normalizedGroups = normalizeGroupData(groupData.groups, false);
                            if (normalizedGroups.length > 0) {
                                normalizedGroups[0].active = true; // 첫 번째 그룹 자동 선택
                            }
                            
                            const expertRoom = {
                                phone: phone,
                                user: connectResult.user || { first_name: phone.slice(-4) },
                                selectedGroups: normalizedGroups,
                                availableGroups: groupData.groups,
                                active: true,
                                enabled: true  // 개별 토글용 필드 추가
                            };
                            
                            // 🔥 안전한 전문가 계정 추가 (화력 계정 차단)
                            safeAddToExpertRooms(expertRoom);
                        }
                    } catch (groupError) {
                        console.error(`Error loading groups for ${phone}:`, groupError);
                    }
                    
                } else {
                    console.error(`❌ Failed to reconnect ${phone}:`, connectResult.error);
                }
            } catch (error) {
                console.error(`💥 Error reconnecting ${phone}:`, error);
            }
            
            // 연결 시도 간 대기
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        // UI 업데이트
        saveToLocalStorage();
        renderExpertRooms();
        renderFirepowerAccountsList();
        
        console.log('🔄 Critical accounts reconnection completed');
        return true;
        
    } catch (error) {
        console.error('❌ Error in reconnectMissingAccounts:', error);
        return false;
    }
}

// 전문가 API 저장
function saveExpertApi() {
    console.log('🔍 === saveExpertApi 시작 ===');
    const apiKey = elements.expertApiKeyInput.value.trim();
    const botName = elements.expertBotNameInput.value.trim();
    const groupId = elements.expertGroupIdInput.value.trim();
    
    console.log('🔍 입력된 데이터:', { apiKey: apiKey ? '입력됨' : '없음', botName, groupId });
    
    if (!apiKey || !botName || !groupId) {
        alert('모든 정보를 입력해주세요.');
        return;
    }
    
    const newExpertApi = {
        apiKey,
        botName,
        groupId,
        active: true
    };
    
    console.log('🔍 추가할 전문가 API:', newExpertApi);
    console.log('🔍 추가 전 appState.expertApis:', appState.expertApis);
    console.log('🔍 추가 전 appState.rooms.expert:', appState.rooms.expert);
    
    appState.expertApis.push(newExpertApi);
    
    console.log('🔍 추가 후 appState.expertApis:', appState.expertApis);
    console.log('🔍 renderExpertRooms 호출');
    
    renderExpertRooms();
    elements.expertApiModal.classList.remove('active');
    clearExpertApiModal();
    saveToLocalStorage();
    
    console.log('🔍 saveExpertApi 완료');
}

// 전문가 API 모달 초기화
function clearExpertApiModal() {
    elements.expertApiKeyInput.value = '';
    elements.expertBotNameInput.value = '';
    elements.expertGroupIdInput.value = '';
}

// 전문가 방 렌더링
function renderExpertRooms() {
    console.log('🔍 === renderExpertRooms 시작 ===');
    console.log('🔍 elements.expertRooms 존재:', !!elements.expertRooms);
    
    if (!elements.expertRooms) {
        console.error('❌ elements.expertRooms가 존재하지 않습니다!');
        return;
    }
    
    console.log('🔍 appState.rooms 전체:', appState.rooms);
    console.log('🔍 appState.rooms.expert 타입:', typeof appState.rooms.expert);
    console.log('🔍 appState.rooms.expert 배열인가?', Array.isArray(appState.rooms.expert));
    console.log('🔍 전문가 섹션 렌더링 시작. 계정 수:', appState.rooms.expert ? appState.rooms.expert.length : 'undefined');
    console.log('🔍 전문가 계정 데이터:', appState.rooms.expert);
    
    // 마스터 계정 시스템 사용으로 인해 자동 제거 비활성화
    // 이제 사용자가 API 관리에서 직접 계정 타입을 설정합니다.
    
    elements.expertRooms.innerHTML = '';
    console.log('🔍 expertRooms DOM 요소 초기화 완료');
    
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        console.log('🔍 전문가 계정이 존재함. 렌더링 시작...');
        appState.rooms.expert.forEach((room, index) => {
            console.log(`🔍 전문가 계정 [${index}] 렌더링:`, room);
            
            // 🔍 그룹 상태 즉시 확인 (강화된 로그)
            console.log(`🔍 전문가 ${index} selectedGroups 존재:`, !!room.selectedGroups);
            console.log(`🔍 전문가 ${index} selectedGroups 길이:`, room.selectedGroups ? room.selectedGroups.length : 'N/A');
            console.log(`🔍 전문가 ${index} selectedGroups 전체:`, room.selectedGroups);
            
            if (room.selectedGroups && room.selectedGroups.length > 0) {
                console.log(`🔍 전문가 ${index} 그룹 즉시 분석:`);
                room.selectedGroups.forEach((group, gIndex) => {
                    console.log(`  그룹 ${gIndex}: id=${group.id}, active=${group.active}, name=${group.name || group.title}`);
                });
            } else {
                console.log(`⚠️ 전문가 ${index} 그룹이 없거나 빈 배열입니다`);
            }
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card expert-card';
            
            const userName = room.user ? room.user.first_name || room.user.username : '알 수 없음';
            const groupCount = room.selectedGroups ? room.selectedGroups.filter(g => g.active !== false).length : 0;
            const phone = room.phone || '알 수 없음';
            
            const isEnabled = room.enabled !== false;
            
            roomCard.innerHTML = `
                <div class="room-header">
                    <h3>🔹 ${userName} (${phone})</h3>
                    <div class="expert-toggle-container">
                        <label class="expert-toggle">
                            <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                                   onchange="toggleExpertEnabled(${index})">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="expert-status ${isEnabled ? 'enabled' : 'disabled'}">
                            ${isEnabled ? '활성화' : '비활성화'}
                        </span>
                    </div>
                </div>
                <div class="room-info">
                    <p>📊 선택된 그룹: <span class="group-count">${groupCount}개</span></p>
                </div>
                <div class="expert-groups" id="expertGroups-${index}">
                    <!-- 선택된 그룹 목록이 여기에 표시됨 -->
                </div>
                <div class="room-actions">
                    <button class="btn-test" onclick="testExpertConnection('${phone}')">연결 테스트</button>
                    <button class="btn-refresh" onclick="refreshExpertGroups(${index})" style="background-color: #17a2b8; color: white;">그룹 새로고침</button>
                    <button class="btn-move-to-firepower" onclick="moveToFirepower(${index})" style="background-color: #ff6b35; color: white;">🔥 화력으로</button>
                    <button class="btn-remove" onclick="removeExpertRoom(${index})">삭제</button>
                </div>
            `;
            elements.expertRooms.appendChild(roomCard);
            
            // 그룹 목록 렌더링
            renderExpertGroups(index, room);
        });
        console.log('🔍 전문가 계정 렌더링 완료');
    } else {
        console.log('🔍 전문가 계정이 없음. 빈 상태 메시지 표시');
        console.log('🔍 조건 체크:', {
            'appState.rooms.expert 존재': !!appState.rooms.expert,
            'appState.rooms.expert.length': appState.rooms.expert ? appState.rooms.expert.length : 'N/A'
        });
        elements.expertRooms.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">등록된 API가 없습니다</p>';
    }
    
    // 선택된 그룹 수 업데이트
    updateSelectedGroupCount();
}

// 전문가 그룹 목록 렌더링 (화력과 동일한 방식)
function renderExpertGroups(index, room) {
    const groupsContainer = document.getElementById(`expertGroups-${index}`);
    if (!groupsContainer) return;
    
    if (room.selectedGroups && room.selectedGroups.length > 0) {
        groupsContainer.innerHTML = '';
        
        // 헤더
        const header = document.createElement('h4');
        header.textContent = '📋 참여 중인 그룹:';
        header.style.cssText = 'margin: 10px 0 8px 0; font-size: 14px; color: #333;';
        groupsContainer.appendChild(header);
        
        // 각 그룹을 화력과 동일한 방식으로 생성
        room.selectedGroups.forEach((group, groupIndex) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'selected-group-item';
            const isActive = group.active !== false;
            
            groupDiv.innerHTML = `
                <input type="checkbox" id="expertGroup-${index}-${groupIndex}" ${isActive ? 'checked' : ''} onchange="toggleExpertGroup(${index}, ${groupIndex})">
                <label for="expertGroup-${index}-${groupIndex}">${group.name || group.title}</label>
            `;
            
            groupsContainer.appendChild(groupDiv);
        });
    } else {
        groupsContainer.innerHTML = '<p style="text-align: center; color: #999; font-size: 12px; padding: 10px;">선택된 그룹이 없습니다</p>';
    }
}

// 전문가 그룹 토글
function toggleExpertGroup(roomIndex, groupIndex) {
    console.log('Toggle expert group:', roomIndex, groupIndex);
    const room = appState.rooms.expert[roomIndex];
    console.log('Room:', room);
    
    if (room && room.selectedGroups && room.selectedGroups[groupIndex]) {
        console.log('Group before toggle:', room.selectedGroups[groupIndex]);
        room.selectedGroups[groupIndex].active = !room.selectedGroups[groupIndex].active;
        console.log('Group after toggle:', room.selectedGroups[groupIndex]);
        
        // 체크된 그룹 수 업데이트
        const activeGroups = room.selectedGroups.filter(g => g.active !== false);
        const groupCountSpan = elements.expertRooms.querySelector(`#expertGroups-${roomIndex}`).closest('.room-card').querySelector('.group-count');
        if (groupCountSpan) {
            groupCountSpan.textContent = activeGroups.length;
        }
        
        // 전체 선택된 그룹 수 업데이트
        updateSelectedGroupCount();
        
        saveToLocalStorage();
    }
}

// 전문가 그룹 새로고침
async function refreshExpertGroups(index) {
    const room = appState.rooms.expert[index];
    if (!room || !room.phone) {
        alert('전화번호 정보가 없습니다.');
        return;
    }
    
    console.log(`🔄 전문가 ${index} (${room.phone}) 그룹 새로고침 시작`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/get-groups`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: room.phone })
        });
        
        const data = await response.json();
        console.log(`📊 ${room.phone} 그룹 응답:`, data);
        
        // 🔍 DEBUGGING: 각 그룹의 title 값 상세 확인
        if (data.success && data.groups) {
            data.groups.forEach((group, index) => {
                console.log(`[DEBUG] Group ${index}: ID=${group.id}, title=${JSON.stringify(group.title)} (type: ${typeof group.title})`);
                if (group.title === 'undefined' || group.title === undefined) {
                    console.error(`❌ FOUND UNDEFINED! Group ${group.id} has undefined title`);
                }
            });
        }
        
        if (data.success) {
            // 기존 선택 상태 보존 - active 상태까지 고려
            const existingSelectedGroups = room.selectedGroups || [];
            const existingSelectionMap = new Map();
            existingSelectedGroups.forEach(g => {
                existingSelectionMap.set(g.id, g.active !== false); // 기존 active 상태 보존
            });
            console.log(`💾 기존 선택된 그룹 상태:`, Array.from(existingSelectionMap.entries()));
            
            // 새로운 그룹 목록에서 기존 선택 상태 유지
            room.selectedGroups = data.groups.map(group => {
                const wasSelected = existingSelectionMap.has(group.id);
                const wasActive = existingSelectionMap.get(group.id) || false;
                return {
                    id: group.id,
                    name: group.title || group.name || '그룹명 없음',
                    title: group.title || group.name || '그룹명 없음',
                    active: wasSelected ? wasActive : false // 기존에 선택되었고 활성화된 경우만 true
                };
            });
            
            room.availableGroups = data.groups;
            
            console.log(`✅ ${room.phone}: ${data.groups.length}개 그룹 중 ${room.selectedGroups.filter(g => g.active).length}개 선택됨`);
            
            renderExpertRooms();
            saveToLocalStorage();
            alert(`${data.groups.length}개 그룹이 새로고침되었습니다. (${room.selectedGroups.filter(g => g.active).length}개 선택 유지)`);
        } else {
            console.error(`❌ ${room.phone} 그룹 로드 실패:`, data.error);
            alert(`그룹 로드 실패: ${data.error}`);
        }
    } catch (error) {
        console.error(`💥 ${room.phone} 그룹 로드 오류:`, error);
        alert(`그룹 로드 오류: ${error.message}`);
    }
}

// 전문가 연결 테스트
async function testExpertConnection(phone) {
    try {
        const response = await fetch(`${API_BASE_URL}/test-connection`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success && data.connected) {
            alert(`연결 성공!\n사용자: ${data.user.first_name}\n전화번호: ${data.user.phone}`);
        } else {
            alert('연결 실패 또는 로그인이 필요합니다.');
        }
    } catch (error) {
        alert(`연결 테스트 오류: ${error.message}`);
    }
}

// 전문가 개별 on/off 토글
function toggleExpertEnabled(index) {
    if (!appState.rooms.expert[index]) {
        console.error(`전문가 ${index} not found`);
        return;
    }
    
    const expert = appState.rooms.expert[index];
    const previousState = expert.enabled !== false; // 기본값은 true
    expert.enabled = !previousState;
    
    console.log(`🔄 전문가 ${index} (${expert.phone}) 메시지 전송 토글: ${previousState ? 'ON' : 'OFF'} -> ${expert.enabled ? 'ON' : 'OFF'}`);
    
    // UI 업데이트
    renderExpertRooms();
    updateSelectedGroupCount();
    saveToLocalStorage();
}

// 전문가 API 삭제
function removeExpertRoom(index) {
    if (confirm('이 전문가 API를 삭제하시겠습니까?')) {
        // 삭제할 전문가가 현재 활성화된 전문가라면 activeExpert 초기화
        if (appState.activeExpert === index) {
            appState.activeExpert = null;
        } else if (appState.activeExpert > index) {
            // 삭제할 전문가보다 뒤에 있는 전문가가 활성화되어 있다면 인덱스 조정
            appState.activeExpert--;
        }
        
        appState.rooms.expert.splice(index, 1);
        renderExpertRooms();
        updateSelectedGroupCount();
        saveToLocalStorage();
    }
}

// 전문가 API 테스트
function testExpertApi(index) {
    const api = appState.expertApis[index];
    alert(`${api.botName} API 테스트 - 그룹 ID: ${api.groupId}`);
    // TODO: 실제 API 테스트 구현
}

// 전문가 API 삭제
function removeExpertApi(index) {
    if (confirm('이 API를 삭제하시겠습니까?')) {
        appState.expertApis.splice(index, 1);
        renderExpertRooms();
        saveToLocalStorage();
    }
}

// 전체 전송 모달 표시
function showBroadcastModal() {
    elements.broadcastModal.classList.add('active');
    renderBroadcastGroupList();
}

// 전체 전송용 그룹 목록 렌더링
function renderBroadcastGroupList() {
    const groupList = elements.groupList;
    groupList.innerHTML = '';
    
    console.log('Rendering broadcast group list...');
    
    // 전문가 계정들의 그룹 (enabled된 전문가만)
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((room, index) => {
            if (room && room.phone && room.enabled !== false && room.selectedGroups && room.selectedGroups.length > 0) {
                // 계정 헤더
                const accountHeader = document.createElement('div');
                accountHeader.className = 'account-header';
                accountHeader.innerHTML = `
                    <h4>전문가 ${index + 1}: ${room.user ? room.user.first_name || room.user.username : ''}(${room.phone})</h4>
                    <label>
                        <input type="checkbox" class="account-toggle" data-account-type="expert" data-account-index="${index}">
                        모든 그룹 선택
                    </label>
                `;
                groupList.appendChild(accountHeader);
                
                // 해당 계정의 그룹들
                room.selectedGroups.forEach(group => {
                    const checkbox = document.createElement('label');
                    checkbox.className = 'group-item';
                    checkbox.innerHTML = `
                        <input type="checkbox" name="groups" value="expert-${index}-${group.id}" data-account-type="expert" data-account-index="${index}">
                        &nbsp;&nbsp;&nbsp;&nbsp;${group.name || group.title}
                    `;
                    groupList.appendChild(checkbox);
                });
            }
        });
    }
    
    // 화력별 계정들의 그룹
    for (const firepower of Object.keys(appState.rooms.firepower)) {
        const firepowerData = appState.rooms.firepower[firepower];
        if (!firepowerData || !firepowerData[0]) continue;
        
        const room = firepowerData[0];
        if (room && room.phone && room.groups && room.groups.length > 0) {
            // 계정 헤더
            const accountHeader = document.createElement('div');
            accountHeader.className = 'account-header';
            accountHeader.innerHTML = `
                <h4>화력 ${firepower}: ${room.username || ''}(${room.phone})</h4>
                <label>
                    <input type="checkbox" class="account-toggle" data-account-type="firepower" data-account-index="${firepower}">
                    모든 그룹 선택
                </label>
            `;
            groupList.appendChild(accountHeader);
            
            // 해당 계정의 그룹들
            room.groups.forEach(group => {
                const checkbox = document.createElement('label');
                checkbox.className = 'group-item';
                checkbox.innerHTML = `
                    <input type="checkbox" name="groups" value="firepower-${firepower}-${group.id}" data-account-type="firepower" data-account-index="${firepower}">
                    &nbsp;&nbsp;&nbsp;&nbsp;${group.title}
                `;
                groupList.appendChild(checkbox);
            });
        }
    }
    
    // 계정별 토글 이벤트 추가
    groupList.querySelectorAll('.account-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const accountType = e.target.dataset.accountType;
            const accountIndex = e.target.dataset.accountIndex;
            const isChecked = e.target.checked;
            
            // 해당 계정의 모든 그룹 체크박스 토글
            groupList.querySelectorAll(`input[data-account-type="${accountType}"][data-account-index="${accountIndex}"]`).forEach(cb => {
                if (cb !== e.target) {
                    cb.checked = isChecked;
                }
            });
        });
    });
}

// 전체 전송
async function sendBroadcast() {
    const message = elements.broadcastMessage.value.trim();
    const file = elements.broadcastFile.files[0];
    const selectedGroupElements = Array.from(elements.groupList.querySelectorAll('input[name="groups"]:checked'));
    
    if (!message && !file) {
        showErrorMessage('메시지나 사진을 입력해주세요.');
        return;
    }
    
    if (selectedGroupElements.length === 0) {
        showErrorMessage('전송할 그룹을 선택해주세요.');
        return;
    }
    
    // 선택된 그룹들을 계정별로 분류
    const accountGroups = {};
    selectedGroupElements.forEach(element => {
        const value = element.value; // expert-0-123456 또는 firepower-1-654321 형태
        const [accountType, accountIndex, groupId] = value.split('-');
        
        const key = `${accountType}-${accountIndex}`;
        if (!accountGroups[key]) {
            accountGroups[key] = {
                type: accountType,
                index: accountIndex,
                phone: null,
                groupIds: []
            };
        }
        accountGroups[key].groupIds.push(groupId);
    });
    
    // 각 계정의 전화번호 찾기
    for (const key of Object.keys(accountGroups)) {
        const account = accountGroups[key];
        if (account.type === 'expert') {
            const expertRoom = appState.rooms.expert[account.index];
            if (expertRoom && expertRoom.phone) {
                account.phone = expertRoom.phone;
            }
        } else if (account.type === 'firepower') {
            const firepowerRoom = appState.rooms.firepower[account.index] && appState.rooms.firepower[account.index][0];
            if (firepowerRoom && firepowerRoom.phone) {
                account.phone = firepowerRoom.phone;
            }
        }
    }
    
    // 전송 시작
    elements.sendBroadcastBtn.disabled = true;
    elements.sendBroadcastBtn.textContent = '전송 중...';
    
    let totalSent = 0;
    let totalFailed = 0;
    
    try {
        if (file) {
            // 이미지 파일이 있는 경우
            const fileData = await convertFileToBase64(file);
            
            for (const key of Object.keys(accountGroups)) {
                const account = accountGroups[key];
                if (!account.phone) {
                    console.error(`Phone not found for account ${key}`);
                    continue;
                }
                
                try {
                    const response = await fetch(`${API_BASE_URL}/send-images`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: account.phone,
                            group_ids: account.groupIds,
                            message: message,
                            images: [{
                                data: fileData.split(',')[1], // Base64 데이터만
                                type: file.type
                            }]
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        totalSent += account.groupIds.length;
                        console.log(`Sent to ${account.phone}: ${result.message}`);
                    } else {
                        totalFailed += account.groupIds.length;
                        console.error(`Failed to send to ${account.phone}: ${result.error}`);
                    }
                } catch (error) {
                    totalFailed += account.groupIds.length;
                    console.error(`Error sending to ${account.phone}:`, error);
                }
                
                // 계정간 전송 간격
                await new Promise(resolve => setTimeout(resolve, 600));
            }
        } else {
            // 텍스트 메시지만 있는 경우
            for (const key of Object.keys(accountGroups)) {
                const account = accountGroups[key];
                if (!account.phone) {
                    console.error(`Phone not found for account ${key}`);
                    continue;
                }
                
                try {
                    const response = await fetch(`${API_BASE_URL}/send-message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: account.phone,
                            group_ids: account.groupIds,
                            message: message
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        totalSent += account.groupIds.length;
                        console.log(`Sent to ${account.phone}: ${result.message}`);
                    } else {
                        totalFailed += account.groupIds.length;
                        console.error(`Failed to send to ${account.phone}: ${result.error}`);
                    }
                } catch (error) {
                    totalFailed += account.groupIds.length;
                    console.error(`Error sending to ${account.phone}:`, error);
                }
                
                // 계정간 전송 간격
                await new Promise(resolve => setTimeout(resolve, 600));
            }
        }
        
        // 결과 표시
        if (totalSent > 0) {
            showSuccessMessage(`전체 전송 완료: 성공 ${totalSent}개, 실패 ${totalFailed}개`);
        } else {
            showErrorMessage(`전송 실패: ${totalFailed}개 그룹 전송 실패`);
        }
        
    } catch (error) {
        console.error('Broadcast error:', error);
        showErrorMessage('전송 중 오류가 발생했습니다.');
    } finally {
        // 버튼 상태 복원
        elements.sendBroadcastBtn.disabled = false;
        elements.sendBroadcastBtn.textContent = '전송';
        
        // 모달 닫기
        elements.broadcastModal.classList.remove('active');
        clearBroadcastModal();
    }
}

// 전체 전송 모달 초기화
function clearBroadcastModal() {
    elements.broadcastMessage.value = '';
    elements.broadcastFile.value = '';
    elements.selectAllGroups.checked = true;
}

// 클립보드 붙여넣기 처리
function handlePaste(e) {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            displayPastedImage(blob);
            break;
        }
    }
}

// 붙여넣은 이미지 표시
function displayPastedImage(blob) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const preview = document.createElement('div');
        preview.className = 'file-item'; // sendMessage 함수가 찾는 클래스로 변경
        preview.dataset.fileData = e.target.result; // 이미지 데이터 저장
        preview.dataset.fileType = blob.type; // 파일 타입 저장
        preview.innerHTML = `
            <img src="${e.target.result}" alt="붙여넣은 이미지">
            <button class="remove-file" onclick="removeAttachedFile(this)">×</button>
        `;
        elements.attachedFiles.appendChild(preview);
        
        // 이미지 데이터 저장 (기존 방식 유지)
        if (!appState.attachedImages) {
            appState.attachedImages = [];
        }
        appState.attachedImages.push({
            type: 'clipboard',
            data: e.target.result,
            blob: blob
        });
    };
    
    reader.readAsDataURL(blob);
}

// 첨부 파일 제거
function removeAttachedFile(button) {
    const preview = button.parentElement;
    const index = Array.from(elements.attachedFiles.children).indexOf(preview);
    
    if (appState.attachedImages && appState.attachedImages[index]) {
        appState.attachedImages.splice(index, 1);
    }
    
    preview.remove();
}

// 템플릿 관리
function loadTemplates() {
    const savedTemplates = localStorage.getItem('messageTemplates');
    if (savedTemplates) {
        appState.templates = JSON.parse(savedTemplates);
    } else {
        // 10개의 빈 템플릿으로 초기화
        appState.templates = Array(10).fill('');
    }
    renderTemplates();
}

function renderTemplates() {
    console.log('renderTemplates 시작');
    const templateList = document.getElementById('templateList');
    
    if (!templateList) {
        console.error('templateList element not found!');
        return;
    }
    
    console.log('templateList 요소 찾음:', templateList);
    
    // 먼저 섹션이 보이는지 확인
    const section = document.querySelector('.message-templates');
    console.log('Message templates section exists:', !!section);
    if (section) {
        console.log('Section display style:', window.getComputedStyle(section).display);
        console.log('Section visibility:', window.getComputedStyle(section).visibility);
        console.log('Section height:', window.getComputedStyle(section).height);
        section.style.display = 'block'; // 강제로 표시
        section.style.visibility = 'visible'; // 강제로 표시
    }
    
    templateList.innerHTML = '';
    console.log('templateList innerHTML 초기화 완료');
    
    // 템플릿 데이터 확인
    if (!appState.templates || appState.templates.length === 0) {
        console.log('템플릿 데이터가 없음. 초기화 중...');
        appState.templates = Array(10).fill('');
    }
    console.log('현재 템플릿 데이터:', appState.templates);
    
    // 10개의 템플릿 입력칸 생성
    for (let i = 0; i < 10; i++) {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'template-input';
        input.placeholder = `템플릿 ${i + 1}`;
        input.value = appState.templates[i] || '';
        
        const sendBtn = document.createElement('button');
        sendBtn.className = 'template-send-btn';
        sendBtn.textContent = '전송';
        sendBtn.onclick = () => sendTemplateToFirepower(i);
        
        templateItem.appendChild(input);
        templateItem.appendChild(sendBtn);
        templateList.appendChild(templateItem);
        
        // 이벤트 리스너는 나중에 추가
        input.addEventListener('input', (function(index) {
            return function(e) {
                appState.templates[index] = e.target.value;
                saveTemplates();
            };
        })(i));
        
        sendBtn.addEventListener('click', (function(inputEl) {
            return function() {
                if (inputEl.value.trim()) {
                    sendTemplateMessage(inputEl.value.trim());
                }
            };
        })(input));
    }
    
    console.log('Templates rendered:', templateList.children.length);
}

function saveTemplates() {
    localStorage.setItem('messageTemplates', JSON.stringify(appState.templates));
}

function sendTemplateMessage(message) {
    // 해당 화력의 모든 API에 메시지 전송
    console.log('템플릿 메시지 전송:', message);
    // TODO: 실제 전송 구현
    
    // 시각적 피드백은 이미 showTemplateResult로 처리됨
}

// 텔레그램 User API 관련 함수들
const API_BASE_URL = 'http://127.0.0.1:5000/api';

async function connectTelegramAPI() {
    const phone = elements.expertPhoneInput.value.trim();
    
    if (!phone) {
        showConnectionStatus('전화번호를 입력해주세요', 'error');
        return;
    }
    
    showConnectionStatus('연결 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.require_code) {
                elements.verificationSection.style.display = 'block';
                showConnectionStatus('인증 코드가 전송되었습니다. 텔레그램을 확인해주세요.', 'info');
                appState.currentPhone = phone;
            } else {
                showConnectionStatus('이미 로그인되어 있습니다.', 'success');
                elements.testConnectionBtn.style.display = 'inline-block';
                elements.loadGroupsBtn.style.display = 'inline-block';
                
                // 사용자 정보 저장
                if (data.user) {
                    appState.currentUser = data.user;
                }
                
                // 자동으로 그룹 목록 불러오기
                setTimeout(() => {
                    loadTelegramGroups();
                }, 800);
            }
        } else {
            showConnectionStatus(data.error || '연결 실패', 'error');
        }
    } catch (error) {
        showConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

async function verifyTelegramCode() {
    const code = elements.verificationCode.value.trim();
    
    if (!code) {
        showConnectionStatus('인증 코드를 입력해주세요', 'error');
        return;
    }
    
    showConnectionStatus('인증 확인 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: appState.currentPhone,
                code 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showConnectionStatus(`로그인 성공! 사용자: ${data.user.first_name}`, 'success');
            elements.verificationSection.style.display = 'none';
            elements.testConnectionBtn.style.display = 'inline-block';
            elements.loadGroupsBtn.style.display = 'inline-block';
            
            // 사용자 정보 저장
            appState.currentUser = data.user;
            
            // 자동으로 그룹 목록 불러오기
            setTimeout(() => {
                loadTelegramGroups();
            }, 800);
        } else if (data.require_password) {
            // 2FA 비밀번호 필요
            showConnectionStatus(data.message, 'info');
            showPasswordSection();
        } else {
            showConnectionStatus(data.error || '인증 실패', 'error');
        }
    } catch (error) {
        showConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

// 2FA 비밀번호 섹션 표시
function showPasswordSection() {
    const passwordSection = document.createElement('div');
    passwordSection.id = 'passwordSection';
    passwordSection.innerHTML = `
        <div style="margin-top: 15px;">
            <input type="password" id="telegramPassword" placeholder="2단계 인증 비밀번호" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <button id="verifyPasswordBtn" class="btn-connect-api" style="width: 100%;">비밀번호 확인</button>
        </div>
    `;
    
    // 기존 passwordSection 제거 후 추가
    const existing = document.getElementById('passwordSection');
    if (existing) existing.remove();
    
    elements.verificationSection.appendChild(passwordSection);
    
    // 비밀번호 확인 버튼 이벤트
    document.getElementById('verifyPasswordBtn').addEventListener('click', verifyTelegramPassword);
    
    // 엔터키 지원
    document.getElementById('telegramPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyTelegramPassword();
        }
    });
}

// 2FA 비밀번호 확인
async function verifyTelegramPassword() {
    const password = document.getElementById('telegramPassword')?.value.trim();
    
    if (!password) {
        showConnectionStatus('비밀번호를 입력해주세요', 'error');
        return;
    }
    
    showConnectionStatus('2FA 인증 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: appState.currentPhone,
                password 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showConnectionStatus(`2FA 인증 성공! 사용자: ${data.user.first_name}`, 'success');
            
            // UI 정리
            document.getElementById('passwordSection')?.remove();
            elements.verificationSection.style.display = 'none';
            elements.testConnectionBtn.style.display = 'inline-block';
            elements.loadGroupsBtn.style.display = 'inline-block';
            
            // 사용자 정보 저장
            appState.currentUser = data.user;
            
            // 자동으로 그룹 목록 불러오기
            setTimeout(() => {
                loadTelegramGroups();
            }, 800);
        } else {
            showConnectionStatus(data.error || '2FA 인증 실패', 'error');
        }
    } catch (error) {
        showConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

async function testTelegramConnection() {
    showConnectionStatus('연결 테스트 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/test-connection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: appState.currentPhone || elements.expertPhoneInput.value
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.connected) {
            showConnectionStatus(`연결됨 - ${data.user.first_name} (${data.user.username || data.user.phone})`, 'success');
        } else {
            showConnectionStatus('연결되지 않음', 'error');
        }
    } catch (error) {
        showConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

async function loadTelegramGroups() {
    showConnectionStatus('그룹 목록을 불러오는 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/get-groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: appState.currentPhone || elements.expertPhoneInput.value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showConnectionStatus(`${data.groups.length}개의 그룹을 찾았습니다`, 'success');
            displayGroups(data.groups);
            document.querySelector('.group-selection').style.display = 'block';
        } else {
            showConnectionStatus(data.error || '그룹 목록을 가져올 수 없습니다', 'error');
        }
    } catch (error) {
        showConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

function displayGroups(groups) {
    elements.availableGroups.innerHTML = '';
    
    groups.forEach(group => {
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        groupItem.innerHTML = `
            <input type="checkbox" id="group-${group.id}" value="${group.id}">
            <label for="group-${group.id}">
                <div class="group-info">
                    <div class="group-name">${group.title}</div>
                    <div class="group-members">참여자: ${group.participants_count}명</div>
                </div>
            </label>
        `;
        elements.availableGroups.appendChild(groupItem);
    });
}

function showConnectionStatus(message, type) {
    elements.connectionStatus.textContent = message;
    elements.connectionStatus.className = `connection-status ${type}`;
}

// 선택된 그룹 저장
function saveSelectedGroups() {
    const selectedGroups = [];
    document.querySelectorAll('#availableGroups input[type="checkbox"]:checked').forEach(checkbox => {
        const groupId = checkbox.value;
        const groupLabel = checkbox.nextElementSibling;
        const groupName = groupLabel.querySelector('.group-name').textContent;
        selectedGroups.push({ id: groupId, name: groupName });
    });
    
    // 그룹이 선택되지 않아도 저장 가능
    if (selectedGroups.length === 0) {
        console.log('그룹이 선택되지 않았지만 저장을 진행합니다.');
    }
    
    // 그룹 정보 저장
    appState.currentPhone = elements.expertPhoneInput.value;
    appState.selectedGroups = selectedGroups;
    
    // 전문가 API 정보 저장
    const newExpertApi = {
        phone: appState.currentPhone,
        user: appState.currentUser,
        selectedGroups: selectedGroups,
        active: true,
        enabled: true  // 개별 토글용 필드 추가
    };
    
    // 🔥 안전한 전문가 계정 추가 (화력 계정 차단)
    safeAddToExpertRooms(newExpertApi);
    
    // 모달 닫기
    elements.expertApiModal.classList.remove('active');
    
    // UI 업데이트
    showConnectionStatus(`${selectedGroups.length}개 그룹 선택됨`, 'success');
    renderExpertRooms(); // 전문가 섹션 UI 새로고침
    saveToLocalStorage();
}

// 그룹 데이터 정규화 함수 (name/title 속성 일관성 보장)
function normalizeGroupData(groups, preserveActiveState = true) {
    return groups.map(group => ({
        id: group.id,
        title: group.title || group.name || '그룹명 없음',
        name: group.name || group.title || '그룹명 없음',
        active: group.active !== undefined ? group.active : (preserveActiveState ? true : false)  // 데이터 마이그레이션시에는 기존 상태가 없으면 true(이전에 선택되었던 것으로 간주), 새 그룹은 false
    }));
}

// 기존 데이터 마이그레이션 (name/title 속성 누락 수정)
function migrateExistingGroupData() {
    console.log('🔄 기존 그룹 데이터 마이그레이션 시작...');
    
    let migrationCount = 0;
    
    // 전문가 계정들 마이그레이션
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((room, index) => {
            if (room.selectedGroups && room.selectedGroups.length > 0) {
                const originalCount = room.selectedGroups.length;
                room.selectedGroups = normalizeGroupData(room.selectedGroups, true); // 기존 상태 보존
                console.log(`✅ 전문가 ${index} 그룹 데이터 정규화: ${originalCount}개`);
                migrationCount++;
            }
        });
    }
    
    // 화력 계정들 마이그레이션
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const firepowerData = appState.rooms.firepower[firepower];
        if (firepowerData && firepowerData[0] && firepowerData[0].selectedGroups) {
            const room = firepowerData[0];
            const originalCount = room.selectedGroups.length;
            room.selectedGroups = normalizeGroupData(room.selectedGroups, true); // 기존 상태 보존
            console.log(`✅ 화력 ${firepower} 그룹 데이터 정규화: ${originalCount}개`);
            migrationCount++;
        }
    });
    
    if (migrationCount > 0) {
        console.log(`🎉 마이그레이션 완료: ${migrationCount}개 계정의 그룹 데이터 정규화`);
        saveToLocalStorage(); // 정규화된 데이터 저장
    } else {
        console.log('✅ 마이그레이션 불필요: 모든 데이터가 이미 정규화됨');
    }
}

// 화력별 그룹 불러오기 (인텔리전트 동기화 적용)
async function loadGroupsForFirepower(firepower) {
    const room = appState.rooms.firepower[firepower]?.[0];
    
    if (!room || !room.phone) {
        return;
    }
    
    try {
        console.log(`🔄 화력 ${firepower} 그룹 새로고침 시작: ${room.phone}`);
        
        const response = await fetch(`${API_BASE_URL}/get-groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: room.phone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`📊 화력 ${firepower} 그룹 동기화 분석: ${room.phone} - ${data.groups.length}개 그룹 발견`);
            console.log(`🔍 서버에서 받은 원본 그룹 데이터 (처음 3개):`, data.groups.slice(0, 3));
            
            // 최초 로드인 경우 (선택된 그룹이 없음)
            if (!room.selectedGroups || room.selectedGroups.length === 0) {
                // 서버에서 받은 그룹 데이터 정규화
                const normalizedGroups = normalizeGroupData(data.groups, false);
                room.selectedGroups = normalizedGroups;
                room.availableGroups = data.groups;
                console.log(`🆕 화력 ${firepower} 최초 로드: ${data.groups.length}개 그룹 모두 선택`);
            } else {
                // 기존 데이터가 있는 경우 인텔리전트 동기화 실행
                const syncResult = await intelligentGroupSync(room, data.groups, room.phone, 'firepower', firepower);
                
                // 결과 적용
                room.selectedGroups = syncResult.selectedGroups;
                room.availableGroups = data.groups;
                
                // 변경사항 로깅 및 사용자 알림
                if (syncResult.removedGroups.length > 0) {
                    console.log(`🗑️ 화력 ${firepower} 탈퇴 그룹 자동 제거:`, syncResult.removedGroups.map(g => g.name));
                    showSyncStatusMessage(`${syncResult.removedGroups.length}개 탈퇴 그룹 제거됨`, 'warning');
                }
                if (syncResult.newGroups.length > 0) {
                    console.log(`🆕 화력 ${firepower} 신규 그룹 발견:`, syncResult.newGroups.map(g => g.title));
                    showNewGroupsNotification(syncResult.newGroups, room.phone, 'firepower', firepower);
                    showSyncStatusMessage(`${syncResult.newGroups.length}개 신규 그룹 발견`, 'info');
                }
                
                console.log(`✅ 화력 ${firepower} 동기화 완료: ${syncResult.selectedGroups.length}개 그룹 유지`);
                showSyncStatusMessage(`동기화 완료: ${syncResult.selectedGroups.length}개 그룹 유지`, 'success');
            }
            
            renderFirepowerRooms(firepower);
            renderFirepowerAccountsList(); // 화력 리스트 업데이트
            saveToLocalStorage();
        }
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// 화력별 그룹 선택 모달 표시
function showFirepowerGroupSelectionModal(groups, firepower) {
    // 현재 화력의 선택된 그룹들
    const room = appState.rooms.firepower[firepower]?.[0];
    const selectedGroups = room?.selectedGroups || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'firepowerGroupModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>화력 ${firepower} - 그룹 선택</h3>
            <div class="available-groups">
                ${groups.map(group => `
                    <div class="group-item">
                        <input type="checkbox" id="fp-group-${group.id}" value="${group.id}" 
                            ${selectedGroups.some(g => g.id === group.id) ? 'checked' : ''}>
                        <label for="fp-group-${group.id}">
                            <div class="group-info">
                                <div class="group-name">${group.title}</div>
                            </div>
                        </label>
                    </div>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button onclick="saveFirepowerGroups(${firepower})">저장</button>
                <button onclick="closeFirepowerModal()">취소</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 화력별 그룹 저장 (여러 개)
function saveFirepowerGroups(firepower) {
    const selectedCheckboxes = document.querySelectorAll('#firepowerGroupModal input[type="checkbox"]:checked');
    
    // 그룹이 선택되지 않아도 저장 가능
    if (selectedCheckboxes.length === 0) {
        console.log('화력별 그룹이 선택되지 않았지만 저장을 진행합니다.');
    }
    
    // 선택된 그룹 정보 수집
    const selectedGroups = [];
    selectedCheckboxes.forEach(checkbox => {
        const groupLabel = document.querySelector(`label[for="${checkbox.id}"]`);
        const groupName = groupLabel ? groupLabel.querySelector('.group-name').textContent : '알 수 없음';
        selectedGroups.push({
            id: checkbox.value,
            name: groupName,
            active: true // 기본값은 활성화
        });
    });
    
    // 화력별 방 정보 업데이트
    if (!appState.rooms.firepower[firepower]) {
        appState.rooms.firepower[firepower] = [{
            id: `firepower-${firepower}-main`,
            name: `화력 ${firepower} 메인 그룹`,
            participants: 0,
            active: false
        }];
    }
    
    const firepowerData = appState.rooms.firepower[firepower];
    if (!firepowerData || !firepowerData[0]) return;
    const room = firepowerData[0];
    room.selectedGroups = selectedGroups;
    room.active = true;
    
    // UI 업데이트
    renderFirepowerRooms(firepower);
    saveToLocalStorage();
    
    // 모달 닫기
    closeFirepowerModal();
}

// 화력별 모달 닫기
function closeFirepowerModal() {
    const modal = document.getElementById('firepowerGroupModal');
    if (modal) {
        modal.remove();
    }
}

// 화력별 그룹 활성화/비활성화 토글
function toggleGroupInFirepower(firepower, groupIndex) {
    const room = appState.rooms.firepower[firepower]?.[0];
    if (!room || !room.selectedGroups) return;
    
    const group = room.selectedGroups[groupIndex];
    // active 속성이 없으면 기본값은 true
    if (group.active === undefined) {
        group.active = true;
    }
    
    // 토글
    group.active = !group.active;
    
    // 체크된 그룹 수 업데이트
    const activeGroups = room.selectedGroups.filter(g => g.active !== false);
    const groupCountSpan = document.getElementById('firepowerGroupCount');
    if (groupCountSpan) {
        groupCountSpan.textContent = activeGroups.length;
    }
    
    // 전체 선택된 그룹 수 업데이트
    updateSelectedGroupCount();
    
    saveToLocalStorage();
}

// 화력별 API 모달 표시
function showFirepowerApiModal(firepower) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'firepowerApiModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>화력 ${firepower} - 텔레그램 User API 연결</h3>
            <input type="tel" id="firepowerPhoneInput" placeholder="전화번호 (예: +1234567890, +821012345678)">
            <button id="firepowerConnectBtn" class="btn-connect-api">연결하기</button>
            <button id="firepowerAppAuthBtn" class="btn-app-auth">앱으로 인증</button>
            
            <div id="firepowerVerificationSection" style="display: none;">
                <h4>인증 코드 입력</h4>
                <input type="text" id="firepowerVerificationCode" placeholder="텔레그램으로 받은 인증 코드">
                <button id="firepowerVerifyBtn">확인</button>
            </div>
            
            <div id="firepowerConnectionStatus" class="connection-status"></div>
            
            <div class="modal-actions">
                <button onclick="closeFirepowerApiModal()">닫기</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 이벤트 리스너 설정
    const connectBtn = modal.querySelector('#firepowerConnectBtn');
    const appAuthBtn = modal.querySelector('#firepowerAppAuthBtn');
    const verifyBtn = modal.querySelector('#firepowerVerifyBtn');
    
    connectBtn.onclick = () => connectFirepowerAPI(firepower);
    appAuthBtn.onclick = () => requestAppAuth(firepower);
    verifyBtn.onclick = () => verifyFirepowerCode(firepower);
}

// 전문가 앱으로 인증 요청
async function requestExpertAppAuth() {
    const phone = elements.expertPhoneInput.value.trim();
    
    if (!phone) {
        showConnectionStatus('전화번호를 입력해주세요', 'error');
        return;
    }
    
    showConnectionStatus('텔레그램 앱으로 인증코드 요청 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/app-auth-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            elements.verificationSection.style.display = 'block';
            showConnectionStatus('텔레그램 앱을 확인하세요', 'success');
        } else {
            showConnectionStatus(data.error || '인증 요청 실패', 'error');
        }
    } catch (error) {
        console.error('Expert app auth request error:', error);
        showConnectionStatus('요청 중 오류가 발생했습니다', 'error');
    }
}

// 앱으로 인증 요청
async function requestAppAuth(firepower) {
    const phone = document.getElementById('firepowerPhoneInput').value.trim();
    
    if (!phone) {
        showFirepowerConnectionStatus('전화번호를 입력해주세요', 'error');
        return;
    }
    
    showFirepowerConnectionStatus('텔레그램 앱으로 인증코드 요청 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/app-auth-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('firepowerVerificationSection').style.display = 'block';
            showFirepowerConnectionStatus('텔레그램 앱을 확인하세요', 'success');
            
            // 임시로 전화번호 저장
            if (!appState.tempFirepowerData) appState.tempFirepowerData = {};
            appState.tempFirepowerData[firepower] = { phone };
        } else {
            showFirepowerConnectionStatus(data.error || '인증 요청 실패', 'error');
        }
    } catch (error) {
        console.error('App auth request error:', error);
        showFirepowerConnectionStatus('요청 중 오류가 발생했습니다', 'error');
    }
}

// 화력별 API 모달 닫기
function closeFirepowerApiModal() {
    const modal = document.getElementById('firepowerApiModal');
    if (modal) {
        modal.remove();
    }
}

// 화력별 API 연결
async function connectFirepowerAPI(firepower) {
    const phoneInput = document.getElementById('firepowerPhoneInput');
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showFirepowerConnectionStatus('전화번호를 입력해주세요', 'error');
        return;
    }
    
    // 이미 다른 화력에서 동일한 번호로 연결되어 있는지 확인
    let existingFirepower = null;
    for (let i = 1; i <= 30; i++) {
        const room = appState.rooms.firepower[i]?.[0];
        if (room && room.phone === phone) {
            existingFirepower = i;
            break;
        }
    }
    
    if (existingFirepower && existingFirepower !== firepower) {
        if (confirm(`이 번호는 이미 화력 ${existingFirepower}에 연결되어 있습니다.\n화력 ${firepower}에도 동일한 계정을 사용하시겠습니까?`)) {
            // 기존 연결 정보 복사
            const existingFirepowerData = appState.rooms.firepower[existingFirepower];
            const currentFirepowerData = appState.rooms.firepower[firepower];
            if (!existingFirepowerData || !existingFirepowerData[0] || !currentFirepowerData || !currentFirepowerData[0]) return;
            
            const existingRoom = existingFirepowerData[0];
            const room = currentFirepowerData[0];
            room.phone = existingRoom.phone;
            room.user = existingRoom.user;
            room.active = true;
            
            showFirepowerConnectionStatus('연결 완료!', 'success');
            setTimeout(() => {
                closeFirepowerApiModal();
                renderFirepowerRooms(firepower);
                saveToLocalStorage();
            }, 1000);
            return;
        } else {
            return;
        }
    }
    
    showFirepowerConnectionStatus('연결 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.require_code) {
                document.getElementById('firepowerVerificationSection').style.display = 'block';
                showFirepowerConnectionStatus('인증 코드가 전송되었습니다.', 'info');
                
                // 임시로 전화번호 저장
                if (!appState.tempFirepowerData) appState.tempFirepowerData = {};
                appState.tempFirepowerData[firepower] = { phone };
            } else if (data.already_authorized) {
                // 이미 로그인된 경우
                const firepowerData = appState.rooms.firepower[firepower];
                if (!firepowerData || !firepowerData[0]) return;
                const room = firepowerData[0];
                room.phone = phone;
                room.user = data.user;
                room.active = true;
                
                showFirepowerConnectionStatus('연결 완료!', 'success');
                setTimeout(() => {
                    closeFirepowerApiModal();
                    renderFirepowerRooms(firepower);
                    saveToLocalStorage();
                    // 자동으로 그룹 목록 불러오기
                    loadGroupsForFirepower(firepower);
                }, 1000);
            }
        } else {
            showFirepowerConnectionStatus(data.error || '연결 실패', 'error');
        }
    } catch (error) {
        showFirepowerConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

// 화력별 인증 코드 확인
async function verifyFirepowerCode(firepower) {
    const codeInput = document.getElementById('firepowerVerificationCode');
    const code = codeInput.value.trim();
    
    if (!code) {
        showFirepowerConnectionStatus('인증 코드를 입력해주세요', 'error');
        return;
    }
    
    const phone = appState.tempFirepowerData?.[firepower]?.phone;
    if (!phone) {
        showFirepowerConnectionStatus('전화번호 정보가 없습니다', 'error');
        return;
    }
    
    showFirepowerConnectionStatus('인증 확인 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 화력별 정보 저장
            const firepowerData = appState.rooms.firepower[firepower];
        } else if (data.require_password) {
            // 2FA 비밀번호 필요
            showFirepowerConnectionStatus(data.message, 'info');
            showFirepowerPasswordSection(firepower);
            return;
        } else {
            showFirepowerConnectionStatus(`인증 실패: ${data.error}`, 'error');
            return;
        }
        
        // 성공 시 처리
        if (!firepowerData || !firepowerData[0]) return;
        const room = firepowerData[0];
        room.phone = phone;
        room.user = data.user;
        room.active = true;
        
        showFirepowerConnectionStatus(`연결 성공! ${data.user.first_name}`, 'success');
        
        // 임시 데이터 삭제
        delete appState.tempFirepowerData[firepower];
        
        setTimeout(() => {
            closeFirepowerApiModal();
            renderFirepowerRooms(firepower);
            renderFirepowerAccountsList(); // 화력 리스트 업데이트
            saveToLocalStorage();
            // 자동으로 그룹 목록 불러오기
            loadGroupsForFirepower(firepower);
        }, 1000);
    } catch (error) {
        showFirepowerConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

// 화력별 연결 상태 표시
function showFirepowerConnectionStatus(message, type) {
    const statusDiv = document.getElementById('firepowerConnectionStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `connection-status ${type}`;
    }
}

// 화력별 API 변경
function changeFirepowerApi(firepower) {
    const room = appState.rooms.firepower[firepower]?.[0];
    if (!room || !room.phone) {
        alert('변경할 API가 없습니다.');
        return;
    }
    
    if (confirm(`현재 연결된 계정(${room.user?.first_name || room.phone})을 변경하시겠습니까?`)) {
        // 기존 정보 삭제하고 새로 등록
        room.phone = null;
        room.user = null;
        room.selectedGroups = [];
        room.active = false;
        
        saveToLocalStorage();
        renderFirepowerRooms(firepower);
        
        // 새 API 등록 모달 표시
        setTimeout(() => {
            showFirepowerApiModal(firepower);
        }, 100);
    }
}

// 화력별 API 삭제
async function deleteFirepowerApi(firepower) {
    const room = appState.rooms.firepower[firepower]?.[0];
    if (!room || !room.phone) {
        alert('삭제할 API가 없습니다.');
        return;
    }
    
    if (confirm(`화력 ${firepower}의 API 연결을 삭제하시겠습니까?\n연결된 계정: ${room.user?.first_name || room.phone}\n\n⚠️ 서버에서도 완전히 삭제됩니다.`)) {
        try {
            // 서버에서 API 삭제
            const response = await fetch('/api/delete-user-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: room.phone })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 로컬 정보 삭제
                room.phone = null;
                room.user = null;
                room.selectedGroups = [];
                room.active = false;
                
                saveToLocalStorage();
                renderFirepowerRooms(firepower);
                updateFirepowerCounts();
                
                console.log(`✅ 화력 ${firepower} API 완전 삭제 완료:`, result);
                alert(`화력 ${firepower} API가 서버에서 완전히 삭제되었습니다.\n삭제된 세션 파일: ${result.removed_files?.length || 0}개`);
            } else {
                console.error('❌ API 삭제 실패:', result.error);
                alert(`API 삭제 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ API 삭제 요청 오류:', error);
            alert(`API 삭제 요청 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}

// 화력용 2FA 비밀번호 섹션 표시
function showFirepowerPasswordSection(firepower) {
    const verificationSection = document.getElementById('firepowerVerificationSection');
    if (!verificationSection) return;
    
    const passwordSection = document.createElement('div');
    passwordSection.id = 'firepowerPasswordSection';
    passwordSection.innerHTML = `
        <div style="margin-top: 15px;">
            <input type="password" id="firepowerPassword" placeholder="2단계 인증 비밀번호" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <button id="verifyFirepowerPasswordBtn" class="btn-connect-api" style="width: 100%;">비밀번호 확인</button>
        </div>
    `;
    
    // 기존 passwordSection 제거 후 추가
    const existing = document.getElementById('firepowerPasswordSection');
    if (existing) existing.remove();
    
    verificationSection.appendChild(passwordSection);
    
    // 비밀번호 확인 버튼 이벤트
    document.getElementById('verifyFirepowerPasswordBtn').addEventListener('click', () => verifyFirepowerPassword(firepower));
    
    // 엔터키 지원
    document.getElementById('firepowerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyFirepowerPassword(firepower);
        }
    });
}

// 화력용 2FA 비밀번호 확인
async function verifyFirepowerPassword(firepower) {
    const password = document.getElementById('firepowerPassword')?.value.trim();
    
    if (!password) {
        showFirepowerConnectionStatus('비밀번호를 입력해주세요', 'error');
        return;
    }
    
    const phone = appState.tempFirepowerData?.[firepower]?.phone;
    if (!phone) {
        showFirepowerConnectionStatus('전화번호 정보가 없습니다', 'error');
        return;
    }
    
    showFirepowerConnectionStatus('2FA 인증 중...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 화력별 정보 저장
            const firepowerData = appState.rooms.firepower[firepower];
            if (!firepowerData || !firepowerData[0]) return;
            
            const room = firepowerData[0];
            room.phone = phone;
            room.user = data.user;
            room.active = true;
            
            showFirepowerConnectionStatus(`2FA 인증 성공! 사용자: ${data.user.first_name}`, 'success');
            
            // UI 정리 및 저장
            document.getElementById('firepowerPasswordSection')?.remove();
            saveToLocalStorage();
            renderFirepowerRooms(firepower);
            closeModal();
            updateFirepowerCounts();
            
            console.log(`✅ 화력 ${firepower} 2FA 인증 완료:`, data.user);
        } else {
            showFirepowerConnectionStatus(data.error || '2FA 인증 실패', 'error');
        }
    } catch (error) {
        showFirepowerConnectionStatus('서버 연결 오류: ' + error.message, 'error');
    }
}

// 방 찾기
function findRoomById(roomId) {
    for (const firepower in appState.rooms.firepower) {
        const room = appState.rooms.firepower[firepower].find(r => r.id === roomId);
        if (room) return room;
    }
    return null;
}

// 화력별 메시지 전송 - 템플릿 선택
function sendToRoom(roomId) {
    const room = findRoomById(roomId);
    if (!room || !room.groupId) {
        alert('그룹이 선택되지 않았습니다.');
        return;
    }
    
    // 템플릿 선택 모달 표시
    showTemplateSelectionModal(roomId);
}

// 템플릿 선택 모달
function showTemplateSelectionModal(roomId) {
    const templates = appState.templates || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'templateSelectionModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>메시지 템플릿 선택</h3>
            <div class="template-selection-list">
                ${templates.map((template, index) => {
                    if (!template) return '';
                    return `
                        <div class="template-item">
                            <input type="radio" name="template-select" id="template-${index}" value="${index}">
                            <label for="template-${index}">${template}</label>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="modal-actions">
                <button onclick="sendSelectedTemplate('${roomId}')">전송</button>
                <button onclick="closeTemplateModal()">취소</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 선택한 템플릿 전송
async function sendSelectedTemplate(roomId) {
    const selectedTemplate = document.querySelector('input[name="template-select"]:checked');
    if (!selectedTemplate) {
        alert('템플릿을 선택해주세요.');
        return;
    }
    
    const room = findRoomById(roomId);
    const templateIndex = parseInt(selectedTemplate.value);
    const message = appState.templates[templateIndex];
    
    if (!message) {
        alert('템플릿 내용이 없습니다.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: appState.currentPhone,
                group_ids: [room.groupId],
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('메시지가 전송되었습니다!');
            closeTemplateModal();
        } else {
            alert('전송 실패: ' + data.error);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('서버 연결 오류');
    }
}

// 템플릿 모달 닫기
function closeTemplateModal() {
    const modal = document.getElementById('templateSelectionModal');
    if (modal) {
        modal.remove();
    }
}

// 템플릿을 모든 화력의 그룹으로 전송
async function sendTemplateToFirepower(templateIndex) {
    const message = appState.templates[templateIndex];
    if (!message || message.trim() === '') {
        showTemplateError(templateIndex, '템플릿 내용이 없습니다');
        return;
    }
    
    // 모든 화력에서 API가 등록되고 그룹이 선택된 것들 수집
    const allTargets = [];
    
    for (let i = 1; i <= 30; i++) {
        const room = appState.rooms.firepower[i]?.[0];
        if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
            // 정확히 체크된(active: true) 그룹만 필터링
            const activeGroups = room.selectedGroups.filter(g => g.active === true);
            if (activeGroups.length > 0) {
                allTargets.push({
                    firepower: i,
                    phone: room.phone,
                    groups: activeGroups,
                    user: room.user
                });
            }
        }
    }
    
    if (allTargets.length === 0) {
        // 에러 메시지를 템플릿 옆에 표시
        showTemplateError(templateIndex, '전송할 그룹이 없습니다');
        return;
    }
    
    // 전송 대상 확인
    const totalGroups = allTargets.reduce((sum, target) => sum + target.groups.length, 0);
    const firepowerList = allTargets.map(t => `화력 ${t.firepower}`).join(', ');
    
    // 전송 상태 표시
    showSendingStatus('전송 중...');
    
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // 각 화력별로 전송
    for (const target of allTargets) {
        const groupIds = target.groups.map(g => g.id);
        
        try {
            const response = await fetch(`${API_BASE_URL}/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: target.phone,
                    group_ids: groupIds,
                    message: message
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                successCount += groupIds.length;
                results.push({
                    firepower: target.firepower,
                    success: true,
                    groupCount: groupIds.length
                });
            } else {
                failCount += groupIds.length;
                results.push({
                    firepower: target.firepower,
                    success: false,
                    error: data.error,
                    groupCount: groupIds.length
                });
            }
        } catch (error) {
            failCount += groupIds.length;
            results.push({
                firepower: target.firepower,
                success: false,
                error: error.message,
                groupCount: groupIds.length
            });
        }
        
        // 🔥 화력 전송에도 속도 딜레이 적용
        const currentSpeed = getCurrentMessageSpeed();
        console.log(`⚡ 화력 전송 속도 적용: ${currentSpeed}ms`);
        await new Promise(resolve => setTimeout(resolve, currentSpeed));
    }
    
    // 결과 표시
    hideSendingStatus();
    
    // 성공 메시지를 템플릿 옆에 표시
    showTemplateResult(templateIndex, successCount, failCount);
}

// 전송 상태 표시 함수
function showSendingStatus(message) {
    // 전송 중 오버레이 표시
    const overlay = document.createElement('div');
    overlay.id = 'sendingOverlay';
    overlay.className = 'sending-overlay';
    overlay.innerHTML = `
        <div class="sending-modal">
            <div class="sending-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

// 전송 상태 숨기기
function hideSendingStatus() {
    const overlay = document.getElementById('sendingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// 템플릿 전송 결과 표시
function showTemplateResult(templateIndex, successCount, failCount) {
    const templateItems = document.querySelectorAll('.template-item');
    const templateItem = templateItems[templateIndex];
    
    if (!templateItem) return;
    
    // 기존 결과 표시 제거
    const existingResult = templateItem.querySelector('.send-result');
    if (existingResult) {
        existingResult.remove();
    }
    
    // 새 결과 표시 추가
    const resultDiv = document.createElement('div');
    resultDiv.className = 'send-result';
    
    if (failCount === 0) {
        resultDiv.innerHTML = `<span class="success">✓ ${successCount}개 전송</span>`;
    } else {
        resultDiv.innerHTML = `<span class="partial">✓ ${successCount}개, ✗ ${failCount}개</span>`;
    }
    
    templateItem.appendChild(resultDiv);
    
    // 3초 후 자동으로 사라지게
    setTimeout(() => {
        resultDiv.style.opacity = '0';
        setTimeout(() => {
            resultDiv.remove();
        }, 300);
    }, 3000);
}

// 템플릿 에러 표시
function showTemplateError(templateIndex, errorMessage) {
    const templateItems = document.querySelectorAll('.template-item');
    const templateItem = templateItems[templateIndex];
    
    if (!templateItem) return;
    
    // 기존 결과 표시 제거
    const existingResult = templateItem.querySelector('.send-result');
    if (existingResult) {
        existingResult.remove();
    }
    
    // 에러 표시 추가
    const errorDiv = document.createElement('div');
    errorDiv.className = 'send-result';
    errorDiv.innerHTML = `<span class="error">✗ ${errorMessage}</span>`;
    
    templateItem.appendChild(errorDiv);
    
    // 3초 후 자동으로 사라지게
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 3000);
}

// 화력별 에러 표시
function showFirepowerError(firepower, errorMessage) {
    // 화력 섹션 내에 에러 메시지 표시
    const firepowerGroups = document.getElementById('firepowerGroups');
    if (!firepowerGroups) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'firepower-error';
    errorDiv.innerHTML = `<span>✗ ${errorMessage}</span>`;
    
    firepowerGroups.innerHTML = '';
    firepowerGroups.appendChild(errorDiv);
    
    // 3초 후 자동으로 사라지게
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 3000);
}

// ========== 자동 등록 시스템 ==========

const AUTO_SETUP_PHONES = [
    '+821077893897', // 화력1
    '+821057334084', // 화력2  
    '+821080406011', // 화력3
    '+821082019001', // 화력4
    '+821039622144', // 화력5
    '+821081724416', // 화력6
    '+821039040988', // 화력7
    '+821084095699', // 화력8
    '+821083554890', // 화력9
];

let autoSetupState = {
    active: false,
    currentFirepower: 8,
    currentPhone: '',
    maxFirepower: 9
};

// 화력 1-8번 자동 배치
async function startAutoSetup() {
    console.log('화력 1-8번 자동 배치 시작');
    
    try {
        // 먼저 서버에서 로그인된 계정 목록 가져오기 시도
        let loggedAccounts = [];
        
        try {
            const response = await Promise.race([
                fetch(`${API_BASE_URL}/get-logged-accounts`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.accounts && data.accounts.length > 0) {
                    loggedAccounts = data.accounts.filter(acc => acc.status === 'logged_in');
                    console.log(`서버에서 ${loggedAccounts.length}개 로그인된 계정 발견`);
                }
            }
        } catch (serverError) {
            console.log('서버 응답 실패, 기본 계정 목록 사용:', serverError.message);
        }
        
        // 서버에서 계정을 가져오지 못한 경우 처리
        if (loggedAccounts.length === 0) {
            console.log('⚠️ 서버에서 로그인된 계정을 가져올 수 없습니다. 화력 자동 배치를 건너뜁니다.');
            return;
        }
        
        console.log(`✅ 서버에서 ${loggedAccounts.length}개 계정 동적 로드 완료`);
        loggedAccounts.forEach((acc, i) => {
            console.log(`  ${i+1}. ${acc.user.first_name} (${acc.phone})`);
        });
        
        // 기존 화력 섹션 전체 초기화 (1-30번)
        for (let i = 1; i <= 30; i++) {
            appState.rooms.firepower[i] = null;
        }
        
        let assignedCount = 0;
        
        // 각 계정을 1-30번 화력에 순서대로 배치
        for (let i = 0; i < Math.min(loggedAccounts.length, 30); i++) {
            const account = loggedAccounts[i];
            const firepowerNumber = i + 1;
            
            console.log(`${account.phone}을 화력 ${firepowerNumber}번에 배치`);
            
            // 그룹 정보 가져오기
            try {
                const groupResponse = await fetch(`${API_BASE_URL}/get-groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: account.phone
                    })
                });
                const groupData = await groupResponse.json();
                
                const groups = groupData.success ? groupData.groups : [];
                
                // 화력 섹션에 배치
                appState.rooms.firepower[firepowerNumber] = [{
                    phone: account.phone,
                    user: account.user,
                    groups: groups,
                    selectedGroups: groups.map(group => ({
                        id: group.id,
                        name: group.title,
                        title: group.title,
                        active: false
                    })),
                    active: true
                }];
                
                // 마스터 계정 목록에 추가
                addToMasterAccountList({
                    phone: account.phone,
                    user: account.user,
                    groups: groups,
                    addedAt: Date.now()
                });
                
                // 화력으로 설정
                setAccountTypeInApiConfig(account.phone, 'firepower');
                
                assignedCount++;
                
            } catch (groupError) {
                console.error(`${account.phone} 그룹 로드 실패:`, groupError);
                
                // 그룹 없이도 배치
                appState.rooms.firepower[firepowerNumber] = [{
                    phone: account.phone,
                    user: account.user,
                    groups: [],
                    selectedGroups: [],
                    active: true
                }];
                
                addToMasterAccountList({
                    phone: account.phone,
                    user: account.user,
                    groups: [],
                    addedAt: Date.now()
                });
                
                setAccountTypeInApiConfig(account.phone, 'firepower');
                assignedCount++;
            }
        }
        
        // UI 업데이트
        renderFirepowerAccountsList();
        renderFirepowerRooms(appState.activeFirepower);
        updateSelectedGroupCount();
        saveToLocalStorage();
        
        console.log(`화력 자동 배치 완료: ${assignedCount}개 계정이 1-${assignedCount}번 화력에 배치됨`);
        
    } catch (error) {
        console.error('화력 자동 배치 실패:', error);
    }
}

// 다음 화력 처리
async function processNextFirepower() {
    if (autoSetupState.currentFirepower > autoSetupState.maxFirepower) {
        // 완료 - 데이터 저장 확실히 하기
        autoSetupState.active = false;
        elements.autoSetupBtn.textContent = '✅ 자동 등록 완료!';
        elements.autoSetupBtn.style.backgroundColor = '#4caf50';
        
        // 모든 데이터 저장
        saveToLocalStorage();
        
        setTimeout(() => {
            elements.autoSetupBtn.textContent = '🚀 화력 1-7 자동 등록';
            elements.autoSetupBtn.style.backgroundColor = '#ff6b35';
            elements.autoSetupBtn.disabled = false;
        }, 3000);
        
        alert('화력 8-9까지 자동 등록이 완료되었습니다!');
        return;
    }
    
    const firepower = autoSetupState.currentFirepower;
    
    // 이미 등록된 화력인지 확인
    const room = appState.rooms.firepower[firepower]?.[0];
    if (room && room.phone && room.active) {
        console.log(`화력 ${firepower}는 이미 등록됨 (${room.phone}) - 자동 패스`);
        
        // 이미 등록된 화력으로 이동
        switchFirepower(firepower);
        
        // 스킵 알림 표시
        showAutoSkipModal(firepower, room.phone, room.user?.first_name || '알 수 없음');
        
        // 1초 후 다음 화력으로
        setTimeout(() => {
            autoSetupState.currentFirepower++;
            processNextFirepower();
        }, 1500);
        return;
    }
    
    const phone = AUTO_SETUP_PHONES[firepower - 1];
    autoSetupState.currentPhone = phone;
    
    // 해당 화력으로 이동
    switchFirepower(firepower);
    
    // 자동으로 API 연결 시작
    showAutoSetupModal(firepower, phone);
}

// 자동 스킵 모달 표시
function showAutoSkipModal(firepower, phone, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'autoSkipModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✅ 화력 ${firepower} 이미 등록됨</h3>
            <p><strong>전화번호:</strong> ${phone}</p>
            <p><strong>사용자:</strong> ${userName}</p>
            <div class="connection-status success">이미 등록된 화력입니다. 자동으로 건너뜁니다.</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 1.5초 후 자동으로 모달 닫기
    setTimeout(() => {
        modal.remove();
    }, 1500);
}

// 자동 등록 모달 표시
function showAutoSetupModal(firepower, phone) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'autoSetupModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>🚀 화력 ${firepower} 자동 등록</h3>
            <p><strong>전화번호:</strong> ${phone}</p>
            <div id="autoSetupStatus" class="connection-status info">연결 중...</div>
            
            <div id="autoVerificationSection" style="display: none;">
                <h4>인증 코드 입력</h4>
                <input type="text" id="autoVerificationCode" placeholder="텔레그램으로 받은 인증 코드">
                <button id="autoVerifyBtn" class="btn-connect-api">확인</button>
            </div>
            
            <div class="modal-actions">
                <button id="autoSkipBtn" style="background-color: #ffc107; color: #212529; flex: 1; height: 45px; border: none; cursor: pointer;">건너뛰기</button>
                <button id="autoCancelBtn" style="background-color: #f44336; color: white; flex: 1; height: 45px; border: none; cursor: pointer;">취소</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 이벤트 리스너
    document.getElementById('autoVerifyBtn').addEventListener('click', autoVerifyCode);
    document.getElementById('autoSkipBtn').addEventListener('click', autoSkipCurrent);
    document.getElementById('autoCancelBtn').addEventListener('click', autoCancelSetup);
    
    // 자동으로 연결 시도
    setTimeout(() => autoConnectPhone(phone), 500);
}

// 자동 연결
async function autoConnectPhone(phone) {
    try {
        const response = await fetch(`${API_BASE_URL}/connect`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.require_code) {
                document.getElementById('autoSetupStatus').textContent = `인증 코드가 ${phone}로 전송되었습니다.`;
                document.getElementById('autoSetupStatus').className = 'connection-status info';
                document.getElementById('autoVerificationSection').style.display = 'block';
            } else {
                document.getElementById('autoSetupStatus').textContent = '이미 로그인되어 있습니다.';
                document.getElementById('autoSetupStatus').className = 'connection-status success';
                setTimeout(() => autoCompleteFirepower(data.user), 1000);
            }
        } else {
            document.getElementById('autoSetupStatus').textContent = `연결 실패: ${data.error}`;
            document.getElementById('autoSetupStatus').className = 'connection-status error';
        }
    } catch (error) {
        document.getElementById('autoSetupStatus').textContent = `연결 오류: ${error.message}`;
        document.getElementById('autoSetupStatus').className = 'connection-status error';
    }
}

// 자동 인증 코드 확인
async function autoVerifyCode() {
    const code = document.getElementById('autoVerificationCode').value.trim();
    
    if (!code) {
        alert('인증 코드를 입력해주세요.');
        return;
    }
    
    document.getElementById('autoSetupStatus').textContent = '인증 확인 중...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: autoSetupState.currentPhone, code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('autoSetupStatus').textContent = '인증 성공!';
            document.getElementById('autoSetupStatus').className = 'connection-status success';
            autoCompleteFirepower(data.user);
        } else {
            document.getElementById('autoSetupStatus').textContent = `인증 실패: ${data.error}`;
            document.getElementById('autoSetupStatus').className = 'connection-status error';
        }
    } catch (error) {
        document.getElementById('autoSetupStatus').textContent = `인증 오류: ${error.message}`;
        document.getElementById('autoSetupStatus').className = 'connection-status error';
    }
}

// 화력 완료 처리
async function autoCompleteFirepower(user) {
    const firepower = autoSetupState.currentFirepower;
    const phone = autoSetupState.currentPhone;
    
    // 화력별 정보 저장
    if (!appState.rooms.firepower[firepower]) {
        appState.rooms.firepower[firepower] = [{}];
    }
    
    const firepowerData = appState.rooms.firepower[firepower];
    if (!firepowerData || !firepowerData[0]) return;
    const room = firepowerData[0];
    room.phone = phone;
    room.user = user;
    room.active = true;
    room.selectedGroups = [];
    
    saveToLocalStorage();
    renderFirepowerAccountsList(); // 화력 리스트 업데이트
    
    document.getElementById('autoSetupStatus').textContent = '그룹 목록 불러오는 중...';
    
    // 그룹 자동 로드
    setTimeout(async () => {
        await loadGroupsForFirepower(firepower);
        renderFirepowerRooms(firepower);
        renderFirepowerAccountsList(); // 화력 리스트 업데이트
        
        // 모달 닫기
        document.getElementById('autoSetupModal').remove();
        
        // 다음 화력으로
        autoSetupState.currentFirepower++;
        setTimeout(() => processNextFirepower(), 1000);
    }, 1000);
}

// 현재 화력 건너뛰기
function autoSkipCurrent() {
    document.getElementById('autoSetupModal').remove();
    autoSetupState.currentFirepower++;
    setTimeout(() => processNextFirepower(), 500);
}

// 자동 등록 취소
function autoCancelSetup() {
    autoSetupState.active = false;
    document.getElementById('autoSetupModal').remove();
    
    elements.autoSetupBtn.textContent = '🚀 화력 1-7 자동 등록';
    elements.autoSetupBtn.style.backgroundColor = '#ff6b35';
    elements.autoSetupBtn.disabled = false;
}

// 수익인증 관련 함수들
let profitImages = [];

// 수익인증 모달 표시
async function showProfitVerificationModal(btnNumber, capacity) {
    // 클립보드 매니저에서 해당 용량의 이미지를 자동으로 가져와서 전송
    try {
        // 텍스트 메시지 제거 - 바로 이미지만 전송
        
        // 클립보드 매니저에서 이미지 가져오기
        const images = await getImagesFromClipboardManager(capacity);
        
        if (images && images.length > 0) {
            // 자동으로 수익인증 전송 (각 계정마다 랜덤 이미지)
            await sendProfitVerificationAuto(capacity);
        } else {
            showErrorMessage(`${capacity}용량 섹션에 이미지가 없습니다. 클립보드 매니저를 확인해주세요.`);
        }
    } catch (error) {
        console.error('Profit verification error:', error);
        showErrorMessage('수익인증 전송 중 오류가 발생했습니다.');
    }
}

// 세션 레벨 이미지 순서 관리 함수들
function initializeImageSessionForCapacity(capacity, images) {
    const session = appState.profitImageSession;
    
    // 이미 이 용량에 대해 셔플된 순서가 있는지 확인
    if (!session.shuffledImagesByCapacity[capacity] || session.shuffledImagesByCapacity[capacity].length !== images.length) {
        // 새로 셔플하기
        console.log(`🎲 용량 ${capacity}: 새로운 이미지 순서 생성 (${images.length}개 이미지)`);
        
        // Fisher-Yates 셔플 알고리즘
        const shuffled = [...images];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        session.shuffledImagesByCapacity[capacity] = shuffled;
        session.usedImageIndices[capacity] = 0; // 사용 인덱스 초기화
        session.sessionStartTime = Date.now();
        
        console.log(`✅ 용량 ${capacity}: 이미지 순서 초기화 완료`);
    } else {
        console.log(`🔄 용량 ${capacity}: 기존 이미지 순서 유지 (사용된 개수: ${session.usedImageIndices[capacity]})`);
    }
}

function getNextUniqueImageForCapacity(capacity) {
    const session = appState.profitImageSession;
    const shuffledImages = session.shuffledImagesByCapacity[capacity];
    const currentIndex = session.usedImageIndices[capacity];
    
    if (!shuffledImages || shuffledImages.length === 0) {
        console.error(`❌ 용량 ${capacity}에 대한 셔플된 이미지가 없습니다.`);
        return null;
    }
    
    // 순환: 모든 이미지를 사용했으면 다시 처음부터
    const imageIndex = currentIndex % shuffledImages.length;
    const selectedImage = shuffledImages[imageIndex];
    
    // 다음 사용을 위해 인덱스 증가
    session.usedImageIndices[capacity] = currentIndex + 1;
    
    console.log(`📷 용량 ${capacity}: ${imageIndex + 1}/${shuffledImages.length}번째 이미지 선택 (총 사용: ${session.usedImageIndices[capacity]}개)`);
    
    return {
        image: selectedImage,
        index: imageIndex,
        totalUsed: session.usedImageIndices[capacity]
    };
}

function resetImageSessionForCapacity(capacity) {
    const session = appState.profitImageSession;
    delete session.shuffledImagesByCapacity[capacity];
    delete session.usedImageIndices[capacity];
    console.log(`🔄 용량 ${capacity}: 이미지 세션 초기화`);
}

function resetAllImageSessions() {
    appState.profitImageSession = {
        shuffledImagesByCapacity: {},
        usedImageIndices: {},
        sessionStartTime: Date.now()
    };
    console.log(`🔄 모든 용량의 이미지 세션 초기화`);
}

// 메시지 전송 속도 관리 함수들
function loadMessageSpeed() {
    try {
        console.log(`🔍 [DEBUG] loadMessageSpeed() 호출 - 현재 appState.messageSpeed:`, appState.messageSpeed);
        const saved = localStorage.getItem('messageSpeed');
        console.log(`🔍 [DEBUG] localStorage에서 가져온 값: ${saved}`);
        
        if (saved) {
            const speed = parseInt(saved);
            console.log(`🔍 [DEBUG] 파싱된 속도 값: ${speed}`);
            
            if (speed >= 100 && speed <= 5000) {
                appState.messageSpeed.current = speed;
                console.log(`⚡ 저장된 메시지 속도 로드: ${speed}ms`);
                console.log(`🔍 [DEBUG] 로드 후 appState.messageSpeed:`, appState.messageSpeed);
            } else {
                console.log(`⚠️ [DEBUG] 속도 값이 범위를 벗어남 (100-5000ms): ${speed}ms`);
            }
        } else {
            console.log(`🔍 [DEBUG] localStorage에 저장된 속도 없음, 기본값 사용: ${appState.messageSpeed.current}ms`);
        }
    } catch (error) {
        console.error('속도 설정 로드 실패:', error);
    }
}

function saveMessageSpeed(speed) {
    try {
        console.log(`🔍 [DEBUG] saveMessageSpeed() 호출 - 저장할 속도: ${speed}ms`);
        console.log(`🔍 [DEBUG] 저장 전 appState.messageSpeed:`, appState.messageSpeed);
        
        localStorage.setItem('messageSpeed', speed.toString());
        appState.messageSpeed.current = speed;
        
        console.log(`⚡ 메시지 속도 저장: ${speed}ms`);
        console.log(`🔍 [DEBUG] 저장 후 appState.messageSpeed:`, appState.messageSpeed);
        console.log(`🔍 [DEBUG] localStorage 확인:`, localStorage.getItem('messageSpeed'));
        
        updateSpeedDisplay();
    } catch (error) {
        console.error('속도 설정 저장 실패:', error);
    }
}

function getCurrentMessageSpeed() {
    const speed = appState.messageSpeed.current;
    console.log(`🔍 [DEBUG] getCurrentMessageSpeed() 호출 - 현재 속도: ${speed}ms`);
    return speed;
}

function updateSpeedDisplay() {
    const current = getCurrentMessageSpeed();
    console.log(`🔍 [DEBUG] updateSpeedDisplay() 호출 - 현재 속도: ${current}ms`);
    
    const display = document.getElementById('currentSpeedDisplay');
    console.log(`🔍 [DEBUG] currentSpeedDisplay 요소:`, display);
    
    if (display) {
        const displayText = `${(current / 1000).toFixed(1)}초`;
        display.textContent = displayText;
        console.log(`🔍 [DEBUG] 화면 표시 텍스트 업데이트: ${displayText}`);
    } else {
        console.log(`⚠️ [DEBUG] currentSpeedDisplay 요소를 찾을 수 없음`);
    }
}

function formatSpeedText(ms) {
    return `${(ms / 1000).toFixed(1)}초`;
}

// 속도 설정 모달 관리
function showSpeedSettingsModal() {
    const modal = document.getElementById('speedSettingsModal');
    const currentInput = document.getElementById('customSpeedInput');
    const currentSpeed = getCurrentMessageSpeed();
    
    // 현재 속도로 입력값 설정
    if (currentInput) {
        currentInput.value = currentSpeed;
        updateSpeedPreview();
    }
    
    // 현재 속도에 맞는 프리셋 버튼 활성화
    updateActivePresetButton(currentSpeed);
    
    // 현재 속도 표시 업데이트
    updateSpeedDisplay();
    
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideSpeedSettingsModal() {
    const modal = document.getElementById('speedSettingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateActivePresetButton(speed) {
    // 모든 프리셋 버튼의 active 클래스 제거
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 현재 속도와 일치하는 버튼에 active 클래스 추가
    const matchingBtn = document.querySelector(`[data-speed="${speed}"]`);
    if (matchingBtn) {
        matchingBtn.classList.add('active');
    }
}

function updateSpeedPreview() {
    const input = document.getElementById('customSpeedInput');
    const preview = document.getElementById('speedPreview');
    
    if (input && preview) {
        const speed = parseInt(input.value) || 800;
        preview.textContent = `= ${formatSpeedText(speed)}`;
    }
}

// 클립보드 매니저에서 이미지 가져오기
async function getImagesFromClipboardManager(capacity) {
    try {
        // 클립보드 매니저의 저장 형식에 맞춰 데이터 가져오기
        const clipboardData = localStorage.getItem('clipboardImages');
        
        if (!clipboardData) {
            console.log('No clipboard data found');
            return [];
        }
        
        const allClipboardData = JSON.parse(clipboardData);
        const images = allClipboardData[capacity] || [];
        
        console.log(`Found ${images.length} images for capacity ${capacity}`);
        console.log('Available sections:', Object.keys(allClipboardData));
        
        return images;
        
    } catch (error) {
        console.error('Error getting clipboard images:', error);
        return [];
    }
}

// 자동 수익인증 전송
async function sendProfitVerificationAuto(capacity) {
    try {
        // 메시지 제거 - 조용히 전송
        
        // 전송 대상 계정들 수집
        const targetAccounts = [];
        
        // 전문가 계정은 수익인증에서 제외
        
        // 화력별 계정들 (활성 그룹만)
        for (const firepower of Object.keys(appState.rooms.firepower)) {
            const firepowerData = appState.rooms.firepower[firepower];
            if (!firepowerData || !firepowerData[0]) continue;
            
            const room = firepowerData[0];
            if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
                const activeGroups = room.selectedGroups.filter(g => g.active === true);
                if (activeGroups.length > 0) {
                    targetAccounts.push({
                        phone: room.phone,
                        groupIds: activeGroups.map(g => g.id),
                        type: 'firepower',
                        firepower: firepower
                    });
                }
            }
        }
        
        if (targetAccounts.length === 0) {
            showErrorMessage('전송할 수 있는 계정이 없습니다.');
            return;
        }
        
        // 각 계정에 전송 (각각 다른 랜덤 이미지)
        let successCount = 0;
        let totalCount = targetAccounts.length;
        
        // 모든 이미지 가져오기
        const allImages = await getImagesFromClipboardManager(capacity);
        
        if (allImages.length === 0) {
            showErrorMessage(`${capacity}용량 섹션에 이미지가 없습니다.`);
            return;
        }
        
        // 세션 레벨 중복 방지 시스템 초기화
        initializeImageSessionForCapacity(capacity, allImages);
        
        console.log(`🎯 용량 ${capacity}: 총 ${allImages.length}개 이미지, 계정 ${targetAccounts.length}개`);
        
        // 이미지가 계정 수보다 적으면 경고 메시지 출력
        if (allImages.length < targetAccounts.length) {
            console.warn(`⚠️ 이미지 ${allImages.length}개가 계정 ${targetAccounts.length}개보다 적습니다. 순환 사용됩니다.`);
        } else {
            console.log(`✅ 이미지 충분: ${allImages.length}개 ≥ 계정 ${targetAccounts.length}개 → 완전 중복 방지 가능`);
        }
        
        for (let i = 0; i < targetAccounts.length; i++) {
            const account = targetAccounts[i];
            try {
                // 세션에서 다음 고유 이미지 가져오기
                const imageData = getNextUniqueImageForCapacity(capacity);
                if (!imageData) {
                    console.error(`❌ 계정 ${account.phone}: 이미지 가져오기 실패`);
                    continue;
                }
                
                const { image: selectedImage, index: imageIndex, totalUsed } = imageData;
                
                console.log(`📱 [${i+1}/${targetAccounts.length}] ${account.phone}: 용량 ${capacity} 이미지 ${imageIndex + 1}번 선택`);
                console.log(`   └─ 화력: ${account.firepower}번, 총 사용된 이미지: ${totalUsed}개`);
                
                const response = await fetch(`${API_BASE_URL}/send-images`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: account.phone,
                        group_ids: account.groupIds,
                        message: '', // 텍스트 메시지 제거
                        images: [{
                            data: selectedImage.split(',')[1], // Base64 데이터만
                            type: 'image/png'
                        }]
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    successCount++;
                    console.log(`✅ 수익인증 전송 완료: ${account.phone} → 용량 ${capacity} 이미지 ${imageIndex + 1}번`);
                } else {
                    console.error(`❌ 전송 실패 ${account.phone}:`, result.error);
                }
            } catch (error) {
                console.error(`Error sending to ${account.phone}:`, error);
            }
            
            // 전송 간격 (동적 속도 적용)
            await new Promise(resolve => setTimeout(resolve, getCurrentMessageSpeed()));
        }
        
        // 전송 완료 메시지도 제거하여 완전히 조용히 전송
        console.log(`Profit verification completed: ${successCount}/${totalCount} accounts`);
        
    } catch (error) {
        console.error('Auto profit verification error:', error);
        showErrorMessage('수익인증 자동 전송 중 오류가 발생했습니다.');
    }
}

// 수익인증 모달 이벤트 설정 (한 번만 실행되도록)
let profitModalEventsSetup = false;

function setupProfitModalEvents() {
    if (profitModalEventsSetup) return;
    
    const imageInput = document.getElementById('profitImageInput');
    const uploadArea = document.getElementById('profitFileUploadArea');
    const sendBtn = document.getElementById('sendProfitBtn');
    const cancelBtn = document.getElementById('cancelProfitBtn');
    
    // 이미지 파일 선택
    imageInput.addEventListener('change', handleImageSelect);
    
    // 드래그 앤 드롭
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
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
    
    // 전송 버튼
    sendBtn.addEventListener('click', sendProfitVerification);
    
    // 취소 버튼
    cancelBtn.addEventListener('click', closeProfitModal);
    
    profitModalEventsSetup = true;
}

// 타겟 선택 이벤트 설정
function setupTargetSelectionEvents() {
    const targetRadios = document.querySelectorAll('input[name="profitTarget"]');
    
    targetRadios.forEach(radio => {
        radio.removeEventListener('change', handleTargetSelectionChange); // 중복 제거
        radio.addEventListener('change', handleTargetSelectionChange);
    });
}

// 이미지 선택 처리
function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// 파일 처리
function handleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (profitImages.length + imageFiles.length > 10) {
        alert('최대 10개의 이미지만 선택할 수 있습니다.');
        return;
    }
    
    imageFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            alert(`${file.name} 파일이 너무 큽니다. (최대 10MB)`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            profitImages.push({
                file: file,
                url: e.target.result,
                name: file.name
            });
            updateImagePreview();
        };
        reader.readAsDataURL(file);
    });
}

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const preview = document.getElementById('profitImagePreview');
    
    preview.innerHTML = profitImages.map((image, index) => `
        <div class="preview-item">
            <img src="${image.url}" alt="${image.name}" class="preview-image">
            <button type="button" class="remove-image" onclick="removeImage(${index})" title="이미지 제거">×</button>
        </div>
    `).join('');
    
    // 전송 버튼 활성화/비활성화
    const sendBtn = document.getElementById('sendProfitBtn');
    sendBtn.disabled = profitImages.length === 0;
}

// 이미지 제거
function removeImage(index) {
    profitImages.splice(index, 1);
    updateImagePreview();
}

// 타겟 선택 변경 처리
function handleTargetSelectionChange(e) {
    const selectedGroupsDiv = document.getElementById('profitSelectedGroups');
    
    if (e.target.value === 'select') {
        selectedGroupsDiv.style.display = 'block';
        loadSelectableGroups();
    } else {
        selectedGroupsDiv.style.display = 'none';
    }
}

// 선택 가능한 그룹 로드
function loadSelectableGroups() {
    const selectedGroupsDiv = document.getElementById('profitSelectedGroups');
    let allGroups = [];
    
    // 전문가 그룹 수집
    if (appState.rooms.expert) {
        appState.rooms.expert.forEach(room => {
            if (room.selectedGroups) {
                room.selectedGroups.forEach(group => {
                    allGroups.push({
                        id: group.id,
                        title: group.title || group.name,
                        phone: room.phone,
                        type: 'expert'
                    });
                });
            }
        });
    }
    
    // 화력 그룹 수집
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const firepowerData = appState.rooms.firepower[firepower];
        if (!firepowerData || !firepowerData[0]) return;
        const room = firepowerData[0];
        if (room && room.selectedGroups) {
            room.selectedGroups.forEach(group => {
                allGroups.push({
                    id: group.id,
                    title: group.title || group.name,
                    phone: room.phone,
                    type: `firepower-${firepower}`
                });
            });
        }
    });
    
    if (allGroups.length === 0) {
        selectedGroupsDiv.innerHTML = '<p>선택 가능한 그룹이 없습니다.</p>';
        return;
    }
    
    selectedGroupsDiv.innerHTML = `
        <h5>선택할 그룹들:</h5>
        <div class="group-checkbox-list">
            ${allGroups.map((group, index) => `
                <div class="group-checkbox-item">
                    <input type="checkbox" id="profitGroup${index}" value="${group.id}" data-phone="${group.phone}" data-type="${group.type}" checked>
                    <label for="profitGroup${index}">${group.title} (${group.type})</label>
                </div>
            `).join('')}
        </div>
    `;
}

// 수익인증 전송
async function sendProfitVerification() {
    if (profitImages.length === 0) {
        alert('최소 한 개의 이미지를 선택해주세요.');
        return;
    }
    
    const message = document.getElementById('profitMessage').value.trim();
    const targetType = document.querySelector('input[name="profitTarget"]:checked').value;
    
    const sendBtn = document.getElementById('sendProfitBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = '전송 중...';
    
    try {
        let targetGroups = [];
        
        // 전송 대상 결정
        switch (targetType) {
            case 'all':
                targetGroups = getAllActiveGroups();
                break;
            case 'expert':
                targetGroups = getExpertGroups();
                break;
            case 'firepower':
                targetGroups = getFirepowerGroups();
                break;
            case 'select':
                targetGroups = getSelectedGroups();
                break;
        }
        
        if (targetGroups.length === 0) {
            alert('전송할 그룹이 없습니다.');
            return;
        }
        
        // 각 계정별로 그룹을 분류
        const groupsByPhone = {};
        targetGroups.forEach(group => {
            if (!groupsByPhone[group.phone]) {
                groupsByPhone[group.phone] = [];
            }
            groupsByPhone[group.phone].push(group.id);
        });
        
        let successCount = 0;
        let totalCount = Object.keys(groupsByPhone).length;
        
        // 각 계정에 대해 전송
        for (const [phone, groupIds] of Object.entries(groupsByPhone)) {
            try {
                // 이미지들을 Base64로 변환
                const imageData = await Promise.all(profitImages.map(img => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve({
                            name: img.name,
                            data: e.target.result.split(',')[1], // Base64 부분만
                            type: img.file.type
                        });
                        reader.readAsDataURL(img.file);
                    });
                }));
                
                const response = await fetch('http://localhost:5000/api/send-images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: phone,
                        group_ids: groupIds,
                        message: message || '📈 수익인증',
                        images: imageData
                    })
                });
                
                if (response.ok) {
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to send to ${phone}:`, error);
            }
        }
        
        alert(`수익인증이 전송되었습니다.\n성공: ${successCount}/${totalCount} 계정`);
        closeProfitModal();
        
    } catch (error) {
        console.error('Profit verification send error:', error);
        alert('전송 중 오류가 발생했습니다.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '📤 수익인증 전송';
    }
}

// 모든 활성 그룹 가져오기
function getAllActiveGroups() {
    const groups = [];
    
    // 전문가 그룹은 수익인증에서 제외
    
    // 화력 그룹
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const firepowerData = appState.rooms.firepower[firepower];
        if (!firepowerData || !firepowerData[0]) return;
        const room = firepowerData[0];
        if (room && room.selectedGroups && room.phone) {
            room.selectedGroups.forEach(group => {
                groups.push({ id: group.id, phone: room.phone });
            });
        }
    });
    
    return groups;
}

// 전문가 그룹만 가져오기
function getExpertGroups() {
    const groups = [];
    
    if (appState.rooms.expert) {
        appState.rooms.expert.forEach(room => {
            if (room.selectedGroups && room.phone) {
                room.selectedGroups.forEach(group => {
                    groups.push({ id: group.id, phone: room.phone });
                });
            }
        });
    }
    
    return groups;
}

// 화력 그룹만 가져오기
function getFirepowerGroups() {
    const groups = [];
    
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const firepowerData = appState.rooms.firepower[firepower];
        if (!firepowerData || !firepowerData[0]) return;
        const room = firepowerData[0];
        if (room && room.selectedGroups && room.phone) {
            room.selectedGroups.forEach(group => {
                groups.push({ id: group.id, phone: room.phone });
            });
        }
    });
    
    return groups;
}

// 선택된 그룹만 가져오기
function getSelectedGroups() {
    console.log('🔍🔍🔍 실제 getSelectedGroups 함수 호출됨! 🔍🔍🔍');
    
    const selectedGroups = [];
    
    // 전문가 계정들의 선택된 그룹 확인
    if (typeof appState !== 'undefined' && appState.rooms && appState.rooms.expert && appState.rooms.expert.length > 0) {
        console.log('🔍 전문가 계정 확인 중...');
        appState.rooms.expert.forEach((expertRoom, expertIndex) => {
            console.log(`🔍 전문가 ${expertIndex}:`, expertRoom);
            console.log(`🔍 전문가 ${expertIndex} enabled:`, expertRoom.enabled);
            
            if (expertRoom && expertRoom.selectedGroups && expertRoom.selectedGroups.length > 0) {
                expertRoom.selectedGroups.forEach((group, groupIndex) => {
                    console.log(`🔍 전문가 ${expertIndex} 그룹 ${groupIndex}:`, group);
                    console.log(`🔍 전문가 ${expertIndex} 그룹 ${groupIndex} active:`, group.active);
                    
                    if (group.active === true) {
                        console.log(`✅ 전문가 ${expertIndex} 그룹 ${groupIndex} 선택됨!`);
                        selectedGroups.push({
                            phone: expertRoom.phone,
                            groupId: group.id,
                            groupTitle: group.name || group.title,
                            accountType: 'expert',
                            accountIndex: expertIndex
                        });
                    }
                });
            }
        });
    }
    
    // 화력 계정들의 선택된 그룹도 확인 (임시로 비활성화 - 전문가만 전송)
    console.log('🔍 화력 계정 확인 건너뜀 (전문가 전용 모드)');
    /*
    if (typeof appState !== 'undefined' && appState.rooms && appState.rooms.firepower) {
        console.log('🔍 화력 계정도 확인 중...');
        Object.keys(appState.rooms.firepower).forEach(key => {
            const firepowerRoom = appState.rooms.firepower[key][0];
            if (firepowerRoom && firepowerRoom.selectedGroups) {
                firepowerRoom.selectedGroups.forEach(group => {
                    if (group.active === true) {
                        selectedGroups.push({
                            phone: firepowerRoom.phone,
                            groupId: group.id,
                            groupTitle: group.name || group.title,
                            accountType: 'firepower',
                            accountIndex: key
                        });
                    }
                });
            }
        });
    }
    */
    
    console.log('🚀 최종 선택된 그룹:', selectedGroups);
    return selectedGroups;
}

// 수익인증 모달 닫기
function closeProfitModal() {
    const modal = document.getElementById('profitModal');
    modal.classList.remove('active');
    
    // 초기화
    profitImages = [];
    updateImagePreview();
    document.getElementById('profitMessage').value = '';
}

// 등록된 화력 리스트 렌더링
function renderFirepowerAccountsList() {
    if (!elements.firepowerAccountsList) return;
    
    const registeredFirepowers = [];
    
    // 화력별 등록된 계정 수집
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const firepowerData = appState.rooms.firepower[firepower];
        if (!firepowerData || !firepowerData[0]) return;
        
        const room = firepowerData[0];
        if (room && room.phone && room.user) {
            registeredFirepowers.push({
                firepower: parseInt(firepower),
                phone: room.phone,
                user: room.user,
                groupCount: room.selectedGroups ? room.selectedGroups.length : 0,
                active: room.active || false
            });
        }
    });
    
    // 화력 번호순으로 정렬
    registeredFirepowers.sort((a, b) => a.firepower - b.firepower);
    
    if (registeredFirepowers.length === 0) {
        elements.firepowerAccountsList.innerHTML = `
            <div class="no-firepower-accounts">
                등록된 화력이 없습니다.
            </div>
        `;
        return;
    }
    
    elements.firepowerAccountsList.innerHTML = registeredFirepowers.map(fp => {
        const userName = fp.user.first_name || fp.user.username || '사용자';
        const statusClass = fp.active ? 'active' : 'inactive';
        const statusText = fp.active ? '활성' : '비활성';
        
        return `
            <div class="firepower-account-item" onclick="switchFirepower(${fp.firepower})">
                <div class="firepower-account-info">
                    <div class="firepower-number">${fp.firepower}</div>
                    <div class="firepower-details">
                        <div class="firepower-name">${userName}</div>
                        <div class="firepower-phone">${fp.phone}</div>
                    </div>
                </div>
                <div class="firepower-status">
                    <div class="firepower-groups-count">${fp.groupCount}개 그룹</div>
                    <div class="firepower-status-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="firepower-actions">
                    <button class="btn-move-to-expert" onclick="event.stopPropagation(); moveToExpert(${fp.firepower})" title="전문가로 이동">
                        👨‍💼 전문가로
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 모든 등록된 계정의 그룹 목록 새로고침
async function refreshAllAccountGroups() {
    console.log('Refreshing all account groups...');
    
    try {
        // 서버가 실행 중인지 먼저 확인 (타임아웃 포함)
        let serverAvailable = false;
        try {
            const testResponse = await Promise.race([
                fetch(`${API_BASE_URL}/proxy-status`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            serverAvailable = testResponse.ok;
        } catch (serverError) {
            console.log('Server not available, will continue with cached data');
            serverAvailable = false;
        }
        
        if (!serverAvailable) {
            console.log('서버 연결 불가, 기존 데이터로 UI 업데이트만 진행');
            // 서버가 없어도 기본 UI 업데이트는 진행
            renderExpertRooms();
            renderFirepowerAccountsList();
            renderFirepowerRooms(appState.activeFirepower);
            return;
        }
        
        // 전문가 계정들 새로고침
        if (appState.rooms.expert && appState.rooms.expert.length > 0) {
            for (let i = 0; i < appState.rooms.expert.length; i++) {
                const room = appState.rooms.expert[i];
                if (room && room.phone) {
                    console.log(`Refreshing expert groups for ${room.phone}`);
                    await refreshAccountGroups(room.phone, 'expert', i);
                    await new Promise(resolve => setTimeout(resolve, getCurrentMessageSpeed())); // 동적 속도 적용
                }
            }
        }
        
        // 화력별 계정들 새로고침
        for (const firepower of Object.keys(appState.rooms.firepower)) {
            const firepowerData = appState.rooms.firepower[firepower];
            if (!firepowerData || !firepowerData[0]) continue;
            const room = firepowerData[0];
            if (room && room.phone) {
                console.log(`Refreshing firepower ${firepower} groups for ${room.phone}`);
                await refreshAccountGroups(room.phone, 'firepower', firepower);
                await new Promise(resolve => setTimeout(resolve, getCurrentMessageSpeed())); // 동적 속도 적용
            }
        }
        
        // UI 업데이트
        renderExpertRooms();
        renderFirepowerAccountsList();
        renderFirepowerRooms(appState.activeFirepower);
        saveToLocalStorage();
        
        console.log('All account groups refreshed successfully');
    } catch (error) {
        console.error('Error refreshing account groups:', error);
        // 에러가 발생해도 기본 UI는 유지
        console.log('Group refresh failed, but UI is preserved');
    }
}

// 계정 자동 연결 함수
async function autoConnectAccount(phone) {
    try {
        console.log(`Attempting auto-connection for ${phone}...`);
        
        // 1. 연결 시도
        const connectResponse = await fetch(`${API_BASE_URL}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        
        if (!connectResponse.ok) {
            console.error(`Failed to connect ${phone}: ${connectResponse.status}`);
            return false;
        }
        
        const connectResult = await connectResponse.json();
        
        if (connectResult.success) {
            if (connectResult.already_authorized) {
                console.log(`${phone} already authorized`);
                return true;
            } else if (connectResult.require_code) {
                console.log(`${phone} requires verification code - cannot auto-connect`);
                return false;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error(`Auto-connection failed for ${phone}:`, error);
        return false;
    }
}

// 특정 계정의 그룹 목록 새로고침 (인텔리전트 동기화)
async function refreshAccountGroups(phone, type, index) {
    try {
        console.log(`🔄 그룹 새로고침 시작: ${phone} (${type} ${index})`);
        
        // 3초 타임아웃 적용
        const response = await Promise.race([
            fetch(`${API_BASE_URL}/get-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone })
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        
        if (!response.ok) {
            console.warn(`❌ 서버 응답 오류 ${phone}: ${response.status}`);
            
            if (response.status === 400) {
                console.log(`🔗 ${phone} 연결되지 않음, 자동 연결 시도...`);
                // 400 에러면 자동 연결 시도
                try {
                    const connectResult = await autoConnectAccount(phone);
                    if (connectResult) {
                        // 연결 성공시 다시 그룹 목록 요청
                        console.log(`✅ ${phone} 자동 연결 성공, 그룹 재요청...`);
                        await new Promise(resolve => setTimeout(resolve, getCurrentMessageSpeed())); // 동적 속도 적용
                        return refreshAccountGroups(phone, type, index); // 재귀 호출
                    } else {
                        console.log(`❌ ${phone} 자동 연결 실패`);
                    }
                } catch (connectError) {
                    console.log(`❌ ${phone} 연결 중 오류:`, connectError.message);
                }
            }
            
            // 실패한 경우 기존 그룹 유지
            console.log(`⚠️ ${phone} 그룹 로딩 실패, 기존 데이터 유지`);
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.groups) {
            console.log(`📊 그룹 동기화 분석: ${phone} - ${data.groups.length}개 그룹 발견`);
            
            // 대상 룸 찾기
            let targetRoom = null;
            if (type === 'expert') {
                targetRoom = appState.rooms.expert[index];
            } else if (type === 'firepower') {
                targetRoom = appState.rooms.firepower[index] && appState.rooms.firepower[index][0];
            }
            
            if (!targetRoom) {
                console.warn(`Target room not found for ${type} ${index}`);
                return;
            }
            
            // 인텔리전트 그룹 동기화 실행
            const syncResult = await intelligentGroupSync(targetRoom, data.groups, phone, type, index);
            
            // 결과 적용
            targetRoom.selectedGroups = syncResult.selectedGroups;
            targetRoom.availableGroups = data.groups;
            
            // 변경사항 로깅 및 사용자 알림
            if (syncResult.removedGroups.length > 0) {
                console.log(`🗑️ 탈퇴 그룹 자동 제거:`, syncResult.removedGroups.map(g => g.name));
                showSyncStatusMessage(`${syncResult.removedGroups.length}개 탈퇴 그룹 제거됨`, 'warning');
            }
            if (syncResult.newGroups.length > 0) {
                console.log(`🆕 신규 그룹 발견:`, syncResult.newGroups.map(g => g.title));
                showNewGroupsNotification(syncResult.newGroups, phone, type, index);
                showSyncStatusMessage(`${syncResult.newGroups.length}개 신규 그룹 발견`, 'info');
            }
            
            console.log(`✅ ${type} ${index} 동기화 완료: ${syncResult.selectedGroups.length}개 그룹 유지`);
            showSyncStatusMessage(`동기화 완료: ${syncResult.selectedGroups.length}개 그룹 유지`, 'success');
            
        } else {
            console.warn(`Failed to load groups for ${phone}:`, data.error || 'Unknown error');
        }
    } catch (error) {
        console.error(`Error refreshing groups for ${phone}:`, error);
        // 에러가 발생해도 계속 진행
    }
}

// 인텔리전트 그룹 동기화 로직
async function intelligentGroupSync(targetRoom, currentGroups, phone, type, index) {
    const previouslySelected = targetRoom.selectedGroups || [];
    const previouslySelectedIds = previouslySelected.map(g => g.id);
    const currentGroupIds = currentGroups.map(g => g.id);
    
    // 1. 탈퇴한 그룹 찾기 (기존에 선택되었지만 현재 목록에 없는 그룹)
    const removedGroups = previouslySelected.filter(g => !currentGroupIds.includes(g.id));
    
    // 2. 신규 그룹 찾기 (현재 목록에 있지만 기존에 없던 그룹)
    const previousAvailableIds = (targetRoom.availableGroups || []).map(g => g.id);
    const newGroups = currentGroups.filter(g => !previousAvailableIds.includes(g.id));
    
    // 3. 유지할 그룹들 (탈퇴하지 않은 기존 선택 그룹)
    const remainingSelectedGroups = currentGroups
        .filter(group => previouslySelectedIds.includes(group.id))
        .map(group => ({
            id: group.id,
            title: group.title,
            name: group.title,
            active: true
        }));
    
    console.log(`📈 동기화 분석 결과 (${phone}):`);
    console.log(`   - 유지: ${remainingSelectedGroups.length}개`);
    console.log(`   - 제거: ${removedGroups.length}개`);
    console.log(`   - 신규: ${newGroups.length}개`);
    
    return {
        selectedGroups: remainingSelectedGroups,
        removedGroups: removedGroups,
        newGroups: newGroups,
        totalAvailable: currentGroups.length
    };
}

// 신규 그룹 알림 시스템
function showNewGroupsNotification(newGroups, phone, type, index) {
    if (newGroups.length === 0) return;
    
    // 알림 표시 시간 설정 (5초)
    const NOTIFICATION_DURATION = 5000;
    
    // 기존 알림 제거
    const existingNotification = document.querySelector('.new-groups-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 알림 생성
    const notification = document.createElement('div');
    notification.className = 'new-groups-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-icon">🆕</span>
            <span class="notification-title">신규 그룹 발견 (${phone})</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-content">
            <p class="notification-message">${newGroups.length}개의 새로운 그룹이 발견되었습니다:</p>
            <ul class="new-groups-list">
                ${newGroups.map(group => `
                    <li class="new-group-item">
                        <input type="checkbox" id="new-group-${group.id}" data-group-id="${group.id}">
                        <label for="new-group-${group.id}" class="group-name">${group.title}</label>
                    </li>
                `).join('')}
            </ul>
            <div class="notification-actions">
                <button class="btn-add-selected" onclick="addSelectedNewGroups('${phone}', '${type}', '${index}')">선택한 그룹 추가</button>
                <button class="btn-add-all" onclick="addAllNewGroups('${phone}', '${type}', '${index}')">모든 그룹 추가</button>
                <button class="btn-ignore" onclick="this.closest('.new-groups-notification').remove()">나중에</button>
            </div>
        </div>
    `;
    
    // 스타일 적용
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // 자동 제거 타이머 (사용자가 상호작용하지 않을 경우)
    setTimeout(() => {
        if (document.contains(notification)) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, NOTIFICATION_DURATION);
    
    console.log(`🔔 신규 그룹 알림 표시: ${newGroups.length}개 그룹`);
}

// 선택한 신규 그룹 추가
async function addSelectedNewGroups(phone, type, index) {
    const notification = document.querySelector('.new-groups-notification');
    const checkedGroups = notification.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkedGroups.length === 0) {
        alert('추가할 그룹을 선택해주세요.');
        return;
    }
    
    const selectedGroupIds = Array.from(checkedGroups).map(cb => cb.dataset.groupId);
    await addNewGroupsToAccount(selectedGroupIds, phone, type, index);
    
    notification.remove();
    console.log(`✅ ${checkedGroups.length}개 신규 그룹 추가 완료`);
}

// 모든 신규 그룹 추가
async function addAllNewGroups(phone, type, index) {
    const notification = document.querySelector('.new-groups-notification');
    const allGroups = notification.querySelectorAll('input[type="checkbox"]');
    const allGroupIds = Array.from(allGroups).map(cb => cb.dataset.groupId);
    
    await addNewGroupsToAccount(allGroupIds, phone, type, index);
    
    notification.remove();
    console.log(`✅ ${allGroups.length}개 신규 그룹 모두 추가 완료`);
}

// 신규 그룹을 실제로 계정에 추가
async function addNewGroupsToAccount(groupIds, phone, type, index) {
    try {
        // 대상 룸 찾기
        let targetRoom = null;
        if (type === 'expert') {
            targetRoom = appState.rooms.expert[index];
        } else if (type === 'firepower') {
            targetRoom = appState.rooms.firepower[index] && appState.rooms.firepower[index][0];
        }
        
        if (!targetRoom || !targetRoom.availableGroups) {
            console.error('Target room or available groups not found');
            return;
        }
        
        // 추가할 그룹 정보 찾기
        const groupsToAdd = targetRoom.availableGroups.filter(g => groupIds.includes(g.id.toString()));
        
        // 기존 선택된 그룹에 추가 (정규화 적용)
        const newSelectedGroups = normalizeGroupData(groupsToAdd, false);
        
        targetRoom.selectedGroups = [...(targetRoom.selectedGroups || []), ...newSelectedGroups];
        
        // UI 업데이트
        if (type === 'expert') {
            renderExpertRooms();
        } else if (type === 'firepower') {
            renderFirepowerRooms(index);
        }
        
        // 로컬스토리지 저장
        saveToLocalStorage();
        
        console.log(`📝 ${groupsToAdd.length}개 그룹이 ${phone}에 추가되었습니다`);
        
    } catch (error) {
        console.error('Error adding new groups:', error);
        alert('그룹 추가 중 오류가 발생했습니다.');
    }
}

// 동기화 상태 메시지 표시 함수
function showSyncStatusMessage(message, type = 'info') {
    // 기존 상태 메시지 제거
    const existingMessage = document.querySelector('.sync-status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 상태 메시지 생성
    const statusMessage = document.createElement('div');
    statusMessage.className = `sync-status-message sync-${type}`;
    statusMessage.textContent = message;
    
    // 스타일 적용
    statusMessage.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    // 타입별 색상 설정
    switch(type) {
        case 'success':
            statusMessage.style.background = '#d4edda';
            statusMessage.style.color = '#155724';
            statusMessage.style.border = '1px solid #c3e6cb';
            break;
        case 'warning':
            statusMessage.style.background = '#fff3cd';
            statusMessage.style.color = '#856404';
            statusMessage.style.border = '1px solid #ffeaa7';
            break;
        case 'info':
            statusMessage.style.background = '#d1ecf1';
            statusMessage.style.color = '#0c5460';
            statusMessage.style.border = '1px solid #bee5eb';
            break;
        default:
            statusMessage.style.background = '#f8f9fa';
            statusMessage.style.color = '#495057';
            statusMessage.style.border = '1px solid #dee2e6';
    }
    
    document.body.appendChild(statusMessage);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (document.contains(statusMessage)) {
            statusMessage.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => statusMessage.remove(), 300);
        }
    }, 3000);
    
    console.log(`[동기화 알림] ${message}`);
}

// 사용자 API 등록 관련 함수들
async function registerUserAPI() {
    const phone = elements.registerPhoneInput.value.trim();
    const apiId = elements.registerApiIdInput.value.trim();
    const apiHash = elements.registerApiHashInput.value.trim();
    
    // 입력 검증
    if (!phone || !apiId || !apiHash) {
        showRegistrationStatus('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    // 전화번호 형식 검증 (국제 번호 지원)
    if (!phone.startsWith('+') || phone.length < 8) {
        showRegistrationStatus('올바른 전화번호 형식이 아닙니다. (예: +1234567890, +821012345678)', 'error');
        return;
    }
    
    // API ID 숫자 검증
    if (isNaN(apiId) || apiId.length < 6) {
        showRegistrationStatus('API ID는 6자리 이상의 숫자여야 합니다.', 'error');
        return;
    }
    
    // API Hash 길이 검증
    if (apiHash.length !== 32) {
        showRegistrationStatus('API Hash는 정확히 32자리여야 합니다.', 'error');
        return;
    }
    
    elements.registerApiBtn.disabled = true;
    elements.registerApiBtn.textContent = '등록 중...';
    showRegistrationStatus('API 등록을 진행하고 있습니다...', 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/register-user-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                api_id: parseInt(apiId),
                api_hash: apiHash
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.updated) {
                showRegistrationStatus(`🔄 API 정보 업데이트 성공! ${phone} (기존 API ID: ${data.old_api_id} → 새 API ID: ${data.api_id})`, 'success');
            } else {
                showRegistrationStatus(`✅ API 등록 성공! ${phone} 계정이 등록되었습니다.`, 'success');
            }
            setTimeout(() => {
                elements.apiRegisterModal.classList.remove('active');
                clearRegistrationModal();
                // 등록된 API 목록 새로고침 (필요시)
                loadRegisteredAPIs();
            }, 3000); // 업데이트 메시지를 더 오래 보여줌
        } else {
            showRegistrationStatus(`❌ 등록 실패: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('API registration error:', error);
        showRegistrationStatus(`❌ 등록 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        elements.registerApiBtn.disabled = false;
        elements.registerApiBtn.textContent = 'API 등록';
    }
}

function showRegistrationStatus(message, type) {
    if (!elements.registerStatus) return;
    
    elements.registerStatus.textContent = message;
    elements.registerStatus.className = `connection-status ${type}`;
    elements.registerStatus.style.display = 'block';
}

function clearRegistrationModal() {
    if (elements.registerPhoneInput) elements.registerPhoneInput.value = '';
    if (elements.registerApiIdInput) elements.registerApiIdInput.value = '';
    if (elements.registerApiHashInput) elements.registerApiHashInput.value = '';
    if (elements.registerStatus) {
        elements.registerStatus.textContent = '';
        elements.registerStatus.style.display = 'none';
    }
}

async function loadRegisteredAPIs() {
    try {
        const response = await fetch(`${API_BASE_URL}/get-registered-apis`);
        const data = await response.json();
        
        if (data.success) {
            console.log('Registered APIs:', data.apis);
            // 등록된 API 목록을 UI에 표시하는 로직을 여기에 추가할 수 있습니다
            // 예: 드롭다운, 리스트 등으로 표시
        }
    } catch (error) {
        console.error('Error loading registered APIs:', error);
    }
}

// 중복 계정 정리 함수
function cleanupDuplicateAccounts() {
    console.log('🧹🔥 AGGRESSIVE 화력 계정 정리 시작... 🔥🧹');
    console.log('===============================================');
    
    // 1단계: 전체 상태 분석
    console.log('=== 1단계: 전체 상태 분석 ===');
    const beforeCount = appState.rooms.expert.length;
    console.log(`정리 전 전문가 계정 수: ${beforeCount}`);
    
    // 알려진 화력 계정들 (하드코딩된 목록)
    const knownFirepowerAccounts = getKnownFirepowerAccounts();
    console.log('📋 알려진 화력 계정 목록 (하드코딩):', knownFirepowerAccounts);
    
    // 현재 전문가 섹션 분석
    console.log('👨‍💼 현재 전문가 섹션 계정들:');
    const firepowerInExpert = [];
    appState.rooms.expert.forEach((room, index) => {
        if (room && room.phone) {
            const normalizedPhone = normalizePhone(room.phone);
            const isKnownFirepower = knownFirepowerAccounts.includes(normalizedPhone);
            console.log(`  ${index + 1}. ${room.phone} -> ${normalizedPhone} ${isKnownFirepower ? '🔥 FIREPOWER' : '👨‍💼 EXPERT'}`);
            if (isKnownFirepower) {
                firepowerInExpert.push({ index, phone: room.phone, normalized: normalizedPhone });
            }
        }
    });
    
    console.log(`🔥 전문가 섹션에 있는 화력 계정: ${firepowerInExpert.length}개`);
    firepowerInExpert.forEach(fp => console.log(`  - ${fp.phone} (${fp.normalized})`));
    
    // 2단계: 알려진 화력 계정들을 전문가 섹션에서 강제 제거
    console.log('=== 2단계: 화력 계정 강제 제거 ===');
    const removedAccounts = [];
    const originalExpertRooms = [...appState.rooms.expert]; // 백업
    
    appState.rooms.expert = appState.rooms.expert.filter((expertRoom, index) => {
        if (!expertRoom || !expertRoom.phone) {
            console.log(`  ${index + 1}. 빈 계정 유지`);
            return true;
        }
        
        const normalizedPhone = normalizePhone(expertRoom.phone);
        const isKnownFirepower = knownFirepowerAccounts.includes(normalizedPhone);
        
        if (isKnownFirepower) {
            console.log(`  🔥 제거: ${expertRoom.phone} -> ${normalizedPhone}`);
            removedAccounts.push(expertRoom.phone);
            return false; // 제거
        } else {
            console.log(`  ✅ 유지: ${expertRoom.phone} -> ${normalizedPhone}`);
            return true; // 유지
        }
    });
    
    // 3단계: 추가 중복 정리 (화력 섹션에 있는 계정들도 확인)
    console.log('=== 3단계: 화력 섹션 기반 추가 정리 ===');
    const firepowerPhones = new Set();
    for (const firepower of Object.keys(appState.rooms.firepower)) {
        const room = appState.rooms.firepower[firepower]?.[0];
        if (room && room.phone) {
            const normalizedPhone = normalizePhone(room.phone);
            firepowerPhones.add(normalizedPhone);
            console.log(`  화력 ${firepower}: ${room.phone} -> ${normalizedPhone}`);
        }
    }
    
    // 화력 섹션에 있는 계정들도 전문가에서 제거
    const additionalRemoved = [];
    appState.rooms.expert = appState.rooms.expert.filter(expertRoom => {
        if (expertRoom && expertRoom.phone) {
            const normalizedPhone = normalizePhone(expertRoom.phone);
            if (firepowerPhones.has(normalizedPhone)) {
                console.log(`  🔥 추가 제거: ${expertRoom.phone} -> ${normalizedPhone}`);
                additionalRemoved.push(expertRoom.phone);
                return false;
            }
        }
        return true;
    });
    
    // 4단계: 결과 분석
    console.log('=== 4단계: 결과 분석 ===');
    const afterCount = appState.rooms.expert.length;
    const totalRemoved = removedAccounts.length + additionalRemoved.length;
    
    console.log(`정리 전 전문가 계정: ${beforeCount}개`);
    console.log(`정리 후 전문가 계정: ${afterCount}개`);
    console.log(`하드코딩 목록으로 제거: ${removedAccounts.length}개`);
    console.log(`화력 섹션 기반 제거: ${additionalRemoved.length}개`);
    console.log(`총 제거된 계정: ${totalRemoved}개`);
    
    if (removedAccounts.length > 0) {
        console.log('제거된 계정들 (하드코딩):');
        removedAccounts.forEach(phone => console.log(`  - ${phone}`));
    }
    if (additionalRemoved.length > 0) {
        console.log('제거된 계정들 (화력 섹션):');
        additionalRemoved.forEach(phone => console.log(`  - ${phone}`));
    }
    
    // 5단계: 남은 계정들 최종 확인
    console.log('=== 5단계: 남은 전문가 계정들 최종 확인 ===');
    console.log(`남은 전문가 계정: ${appState.rooms.expert.length}개`);
    appState.rooms.expert.forEach((room, index) => {
        if (room && room.phone) {
            const normalizedPhone = normalizePhone(room.phone);
            console.log(`  ${index + 1}. ${room.phone} (${normalizedPhone})`);
        }
    });
    
    // 6단계: UI 강제 업데이트
    console.log('=== 6단계: UI 강제 업데이트 ===');
    try {
        // activeExpert 인덱스 조정
        if (appState.activeExpert !== null && appState.activeExpert >= appState.rooms.expert.length) {
            console.log('🔄 activeExpert 인덱스 초기화');
            appState.activeExpert = null;
        }
        
        // 즉시 저장
        saveToLocalStorage();
        console.log('✅ 로컬스토리지 저장 완료');
        
        // UI 새로고침
        renderExpertRooms();
        console.log('✅ 전문가 섹션 UI 새로고침 완료');
        
        updateSelectedGroupCount();
        console.log('✅ 선택된 그룹 카운트 업데이트 완료');
        
        // DOM 강제 업데이트
        const expertRoomsContainer = document.getElementById('expertRooms');
        if (expertRoomsContainer) {
            expertRoomsContainer.style.display = 'none';
            expertRoomsContainer.offsetHeight; // 강제 reflow
            expertRoomsContainer.style.display = '';
            console.log('✅ DOM 강제 새로고침 완료');
        }
        
    } catch (error) {
        console.error('❌ UI 업데이트 중 오류:', error);
    }
    
    // 7단계: 결과 알림
    console.log('=== 7단계: 결과 알림 ===');
    let message = '';
    if (totalRemoved > 0) {
        message = `🧹 정리 완료!\n\n총 ${totalRemoved}개 화력 계정이 전문가 섹션에서 제거되었습니다.\n\n제거된 계정:\n${[...removedAccounts, ...additionalRemoved].join('\n')}`;
        console.log('✅ 정리 성공!');
    } else {
        message = '✅ 정리 완료!\n\n전문가 섹션에 화력 계정이 없습니다.';
        console.log('ℹ️ 제거할 화력 계정 없음');
    }
    
    console.log(message);
    
    console.log('===============================================');
    console.log('🧹🔥 AGGRESSIVE 화력 계정 정리 완료! 🔥🧹');
}

// 계정 상태 디버그 정보 표시
function showAccountDebugInfo() {
    console.log('🔍 ===== 계정 상태 디버그 정보 =====');
    
    // 마스터 계정 목록 확인
    const masterAccounts = getMasterAccountList();
    console.log('📚 마스터 계정 목록:', masterAccounts.length + '개');
    console.log('마스터 목록 상세:', masterAccounts);
    
    // API 계정 타입 설정 확인
    const apiAccountTypes = localStorage.getItem('apiAccountTypes');
    console.log('⚙️ API 계정 타입 설정:', apiAccountTypes);
    
    // 1. 알려진 화력 계정 목록
    const knownFirepower = getKnownFirepowerAccounts();
    console.log('📋 알려진 화력 계정 (하드코딩):', knownFirepower);
    
    // 2. 현재 전문가 섹션 계정들
    console.log('👨‍💼 현재 전문가 섹션 계정들:', appState.rooms.expert.length + '개');
    appState.rooms.expert.forEach((room, index) => {
        if (room && room.phone) {
            const normalized = normalizePhone(room.phone);
            const isFirepower = knownFirepower.includes(normalized);
            const configuredType = getAccountTypeFromApiConfig(room.phone);
            console.log(`  ${index + 1}. ${room.phone} -> ${normalized}`);
            console.log(`      설정 타입: ${configuredType}, 하드코딩: ${isFirepower ? '🔥 FIREPOWER' : '👨‍💼 Expert'}`);
        }
    });
    
    // 3. 현재 화력 섹션 계정들
    console.log('🔥 현재 화력 섹션 계정들:');
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const room = appState.rooms.firepower[firepower]?.[0];
        if (room && room.phone) {
            const normalized = normalizePhone(room.phone);
            const configuredType = getAccountTypeFromApiConfig(room.phone);
            console.log(`  화력 ${firepower}: ${room.phone} -> ${normalized}`);
            console.log(`      설정 타입: ${configuredType}`);
        }
    });
    
    // 4. 중복 계정 찾기
    const expertPhones = new Set();
    const firepowerPhones = new Set();
    
    appState.rooms.expert.forEach(room => {
        if (room && room.phone) {
            const normalized = normalizePhone(room.phone);
            expertPhones.add(normalized);
        }
    });
    
    Object.values(appState.rooms.firepower).forEach(rooms => {
        if (rooms && rooms[0] && rooms[0].phone) {
            const normalized = normalizePhone(rooms[0].phone);
            firepowerPhones.add(normalized);
        }
    });
    
    const duplicates = [...expertPhones].filter(phone => firepowerPhones.has(phone));
    if (duplicates.length > 0) {
        console.error('❌ 중복 계정 발견:', duplicates);
        console.log('🔧 중복 제거 실행...');
        duplicates.forEach(phone => {
            removeDuplicateAccount(phone);
        });
        
        // UI 업데이트
        renderExpertRooms();
        renderFirepowerAccountsList();
        renderFirepowerRooms(appState.activeFirepower);
        updateSelectedGroupCount();
        saveToLocalStorage();
    } else {
        console.log('✅ 중복 계정 없음');
    }
    
    // 5. 마스터 목록과 현재 배치 일치 여부 확인
    const currentTotalAccounts = expertPhones.size + firepowerPhones.size;
    if (masterAccounts.length !== currentTotalAccounts) {
        console.warn(`⚠️ 마스터 목록(${masterAccounts.length})과 현재 배치(${currentTotalAccounts})가 일치하지 않음`);
        console.log('🔧 재배치 실행 권장');
        
        // 자동으로 재배치 실행
        redistributeAllAccounts();
    }
    
    // 6. 상세 분석 표시
    console.log('\n=== 상세 계정 분석 ===');
    masterAccounts.forEach((acc, index) => {
        const normalizedPhone = normalizePhone(acc.phone);
        const configuredType = getAccountTypeFromApiConfig(acc.phone) || 'firepower';
        const isInExpert = expertPhones.has(normalizedPhone);
        const isInFirepower = firepowerPhones.has(normalizedPhone);
        
        console.log(`${index + 1}. ${acc.phone}`);
        console.log(`   설정 타입: ${configuredType}`);
        console.log(`   전문가 섹션: ${isInExpert ? '✅' : '❌'}`);
        console.log(`   화력 섹션: ${isInFirepower ? '✅' : '❌'}`);
        console.log(`   그룹 수: ${acc.groups ? acc.groups.length : 0}`);
        
        if (configuredType === 'expert' && !isInExpert) {
            console.warn(`   ⚠️ 전문가로 설정되었지만 전문가 섹션에 없음`);
        }
        if (configuredType === 'firepower' && !isInFirepower) {
            console.warn(`   ⚠️ 화력으로 설정되었지만 화력 섹션에 없음`);
        }
        if (isInExpert && isInFirepower) {
            console.error(`   ❌ 중복 배치됨!`);
        }
    });
    
    console.log('🔍 ===== 디버그 정보 종료 =====');
    
    // 자동 검증 및 복구 제안
    console.log('\n🔧 ===== 자동 검증 및 복구 =====');
    const isValid = validateMasterAccountList();
    
    if (!isValid) {
        console.log('무결성 검증 실패. 자동 복구 실행...');
        const fixedCount = autoFixMasterAccountList();
        if (fixedCount > 0) {
            console.log(`${fixedCount}개 문제를 자동으로 해결했습니다.`);
        }
    }
    
    // 서버 동기화 상태 확인
    checkServerSync();
}

// 중복 계정 제거 함수
function removeDuplicateAccount(phone) {
    const normalizedPhone = normalizePhone(phone);
    const accountType = getAccountTypeFromApiConfig(phone) || 'firepower';
    
    console.log(`🔧 중복 계정 제거: ${phone} (설정 타입: ${accountType})`);
    
    if (accountType === 'expert') {
        // 전문가로 설정된 경우, 화력 섹션에서 제거
        Object.keys(appState.rooms.firepower).forEach(key => {
            const rooms = appState.rooms.firepower[key];
            if (rooms && rooms[0] && normalizePhone(rooms[0].phone) === normalizedPhone) {
                console.log(`   화력 ${key}번에서 제거: ${phone}`);
                delete appState.rooms.firepower[key];
            }
        });
    } else {
        // 화력으로 설정된 경우, 전문가 섹션에서 제거
        const beforeCount = appState.rooms.expert.length;
        appState.rooms.expert = appState.rooms.expert.filter(room => 
            normalizePhone(room.phone) !== normalizedPhone
        );
        const afterCount = appState.rooms.expert.length;
        if (beforeCount > afterCount) {
            console.log(`   전문가 섹션에서 제거: ${phone} (${beforeCount} -> ${afterCount})`);
        }
    }
}

// 계정 정보 초기화 및 재구성 함수
function resetAndRebuildAccounts() {
    console.log('🔄 계정 정보 초기화 및 재구성 시작...');
    
    // 1. 현재 모든 계정 정보 수집
    const allCurrentAccounts = [];
    
    // 전문가 섹션에서 수집
    appState.rooms.expert.forEach(room => {
        if (room && room.phone) {
            allCurrentAccounts.push({
                phone: room.phone,
                user: room.user,
                groups: room.availableGroups || room.selectedGroups || [],
                source: 'expert'
            });
        }
    });
    
    // 화력 섹션에서 수집
    Object.keys(appState.rooms.firepower).forEach(key => {
        const room = appState.rooms.firepower[key]?.[0];
        if (room && room.phone) {
            allCurrentAccounts.push({
                phone: room.phone,
                user: room.user,
                groups: room.groups || room.selectedGroups || [],
                source: `firepower_${key}`
            });
        }
    });
    
    console.log(`수집된 계정 수: ${allCurrentAccounts.length}`);
    
    // 2. 마스터 목록 재구성
    console.log('📚 마스터 계정 목록 재구성...');
    localStorage.removeItem('masterAccountList'); // 기존 목록 삭제
    
    allCurrentAccounts.forEach(account => {
        addToMasterAccountList({
            phone: account.phone,
            user: account.user,
            groups: account.groups,
            addedAt: Date.now(),
            source: account.source
        });
    });
    
    // 3. 전체 재배치
    console.log('🔧 전체 재배치...');
    redistributeAllAccounts();
    
    console.log('✅ 계정 정보 초기화 및 재구성 완료!');
    
    // 결과 확인
    setTimeout(() => {
        showAccountDebugInfo();
    }, 800);
}

// 마스터 계정 목록 무결성 검증
function validateMasterAccountList() {
    console.log('🔍 마스터 계정 목록 무결성 검증 시작...');
    
    const masterAccounts = getMasterAccountList();
    const issues = [];
    
    // 1. 중복 전화번호 검사
    const phoneNumbers = masterAccounts.map(acc => normalizePhone(acc.phone));
    const duplicatePhones = phoneNumbers.filter((phone, index) => phoneNumbers.indexOf(phone) !== index);
    
    if (duplicatePhones.length > 0) {
        issues.push(`중복 전화번호 발견: ${[...new Set(duplicatePhones)].join(', ')}`);
    }
    
    // 2. 필수 필드 검사
    masterAccounts.forEach((acc, index) => {
        if (!acc.phone) {
            issues.push(`계정 ${index + 1}: 전화번호 누락`);
        }
        if (!acc.user && !acc.groups) {
            issues.push(`계정 ${index + 1} (${acc.phone}): 사용자 정보와 그룹 정보 모두 누락`);
        }
    });
    
    // 3. 타입 설정 일치성 검사
    masterAccounts.forEach(acc => {
        const configuredType = getAccountTypeFromApiConfig(acc.phone);
        const normalizedPhone = normalizePhone(acc.phone);
        
        const isInExpert = appState.rooms.expert.some(room => 
            normalizePhone(room.phone) === normalizedPhone
        );
        const isInFirepower = Object.values(appState.rooms.firepower).some(rooms => 
            rooms && rooms[0] && normalizePhone(rooms[0].phone) === normalizedPhone
        );
        
        if (configuredType === 'expert' && !isInExpert) {
            issues.push(`${acc.phone}: 전문가로 설정되었지만 전문가 섹션에 없음`);
        }
        if (configuredType === 'firepower' && !isInFirepower) {
            issues.push(`${acc.phone}: 화력으로 설정되었지만 화력 섹션에 없음`);
        }
        if (isInExpert && isInFirepower) {
            issues.push(`${acc.phone}: 전문가와 화력 섹션에 중복 배치`);
        }
    });
    
    // 4. 결과 보고
    if (issues.length === 0) {
        console.log('✅ 마스터 계정 목록 무결성 검증 완료: 문제 없음');
        return true;
    } else {
        console.error('❌ 마스터 계정 목록 무결성 검증 실패:');
        issues.forEach(issue => console.error(`  - ${issue}`));
        return false;
    }
}

// 자동 복구 기능
function autoFixMasterAccountList() {
    console.log('🔧 마스터 계정 목록 자동 복구 시작...');
    
    const masterAccounts = getMasterAccountList();
    let fixedCount = 0;
    
    // 1. 중복 제거
    const uniqueAccounts = [];
    const seenPhones = new Set();
    
    masterAccounts.forEach(acc => {
        const normalizedPhone = normalizePhone(acc.phone);
        if (!seenPhones.has(normalizedPhone)) {
            seenPhones.add(normalizedPhone);
            uniqueAccounts.push(acc);
        } else {
            console.log(`중복 제거: ${acc.phone}`);
            fixedCount++;
        }
    });
    
    // 2. 필수 필드 보완
    uniqueAccounts.forEach(acc => {
        if (!acc.addedAt) {
            acc.addedAt = Date.now();
            fixedCount++;
        }
        if (!acc.lastUpdated) {
            acc.lastUpdated = Date.now();
            fixedCount++;
        }
    });
    
    // 3. 마스터 목록 업데이트
    if (fixedCount > 0) {
        localStorage.setItem('masterAccountList', JSON.stringify(uniqueAccounts));
        console.log(`✅ 자동 복구 완료: ${fixedCount}개 문제 해결`);
        
        // 4. 재배치 실행
        redistributeAllAccounts();
    } else {
        console.log('✅ 자동 복구: 문제 없음');
    }
    
    return fixedCount;
}

// 서버와 동기화 상태 확인
function checkServerSync() {
    console.log('🌐 서버와 동기화 상태 확인...');
    
    const masterAccounts = getMasterAccountList();
    const localPhones = masterAccounts.map(acc => normalizePhone(acc.phone));
    
    // 서버에서 계정 목록 가져오기 (비동기)
    fetch(`${API_BASE_URL}/get-logged-accounts`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const serverPhones = data.accounts.map(acc => normalizePhone(acc.phone));
                
                const missingFromLocal = serverPhones.filter(phone => !localPhones.includes(phone));
                const missingFromServer = localPhones.filter(phone => !serverPhones.includes(phone));
                
                console.log(`🏠 로컬 계정: ${localPhones.length}개`);
                console.log(`🌐 서버 계정: ${serverPhones.length}개`);
                
                if (missingFromLocal.length > 0) {
                    console.warn('⚠️ 서버에만 있는 계정:', missingFromLocal);
                }
                if (missingFromServer.length > 0) {
                    console.warn('⚠️ 로컬에만 있는 계정:', missingFromServer);
                }
                
                if (missingFromLocal.length === 0 && missingFromServer.length === 0) {
                    console.log('✅ 서버와 로컬 동기화 완료');
                }
            }
        })
        .catch(error => {
            console.error('서버 동기화 확인 실패:', error);
        });
}

// 화력 계정을 전문가로 이동
function moveToExpert(firepowerNumber) {
    if (!appState.rooms.firepower[firepowerNumber] || !appState.rooms.firepower[firepowerNumber][0]) {
        alert('화력 계정 정보를 찾을 수 없습니다.');
        return;
    }
    
    const firepowerRoom = appState.rooms.firepower[firepowerNumber][0];
    const userName = firepowerRoom.user ? 
        (firepowerRoom.user.first_name || firepowerRoom.user.username) : '알 수 없음';
    
    if (confirm(`${userName} (${firepowerRoom.phone})을 전문가로 이동하시겠습니까?`)) {
        // 전문가 섹션에 추가
        const expertRoom = {
            phone: firepowerRoom.phone,
            user: firepowerRoom.user,
            selectedGroups: firepowerRoom.selectedGroups || [],
            availableGroups: firepowerRoom.groups || [],
            active: true,
            enabled: true
        };
        
        appState.rooms.expert.push(expertRoom);
        
        // 화력 섹션에서 제거
        delete appState.rooms.firepower[firepowerNumber];
        
        // UI 업데이트
        renderExpertRooms();
        renderFirepowerAccountsList();
        renderFirepowerRooms(appState.activeFirepower);
        updateSelectedGroupCount();
        saveToLocalStorage();
        
        console.log(`${firepowerRoom.phone}을 전문가로 이동 완료`);
    }
}

// 전문가 계정을 화력으로 이동
function moveToFirepower(expertIndex) {
    if (!appState.rooms.expert[expertIndex]) {
        alert('전문가 계정 정보를 찾을 수 없습니다.');
        return;
    }
    
    const expertRoom = appState.rooms.expert[expertIndex];
    const userName = expertRoom.user ? 
        (expertRoom.user.first_name || expertRoom.user.username) : '알 수 없음';
    
    if (confirm(`${userName} (${expertRoom.phone})을 화력으로 이동하시겠습니까?`)) {
        // 사용 가능한 화력 슬롯 찾기
        let availableFirepowerSlot = null;
        for (let i = 1; i <= 30; i++) {
            if (!appState.rooms.firepower[i] || !appState.rooms.firepower[i][0]) {
                availableFirepowerSlot = i;
                break;
            }
        }
        
        if (!availableFirepowerSlot) {
            alert('사용 가능한 화력 슬롯이 없습니다.');
            return;
        }
        
        // 화력 섹션에 추가
        appState.rooms.firepower[availableFirepowerSlot] = [{
            phone: expertRoom.phone,
            user: expertRoom.user,
            groups: expertRoom.availableGroups || [],
            selectedGroups: expertRoom.selectedGroups || [],
            active: true
        }];
        
        // 전문가 섹션에서 제거
        appState.rooms.expert.splice(expertIndex, 1);
        
        // activeExpert 인덱스 조정
        if (appState.activeExpert === expertIndex) {
            appState.activeExpert = null;
        } else if (appState.activeExpert > expertIndex) {
            appState.activeExpert--;
        }
        
        // UI 업데이트
        renderExpertRooms();
        renderFirepowerAccountsList();
        renderFirepowerRooms(appState.activeFirepower);
        updateSelectedGroupCount();
        saveToLocalStorage();
        
        console.log(`${expertRoom.phone}을 화력 ${availableFirepowerSlot}번으로 이동 완료`);
    }
}

// 🔥 즉시 문제 해결: 모든 전문가 계정을 화력으로 강제 이동
function moveAllExpertsToFirepower() {
    console.log('🔥 모든 전문가 계정을 화력으로 강제 이동 시작...');
    
    const expertsToMove = [...appState.rooms.expert]; // 복사본 생성
    let movedCount = 0;
    
    expertsToMove.forEach((expertRoom, index) => {
        if (!expertRoom || !expertRoom.phone) return;
        
        // 사용 가능한 화력 슬롯 찾기
        let availableFirepowerSlot = null;
        for (let i = 1; i <= 30; i++) {
            if (!appState.rooms.firepower[i] || !appState.rooms.firepower[i][0]) {
                availableFirepowerSlot = i;
                break;
            }
        }
        
        if (availableFirepowerSlot) {
            // 화력 섹션에 추가
            appState.rooms.firepower[availableFirepowerSlot] = [{
                phone: expertRoom.phone,
                user: expertRoom.user,
                groups: expertRoom.availableGroups || [],
                selectedGroups: expertRoom.selectedGroups || [],
                active: true
            }];
            
            const userName = expertRoom.user ? 
                (expertRoom.user.first_name || expertRoom.user.username) : '알 수 없음';
            console.log(`✅ ${userName} (${expertRoom.phone})을 화력 ${availableFirepowerSlot}번으로 이동`);
            movedCount++;
        }
    });
    
    // 전문가 섹션 완전히 비우기
    appState.rooms.expert = [];
    appState.activeExpert = null;
    
    // UI 업데이트
    renderExpertRooms();
    renderFirepowerAccountsList();
    renderFirepowerRooms(appState.activeFirepower);
    updateSelectedGroupCount();
    saveToLocalStorage();
    
    console.log(`강제 이동 완료: ${movedCount}개 계정이 화력으로 이동됨`);
}

// API 설정에서 계정 타입 가져오기
function getAccountTypeFromApiConfig(phone) {
    // localStorage에서 API 설정 가져오기
    const savedApiConfig = localStorage.getItem('apiAccountTypes');
    if (savedApiConfig) {
        const apiConfig = JSON.parse(savedApiConfig);
        const normalizedPhone = normalizePhone(phone);
        return apiConfig[normalizedPhone] || 'firepower'; // 기본값: 화력
    }
    return 'firepower'; // 기본값: 화력
}

// API 설정에 계정 타입 저장하기
function setAccountTypeInApiConfig(phone, type) {
    const savedApiConfig = localStorage.getItem('apiAccountTypes');
    const apiConfig = savedApiConfig ? JSON.parse(savedApiConfig) : {};
    
    const normalizedPhone = normalizePhone(phone);
    apiConfig[normalizedPhone] = type;
    
    localStorage.setItem('apiAccountTypes', JSON.stringify(apiConfig));
    console.log(`API 설정 저장: ${phone} -> ${type}`);
}

// API 관리 페이지 렌더링 (마스터 목록 기반)
function renderApiManagerContent() {
    const expertApiList = document.getElementById('expertApiList');
    const firepowerApiList = document.getElementById('firepowerApiList');
    
    if (!expertApiList || !firepowerApiList) {
        console.error('❌ API 관리 요소를 찾을 수 없음');
        return;
    }
    
    // 🔧 마스터 계정 목록에서 모든 계정 가져오기
    let masterAccounts = getMasterAccountList();
    
    // 마스터 목록이 비어있으면 현재 배치에서 재구성
    if (masterAccounts.length === 0) {
        console.log('⚠️ 마스터 목록이 비어있음. 현재 배치에서 재구성...');
        
        // 전문가 섹션에서 수집
        appState.rooms.expert.forEach(room => {
            if (room && room.phone) {
                addToMasterAccountList({
                    phone: room.phone,
                    user: room.user,
                    groups: room.availableGroups || room.selectedGroups || [],
                    addedAt: Date.now()
                });
                setAccountTypeInApiConfig(room.phone, 'expert');
            }
        });
        
        // 화력 섹션에서 수집
        Object.keys(appState.rooms.firepower).forEach(key => {
            const room = appState.rooms.firepower[key]?.[0];
            if (room && room.phone) {
                addToMasterAccountList({
                    phone: room.phone,
                    user: room.user,
                    groups: room.groups || room.selectedGroups || [],
                    addedAt: Date.now()
                });
                setAccountTypeInApiConfig(room.phone, 'firepower');
            }
        });
        
        // 업데이트된 마스터 목록 다시 가져오기
        masterAccounts = getMasterAccountList();
        console.log(`📚 마스터 목록 재구성 완료: ${masterAccounts.length}개 계정`);
    }
    
    const allAccounts = masterAccounts.map(acc => {
        const currentType = getAccountTypeFromApiConfig(acc.phone) || 'firepower';
        const userName = acc.user ? (acc.user.first_name || acc.user.username || '알 수 없음') : '알 수 없음';
        
        return {
            phone: acc.phone,
            user: acc.user,
            userName: userName,
            currentType: currentType,
            groups: acc.groups ? acc.groups.length : 0,
            status: acc.status || 'unknown',
            addedAt: acc.addedAt,
            lastUpdated: acc.lastUpdated
        };
    });
    
    console.log(`📋 API 관리: 마스터 목록에서 ${allAccounts.length}개 계정 로드됨`);
    
    // 전문가 목록 렌더링
    const expertAccounts = allAccounts.filter(acc => acc.currentType === 'expert');
    if (expertAccounts.length > 0) {
        expertApiList.innerHTML = expertAccounts.map(acc => createAccountItem(acc)).join('');
    } else {
        expertApiList.innerHTML = `
            <div class="no-accounts">
                <p>📭 전문가로 설정된 계정이 없습니다.</p>
                <p style="font-size: 12px; color: #666;">화력 계정을 전문가로 변경하려면 아래 화력 탭에서 변경하세요.</p>
            </div>
        `;
    }
    
    // 화력 목록 렌더링
    const firepowerAccounts = allAccounts.filter(acc => acc.currentType === 'firepower');
    if (firepowerAccounts.length > 0) {
        firepowerApiList.innerHTML = firepowerAccounts.map(acc => createAccountItem(acc)).join('');
    } else {
        firepowerApiList.innerHTML = `
            <div class="no-accounts">
                <p>📭 화력으로 설정된 계정이 없습니다.</p>
                <p style="font-size: 12px; color: #666;">새 계정을 등록하면 자동으로 화력으로 배치됩니다.</p>
            </div>
        `;
    }
    
    // 총 계정 수 표시
    console.log(`✅ API 관리 렌더링 완료: 전문가 ${expertAccounts.length}개, 화력 ${firepowerAccounts.length}개`);
}

// 계정 아이템 HTML 생성
function createAccountItem(account) {
    const userName = account.user ? 
        (account.user.first_name || account.user.username || '알 수 없음') : '알 수 없음';
    
    return `
        <div class="account-item">
            <div class="account-info">
                <div class="account-name">${userName}</div>
                <div class="account-phone">${account.phone}</div>
                <div class="account-groups">${account.groups}개 그룹</div>
            </div>
            <div class="account-actions">
                <select class="account-type-select" data-phone="${account.phone}" onchange="changeAccountType('${account.phone}', this.value)">
                    <option value="expert" ${account.currentType === 'expert' ? 'selected' : ''}>전문가</option>
                    <option value="firepower" ${account.currentType === 'firepower' ? 'selected' : ''}>화력</option>
                </select>
            </div>
        </div>
    `;
}

// 계정 타입 변경 (새로운 시스템)
function changeAccountType(phone, newType) {
    console.log(`🔧 계정 타입 변경: ${phone} -> ${newType}`);
    
    // 1. API 설정에 저장
    setAccountTypeInApiConfig(phone, newType);
    
    // 2. 전체 재배치 (설정 기반)
    redistributeAllAccounts();
    
    // 3. API 관리 페이지 업데이트
    setTimeout(() => {
        renderApiManagerContent();
        console.log(`✅ ${phone} 타입 변경 완료: ${newType}`);
    }, 100);
}

// 계정을 전문가로 이동
function moveAccountToExpert(phone) {
    const normalizedPhone = normalizePhone(phone);
    
    // 화력에서 찾아서 제거
    let sourceAccount = null;
    Object.keys(appState.rooms.firepower).forEach(key => {
        const rooms = appState.rooms.firepower[key];
        if (rooms && rooms[0] && normalizePhone(rooms[0].phone) === normalizedPhone) {
            sourceAccount = rooms[0];
            delete appState.rooms.firepower[key];
        }
    });
    
    if (sourceAccount) {
        // 전문가에 추가
        const expertRoom = {
            phone: sourceAccount.phone,
            user: sourceAccount.user,
            selectedGroups: sourceAccount.selectedGroups || [],
            availableGroups: sourceAccount.groups || [],
            active: true,
            enabled: true
        };
        
        appState.rooms.expert.push(expertRoom);
        console.log(`✅ ${phone}을 전문가로 이동`);
    }
}

// 계정을 화력으로 이동
function moveAccountToFirepower(phone) {
    const normalizedPhone = normalizePhone(phone);
    
    // 전문가에서 찾아서 제거
    let sourceAccount = null;
    const expertIndex = appState.rooms.expert.findIndex(room => 
        room && normalizePhone(room.phone) === normalizedPhone
    );
    
    if (expertIndex >= 0) {
        sourceAccount = appState.rooms.expert[expertIndex];
        appState.rooms.expert.splice(expertIndex, 1);
        
        // activeExpert 조정
        if (appState.activeExpert === expertIndex) {
            appState.activeExpert = null;
        } else if (appState.activeExpert > expertIndex) {
            appState.activeExpert--;
        }
    }
    
    if (sourceAccount) {
        // 화력에 추가 (빈 슬롯 찾기)
        let availableSlot = null;
        for (let i = 1; i <= 30; i++) {
            if (!appState.rooms.firepower[i] || !appState.rooms.firepower[i][0]) {
                availableSlot = i;
                break;
            }
        }
        
        if (availableSlot) {
            appState.rooms.firepower[availableSlot] = [{
                phone: sourceAccount.phone,
                user: sourceAccount.user,
                groups: sourceAccount.availableGroups || [],
                selectedGroups: sourceAccount.selectedGroups || [],
                active: true
            }];
            console.log(`✅ ${phone}을 화력 ${availableSlot}번으로 이동`);
        }
    }
}

// 🔧 마스터 계정 목록 관리 시스템

// 마스터 계정 목록에 추가/업데이트
function addToMasterAccountList(accountInfo) {
    let masterAccounts = getMasterAccountList();
    const normalizedPhone = normalizePhone(accountInfo.phone);
    
    // 기존 계정 찾기
    const existingIndex = masterAccounts.findIndex(acc => 
        normalizePhone(acc.phone) === normalizedPhone
    );
    
    if (existingIndex >= 0) {
        // 기존 계정 업데이트
        masterAccounts[existingIndex] = {
            ...masterAccounts[existingIndex],
            ...accountInfo,
            lastUpdated: Date.now()
        };
        console.log(`🔄 마스터 목록 업데이트: ${accountInfo.phone}`);
    } else {
        // 새 계정 추가
        masterAccounts.push({
            ...accountInfo,
            addedAt: Date.now(),
            lastUpdated: Date.now()
        });
        console.log(`✅ 마스터 목록 추가: ${accountInfo.phone}`);
    }
    
    // 저장
    localStorage.setItem('masterAccountList', JSON.stringify(masterAccounts));
}

// 마스터 계정 목록 가져오기
function getMasterAccountList() {
    const saved = localStorage.getItem('masterAccountList');
    return saved ? JSON.parse(saved) : [];
}

// 계정 배치 처리 (중복 방지 포함)
function placeAccountInCorrectSection(accountInfo) {
    const normalizedPhone = normalizePhone(accountInfo.phone);
    
    // 1. 이미 배치된 계정인지 확인
    const existsInExpert = appState.rooms.expert.some(room => 
        room && normalizePhone(room.phone) === normalizedPhone
    );
    const existsInFirepower = Object.values(appState.rooms.firepower).some(rooms => 
        rooms && rooms[0] && normalizePhone(rooms[0].phone) === normalizedPhone
    );
    
    if (existsInExpert || existsInFirepower) {
        console.log(`⚠️ 이미 배치된 계정: ${accountInfo.phone}`);
        return; // 이미 배치됨
    }
    
    // 2. 설정된 타입에 따라 배치
    const accountType = getAccountTypeFromApiConfig(accountInfo.phone) || 'firepower';
    
    if (accountType === 'expert') {
        // 전문가 섹션에 추가
        const expertRoom = {
            phone: accountInfo.phone,
            user: accountInfo.user,
            selectedGroups: accountInfo.groups ? normalizeGroupData(accountInfo.groups, false) : [],
            availableGroups: accountInfo.groups || [],
            active: true,
            enabled: true
        };
        
        appState.rooms.expert.push(expertRoom);
        console.log(`👨‍💼 전문가 섹션에 배치: ${accountInfo.phone}`);
        
    } else {
        // 화력 섹션에 추가
        let availableSlot = null;
        for (let i = 1; i <= 30; i++) {
            if (!appState.rooms.firepower[i] || !appState.rooms.firepower[i][0]) {
                availableSlot = i;
                break;
            }
        }
        
        if (availableSlot) {
            appState.rooms.firepower[availableSlot] = [{
                phone: accountInfo.phone,
                user: accountInfo.user,
                groups: accountInfo.groups || [],
                selectedGroups: [],
                active: true
            }];
            console.log(`🔥 화력 ${availableSlot}번에 배치: ${accountInfo.phone}`);
        } else {
            console.warn(`⚠️ 사용 가능한 화력 슬롯이 없음: ${accountInfo.phone}`);
        }
    }
}

// 마스터 목록에서 모든 계정 재배치
function redistributeAllAccounts() {
    console.log('🔧 마스터 목록에서 모든 계정 재배치 시작...');
    
    // 기존 배치 초기화
    appState.rooms.expert = [];
    appState.rooms.firepower = {};
    
    // 마스터 목록에서 모든 계정 재배치
    const masterAccounts = getMasterAccountList();
    masterAccounts.forEach(accountInfo => {
        placeAccountInCorrectSection(accountInfo);
    });
    
    // UI 업데이트
    renderExpertRooms();
    renderFirepowerAccountsList();
    renderFirepowerRooms(appState.activeFirepower);
    updateSelectedGroupCount();
    saveToLocalStorage();
    
    console.log(`✅ 재배치 완료: ${masterAccounts.length}개 계정`);
}

// 페이지 로드 시 자동 실행 제거 (API 관리에서 직접 제어)

// 로그인된 계정 디버깅 함수
async function debugLoggedAccounts() {
    try {
        console.log('🔍 서버에서 로그인된 계정 확인 중...');
        const response = await fetch('http://127.0.0.1:5000/api/get-logged-accounts');
        const data = await response.json();
        
        if (data.success) {
            console.log('📊 서버 로그인 계정 상태:');
            data.accounts.forEach((account, index) => {
                console.log(`${index + 1}. ${account.phone} - ${account.status} (${account.user ? account.user.first_name : 'Unknown'})`);
                
                // 10번 계정 특별 체크
                if (account.phone === '+821080670664') {
                    console.log(`🚨 10번 계정 상태 상세:`, account);
                }
            });
            
            // LocalStorage 상태와 비교
            console.log('💾 LocalStorage 상태:');
            console.log('Expert rooms:', appState.rooms.expert);
            console.log('Firepower rooms:', appState.rooms.firepower);
            
        } else {
            console.error('❌ 서버에서 계정 정보를 가져올 수 없습니다:', data.error);
        }
    } catch (error) {
        console.error('❌ 로그인 계정 확인 중 오류:', error);
    }
}

// 페이지 닫기 전 자동 저장
window.addEventListener('beforeunload', () => {
    console.log('💾 페이지 닫기 전 데이터 자동 저장');
    saveToLocalStorage();
});

// 페이지 숨김/보임 처리 (모바일 대응)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 페이지 숨김 - 데이터 저장');
        saveToLocalStorage();
    } else {
        console.log('📱 페이지 보임 - 자동 동기화 비활성화됨');
        // 페이지가 다시 보일 때 서버와 자동 동기화 (비활성화)
        // setTimeout(() => {
        //     syncWithServer();
        // }, 500);
    }
});

// 🔄 실시간 동기화 시스템
let syncInterval = null;
let lastSyncTime = null;

// 서버와 동기화하는 통합 함수
async function syncWithServer() {
    try {
        console.log('🔄 서버 동기화 시작...');
        const syncedAccounts = await loadAccountsFromServer();
        
        if (syncedAccounts && syncedAccounts.length > 0) {
            lastSyncTime = new Date();
            console.log(`✅ 동기화 완료: ${syncedAccounts.length}개 계정, 시간: ${lastSyncTime.toLocaleTimeString()}`);
            
            // 동기화 상태 UI 업데이트
            updateSyncStatus('success', `마지막 동기화: ${lastSyncTime.toLocaleTimeString()}`);
        } else {
            console.log('📭 동기화할 계정이 없습니다.');
            updateSyncStatus('warning', '동기화할 계정 없음');
        }
    } catch (error) {
        console.error('❌ 동기화 실패:', error);
        updateSyncStatus('error', '동기화 실패');
    }
}

// 동기화 상태 UI 업데이트
function updateSyncStatus(status, message) {
    // 기존 상태 표시 요소가 있으면 업데이트
    let statusElement = document.getElementById('syncStatus');
    if (!statusElement) {
        // 상태 표시 요소 생성
        const headerElement = document.querySelector('header .api-status');
        if (headerElement) {
            statusElement = document.createElement('span');
            statusElement.id = 'syncStatus';
            statusElement.style.marginLeft = '20px';
            headerElement.appendChild(statusElement);
        }
    }
    
    if (statusElement) {
        statusElement.className = `sync-status ${status}`;
        statusElement.textContent = message;
    }
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    console.log(`✅ ${message}`);
    // 간단한 알림 표시 (기존 알림 시스템이 있다면 재사용)
    if (typeof alert !== 'undefined') {
        // alert 대신 더 나은 알림 시스템이 있다면 교체 가능
        setTimeout(() => {
            alert(`✅ ${message}`);
        }, 100);
    }
}

// 오류 메시지 표시
function showErrorMessage(message) {
    console.error(`❌ ${message}`);
    // 간단한 알림 표시 (기존 알림 시스템이 있다면 재사용)
    if (typeof alert !== 'undefined') {
        setTimeout(() => {
            alert(`❌ ${message}`);
        }, 100);
    }
}

// 자동 동기화 시작
function startAutoSync() {
    // 기존 인터벌 정리
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // 설정에 따른 자동 동기화 (비활성화됨)
    if (false) { // appState.autoSync.enabled 비활성화
        syncInterval = setInterval(() => {
            console.log('⏰ 자동 동기화 실행...');
            syncWithServer();
        }, 60000); // appState.autoSync.interval
        console.log(`🔄 자동 동기화 시작됨`);
    } else {
        console.log('🚫 자동 동기화 비활성화됨 (수동 새로고침만 가능)');
    }
}

// 자동 동기화 중지
function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('⏹️ 자동 동기화 중지됨');
    }
}

// 자동 동기화 토글
function toggleAutoSync() {
    appState.autoSync.enabled = !appState.autoSync.enabled;
    
    if (appState.autoSync.enabled) {
        startAutoSync();
        console.log('✅ 자동 동기화 활성화됨');
    } else {
        stopAutoSync();
        console.log('❌ 자동 동기화 비활성화됨');
    }
    
    saveToLocalStorage();
    return appState.autoSync.enabled;
}

// 새로고침 버튼 이벤트 핸들러 업그레이드
function setupSyncEventListeners() {
    // 새로고침 버튼 찾기
    const refreshBtn = document.getElementById('refreshAllGroupsBtn');
    if (refreshBtn) {
        // 기존 이벤트 리스너 제거 후 새로운 동기화 기능 추가
        refreshBtn.onclick = async function() {
            this.disabled = true;
            this.textContent = '🔄 동기화 중...';
            
            try {
                console.log('🔄 수동 새로고침 버튼 - 서버 동기화 비활성화됨');
                // await syncWithServer(); // 비활성화
                this.textContent = '🔄';
                setTimeout(() => {
                    this.disabled = false;
                }, 1000); // 1초 후 버튼 활성화
            } catch (error) {
                this.textContent = '❌';
                setTimeout(() => {
                    this.textContent = '🔄';
                    this.disabled = false;
                }, 2000); // 2초 후 복구
            }
        };
        
        console.log('✅ 새로고침 버튼에 동기화 기능 연결됨');
    }
    
    // 키보드 단축키 지원 (Ctrl+R 또는 F5) - 일반 새로고침 허용
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
            // e.preventDefault(); // 기본 새로고침 허용
            console.log('🔄 키보드 단축키 새로고침 - 일반 새로고침 허용');
            // syncWithServer(); // 비활성화
        }
    });
}

// 동기화 시스템 초기화 (init 함수 실행 후)
function initializeSyncSystem() {
    // 이벤트 리스너 설정
    setupSyncEventListeners();
    
    // 자동 동기화 시작
    startAutoSync();
    
    console.log('🔄 동기화 시스템 초기화 완료');
}

// init 함수 실행 후 동기화 활성화
setTimeout(() => {
    initializeSyncSystem();
}, 3000); // 3초 후 실행 (init 완료 대기)

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    console.log('💾 페이지 종료 - 동기화 정리');
    stopAutoSync();
    saveToLocalStorage();
});

// ============== API 관리 기능 ==============

// API 관리 모달 열기
function showApiManager() {
    if (!elements.apiManagerModal) return;
    
    elements.apiManagerModal.classList.add('active');
    renderApiManagerContent(); // 새로운 API 관리 렌더링
}

// API 관리 모달 닫기
function closeApiManager() {
    if (!elements.apiManagerModal) return;
    elements.apiManagerModal.classList.remove('active');
}

// API 탭 전환
function switchApiTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.api-manager-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // 탭 내용 표시
    document.querySelectorAll('.api-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}ApiTab`);
    });
}

// 서버에서 API 설정 로드
async function loadApiConfigs() {
    try {
        const response = await fetch(`${API_BASE_URL}/get-api-configs`);
        const data = await response.json();
        
        if (data.success) {
            renderApiList('expert', data.configs.expert || []);
            renderApiList('firepower', data.configs.firepower || []);
        } else {
            console.error('Failed to load API configs:', data.error);
            // 임시로 현재 등록된 계정에서 추출
            extractCurrentApiConfigs();
        }
    } catch (error) {
        console.error('Error loading API configs:', error);
        // 임시로 현재 등록된 계정에서 추출
        extractCurrentApiConfigs();
    }
}

// 현재 등록된 계정에서 API 설정 추출 (서버 API가 없을 경우)
function extractCurrentApiConfigs() {
    const expertConfigs = [];
    const firepowerConfigs = [];
    
    // 전문가 계정에서 추출
    if (appState.rooms.expert) {
        appState.rooms.expert.forEach(room => {
            if (room.phone) {
                expertConfigs.push({
                    phone: room.phone,
                    api_id: 'Unknown',
                    api_hash: 'Unknown',
                    type: 'expert'
                });
            }
        });
    }
    
    // 화력 계정에서 추출
    Object.keys(appState.rooms.firepower).forEach(firepowerNum => {
        const room = appState.rooms.firepower[firepowerNum] && appState.rooms.firepower[firepowerNum][0];
        if (room && room.phone) {
            firepowerConfigs.push({
                phone: room.phone,
                api_id: 'Unknown',
                api_hash: 'Unknown',
                type: 'firepower',
                firepower_number: parseInt(firepowerNum)
            });
        }
    });
    
    renderApiList('expert', expertConfigs);
    renderApiList('firepower', firepowerConfigs);
}

// API 목록 렌더링
function renderApiList(type, configs) {
    const listElement = type === 'expert' ? elements.expertApiList : elements.firepowerApiList;
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    if (configs.length === 0) {
        listElement.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px;">
                등록된 ${type === 'expert' ? '전문가' : '화력'} API가 없습니다.
            </div>
        `;
        return;
    }
    
    configs.forEach((config, index) => {
        const apiItem = document.createElement('div');
        apiItem.className = 'api-item';
        
        const firepowerInfo = config.firepower_number ? ` (화력 ${config.firepower_number}번)` : '';
        
        apiItem.innerHTML = `
            <div class="api-item-info">
                <div class="api-item-phone">${config.phone}${firepowerInfo}</div>
                <div class="api-item-details">
                    <span class="api-item-type ${type}">${type === 'expert' ? '전문가' : '화력'}</span>
                    API ID: ${config.api_id} | Hash: ${config.api_hash ? config.api_hash.substring(0, 8) + '...' : 'Unknown'}
                </div>
            </div>
            <div class="api-item-actions">
                <button class="btn-edit-api" onclick="editApiConfig('${type}', ${index})">수정</button>
                <button class="btn-delete-api" onclick="deleteApiConfig('${type}', ${index})">삭제</button>
            </div>
        `;
        
        listElement.appendChild(apiItem);
    });
}

// API 설정 추가
function addApiConfig(type) {
    currentEditingApi = { type, index: -1 }; // 새 API 추가
    
    elements.apiEditTitle.textContent = `${type === 'expert' ? '전문가' : '화력'} API 추가`;
    elements.apiEditPhone.value = '';
    elements.apiEditId.value = '';
    elements.apiEditHash.value = '';
    elements.apiEditType.value = type;
    elements.apiEditFirepowerNumber.value = '';
    
    toggleFirepowerNumberField();
    elements.apiEditModal.classList.add('active');
}

// API 설정 수정
function editApiConfig(type, index) {
    // 임시: 수정 기능은 나중에 구현
    alert('수정 기능은 곧 구현됩니다.');
}

// API 설정 삭제
async function deleteApiConfig(type, index) {
    const apiList = type === 'expert' ? appState.api.expert : appState.api.firepower;
    const apiConfig = apiList[index];
    
    if (!apiConfig) {
        alert('삭제할 API가 없습니다.');
        return;
    }
    
    if (confirm(`이 ${type === 'expert' ? '전문가' : '화력'} API를 삭제하시겠습니까?\n계정: ${apiConfig.phone}\n\n⚠️ 서버에서도 완전히 삭제됩니다.`)) {
        try {
            // 서버에서 API 삭제
            const response = await fetch('/api/delete-user-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: apiConfig.phone })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 로컬에서도 삭제
                apiList.splice(index, 1);
                saveToLocalStorage();
                renderApiList();
                
                console.log(`✅ ${type} API 완전 삭제 완료:`, result);
                alert(`API가 서버에서 완전히 삭제되었습니다.\n삭제된 세션 파일: ${result.removed_files?.length || 0}개`);
            } else {
                console.error('❌ API 삭제 실패:', result.error);
                alert(`API 삭제 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ API 삭제 요청 오류:', error);
            alert(`API 삭제 요청 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}

// 화력 번호 필드 토글
function toggleFirepowerNumberField() {
    const isFirepower = elements.apiEditType.value === 'firepower';
    elements.firepowerNumberGroup.style.display = isFirepower ? 'block' : 'none';
}

// API 편집 모달 닫기
function closeApiEditModal() {
    elements.apiEditModal.classList.remove('active');
    currentEditingApi = null;
}

// API 편집 저장
async function saveApiEdit() {
    const phone = elements.apiEditPhone.value.trim();
    const apiId = elements.apiEditId.value.trim();
    const apiHash = elements.apiEditHash.value.trim();
    const type = elements.apiEditType.value;
    const firepowerNumber = elements.apiEditFirepowerNumber.value.trim();
    
    if (!phone || !apiId || !apiHash) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    if (type === 'firepower' && !firepowerNumber) {
        alert('화력 번호를 입력해주세요.');
        return;
    }
    
    const config = {
        phone: normalizePhone(phone),
        api_id: parseInt(apiId),
        api_hash: apiHash,
        type: type
    };
    
    if (type === 'firepower') {
        config.firepower_number = parseInt(firepowerNumber);
    }
    
    try {
        // 서버에 API 설정 저장 요청
        const response = await fetch(`${API_BASE_URL}/save-api-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('API 설정이 저장되었습니다.');
            closeApiEditModal();
            loadApiConfigs(); // 목록 새로고침
        } else {
            alert(`저장 실패: ${result.error}`);
        }
    } catch (error) {
        console.error('API config save error:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 전체 API 설정 저장
async function saveApiConfigs() {
    try {
        alert('전체 설정이 저장되었습니다.');
        closeApiManager();
    } catch (error) {
        console.error('Save API configs error:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 현재 편집 중인 API 정보
let currentEditingApi = null;

// 초기화 실행
document.addEventListener('DOMContentLoaded', init);