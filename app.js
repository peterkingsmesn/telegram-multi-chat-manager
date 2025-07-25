// 애플리케이션 상태 관리
const appState = {
    apis: [],
    expertApis: [], // 전문가 섹션 API들
    activeFirepower: 1,
    rooms: {
        expert: [],
        firepower: {} // 1-30까지 각각 독립적으로 관리
    },
    currentRoom: null,
    templates: [], // 메시지 템플릿
    currentPhone: null, // 현재 연결된 전화번호
    currentUser: null // 현재 로그인한 사용자 정보
};

// DOM 요소들을 저장할 객체
let elements = {};

// 초기화
function init() {
    console.log('=== Initializing app ===');
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
        refreshAllGroupsBtn: document.getElementById('refreshAllGroupsBtn')
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
    
    const room = appState.rooms.firepower[firepower][0];
    
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
            room.selectedGroups.forEach((group, index) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'selected-group-item';
                const isActive = group.active !== false; // 기본값은 true
                groupDiv.innerHTML = `
                    <input type="checkbox" id="group-${firepower}-${index}" ${isActive ? 'checked' : ''} onchange="toggleGroupInFirepower(${firepower}, ${index})">
                    <label for="group-${firepower}-${index}">${group.name}</label>
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
    const message = elements.messageTextarea.value.trim();
    if (!message) {
        showErrorMessage('메시지를 입력해주세요.');
        return;
    }
    
    // 선택된 그룹들 가져오기
    const selectedGroups = getSelectedGroups();
    
    // 만약 선택된 그룹이 없으면 전문가 계정의 모든 그룹을 강제로 선택
    if (selectedGroups.length === 0) {
        // 전문가 계정이 있으면 모든 그룹 추가
        if (appState.rooms.expert && appState.rooms.expert.length > 0) {
            appState.rooms.expert.forEach((room, index) => {
                if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
                    room.selectedGroups.forEach((group) => {
                        selectedGroups.push({
                            phone: room.phone,
                            groupId: group.id,
                            groupTitle: group.name || group.title,
                            accountType: 'expert',
                            accountIndex: index
                        });
                    });
                }
            });
        }
        
        // 여전히 0개면 에러
        if (selectedGroups.length === 0) {
            showErrorMessage('전송할 그룹을 선택해주세요.');
            return;
        }
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
                            message: message,
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
                
                // 전송 간격
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            // 텍스트만 전송
            for (const group of selectedGroups) {
                try {
                    const response = await fetch(`${API_BASE_URL}/send-message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            phone: group.phone,
                            group_ids: [group.groupId],
                            message: message
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        totalSent++;
                        console.log(`Message sent to ${group.phone} - ${group.groupId}`);
                    } else {
                        totalFailed++;
                        console.error(`Failed to send to ${group.phone}:`, result.error);
                    }
                } catch (error) {
                    totalFailed++;
                    console.error(`Error sending to ${group.phone}:`, error);
                }
                
                // 전송 간격
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // 결과 표시
        if (totalSent > 0) {
            showSuccessMessage(`메시지 전송 완료: 성공 ${totalSent}개, 실패 ${totalFailed}개`);
            
            // 전송 성공 시 입력창과 첨부파일 초기화
            elements.messageTextarea.value = '';
            elements.attachedFiles.innerHTML = '';
        } else {
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

// 선택된 그룹들 가져오기
function getSelectedGroups() {
    const selectedGroups = [];
    
    // 전문가 계정들의 선택된 그룹 - 화력과 동일한 방식으로 처리
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((room, index) => {
            if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
                room.selectedGroups.forEach((group) => {
                    // 화력과 동일하게 active 체크
                    if (group.active !== false) {
                        selectedGroups.push({
                            phone: room.phone,
                            groupId: group.id,
                            groupTitle: group.name || group.title,
                            accountType: 'expert',
                            accountIndex: index
                        });
                    }
                });
            }
        });
    }
    
    // 화력별 계정들의 선택된 그룹 (현재 활성 화력만)
    const currentFirepowerRoom = appState.rooms.firepower[appState.activeFirepower] && appState.rooms.firepower[appState.activeFirepower][0];
    if (currentFirepowerRoom && currentFirepowerRoom.phone && currentFirepowerRoom.selectedGroups && currentFirepowerRoom.selectedGroups.length > 0) {
        currentFirepowerRoom.selectedGroups.forEach(group => {
            if (group.active !== false) { // active가 false가 아니면 선택됨
                selectedGroups.push({
                    phone: currentFirepowerRoom.phone,
                    groupId: group.id,
                    groupTitle: group.name || group.title,
                    accountType: 'firepower',
                    accountIndex: appState.activeFirepower
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
    const stateToSave = {
        ...appState,
        timestamp: Date.now()
    };
    localStorage.setItem('telegramWorldState', JSON.stringify(stateToSave));
    console.log('Data saved to localStorage:', stateToSave);
}

// 저장된 데이터 로드 (강화된 버전)
function loadSavedData() {
    try {
        const saved = localStorage.getItem('telegramWorldState');
        if (saved) {
            const savedState = JSON.parse(saved);
            console.log('Loading saved data:', savedState);
            
            // 데이터 복원
            Object.assign(appState, savedState);
            
            // UI 업데이트
            renderApiGrid();
            renderExpertRooms();
            renderFirepowerAccountsList();
            
            // 저장된 화력 탭 복원
            if (appState.activeFirepower && appState.activeFirepower !== 1) {
                switchFirepower(appState.activeFirepower);
            } else {
                renderFirepowerRooms(1);
            }
            
            console.log('Data loaded successfully');
            
            // 등록된 계정들의 그룹 목록을 실시간으로 새로고침 (비동기로 실행)
            setTimeout(() => {
                refreshAllAccountGroups();
            }, 1000);
        } else {
            console.log('No saved data found');
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
        // 데이터가 손상된 경우 초기화
        localStorage.removeItem('telegramWorldState');
    }
}

// 전문가 API 저장
function saveExpertApi() {
    const apiKey = elements.expertApiKeyInput.value.trim();
    const botName = elements.expertBotNameInput.value.trim();
    const groupId = elements.expertGroupIdInput.value.trim();
    
    if (!apiKey || !botName || !groupId) {
        alert('모든 정보를 입력해주세요.');
        return;
    }
    
    appState.expertApis.push({
        apiKey,
        botName,
        groupId,
        active: true
    });
    
    renderExpertRooms();
    elements.expertApiModal.classList.remove('active');
    clearExpertApiModal();
    saveToLocalStorage();
}

// 전문가 API 모달 초기화
function clearExpertApiModal() {
    elements.expertApiKeyInput.value = '';
    elements.expertBotNameInput.value = '';
    elements.expertGroupIdInput.value = '';
}

// 전문가 방 렌더링
function renderExpertRooms() {
    if (!elements.expertRooms) return;
    
    elements.expertRooms.innerHTML = '';
    
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((room, index) => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card expert-card';
            
            const userName = room.user ? room.user.first_name || room.user.username : '알 수 없음';
            const groupCount = room.selectedGroups ? room.selectedGroups.filter(g => g.active !== false).length : 0;
            const phone = room.phone || '알 수 없음';
            
            roomCard.innerHTML = `
                <div class="room-header">
                    <h3>🔹 ${userName} (${phone})</h3>
                    <span class="room-status ${room.active ? 'active' : 'inactive'}">${room.active ? '활성' : '비활성'}</span>
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
                    <button class="btn-remove" onclick="removeExpertRoom(${index})">삭제</button>
                </div>
            `;
            elements.expertRooms.appendChild(roomCard);
            
            // 그룹 목록 렌더링
            renderExpertGroups(index, room);
        });
    } else {
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
    
    try {
        const response = await fetch(`${API_BASE_URL}/get-groups`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: room.phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 모든 그룹을 저장 (기본적으로 모두 체크된 상태)
            room.selectedGroups = data.groups.map(group => ({
                id: group.id,
                name: group.title,
                active: true
            }));
            
            renderExpertRooms();
            saveToLocalStorage();
            alert(`${data.groups.length}개 그룹이 새로고침되었습니다.`);
        } else {
            alert(`그룹 로드 실패: ${data.error}`);
        }
    } catch (error) {
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

// 전문가 API 삭제
function removeExpertRoom(index) {
    if (confirm('이 전문가 API를 삭제하시겠습니까?')) {
        appState.rooms.expert.splice(index, 1);
        renderExpertRooms();
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
    
    // 전문가 계정들의 그룹
    if (appState.rooms.expert && appState.rooms.expert.length > 0) {
        appState.rooms.expert.forEach((room, index) => {
            if (room && room.phone && room.groups && room.groups.length > 0) {
                // 계정 헤더
                const accountHeader = document.createElement('div');
                accountHeader.className = 'account-header';
                accountHeader.innerHTML = `
                    <h4>전문가 ${index + 1}: ${room.username || ''}(${room.phone})</h4>
                    <label>
                        <input type="checkbox" class="account-toggle" data-account-type="expert" data-account-index="${index}">
                        모든 그룹 선택
                    </label>
                `;
                groupList.appendChild(accountHeader);
                
                // 해당 계정의 그룹들
                room.groups.forEach(group => {
                    const checkbox = document.createElement('label');
                    checkbox.className = 'group-item';
                    checkbox.innerHTML = `
                        <input type="checkbox" name="groups" value="expert-${index}-${group.id}" data-account-type="expert" data-account-index="${index}">
                        &nbsp;&nbsp;&nbsp;&nbsp;${group.title}
                    `;
                    groupList.appendChild(checkbox);
                });
            }
        });
    }
    
    // 화력별 계정들의 그룹
    for (const firepower of Object.keys(appState.rooms.firepower)) {
        const room = appState.rooms.firepower[firepower][0];
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
                await new Promise(resolve => setTimeout(resolve, 1000));
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
                await new Promise(resolve => setTimeout(resolve, 1000));
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
    const templateList = document.getElementById('templateList');
    
    if (!templateList) {
        console.error('templateList element not found!');
        return;
    }
    
    // 먼저 섹션이 보이는지 확인
    const section = document.querySelector('.message-templates');
    console.log('Message templates section exists:', !!section);
    if (section) {
        console.log('Section display style:', window.getComputedStyle(section).display);
    }
    
    templateList.innerHTML = '';
    
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
                }, 500);
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
            }, 500);
        } else {
            showConnectionStatus(data.error || '인증 실패', 'error');
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
        active: true
    };
    
    // 기존 API가 있으면 업데이트, 없으면 추가
    let existingIndex = appState.rooms.expert.findIndex(room => room.phone === appState.currentPhone);
    if (existingIndex !== -1) {
        appState.rooms.expert[existingIndex] = newExpertApi;
    } else {
        appState.rooms.expert.push(newExpertApi);
    }
    
    // 모달 닫기
    elements.expertApiModal.classList.remove('active');
    
    // UI 업데이트
    showConnectionStatus(`${selectedGroups.length}개 그룹 선택됨`, 'success');
    renderExpertRooms(); // 전문가 섹션 UI 새로고침
    saveToLocalStorage();
}

// 화력별 그룹 불러오기
async function loadGroupsForFirepower(firepower) {
    const room = appState.rooms.firepower[firepower]?.[0];
    
    if (!room || !room.phone) {
        return;
    }
    
    try {
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
            // 기존에 선택된 그룹 ID들 저장
            const previouslySelectedIds = room.selectedGroups ? 
                room.selectedGroups.map(g => g.id) : [];
            
            console.log(`Firepower ${firepower}: Got ${data.groups.length} groups, ${previouslySelectedIds.length} previously selected`);
            
            // 기존 선택된 그룹이 없다면 모든 그룹을 선택 상태로 설정 (최초 로드)
            if (previouslySelectedIds.length === 0) {
                room.selectedGroups = data.groups.map(group => ({
                    id: group.id,
                    title: group.title,
                    name: group.title,
                    active: true
                }));
                console.log(`Firepower ${firepower}: First time load, selected all ${data.groups.length} groups`);
            } else {
                // 기존에 선택된 그룹 중에서 현재도 존재하는 그룹만 유지
                room.selectedGroups = data.groups
                    .filter(group => previouslySelectedIds.includes(group.id))
                    .map(group => ({
                        id: group.id,
                        title: group.title,
                        name: group.title,
                        active: true
                    }));
                console.log(`Firepower ${firepower}: Updated, ${room.selectedGroups.length} groups remain selected`);
            }
            
            // 사용 가능한 모든 그룹 저장 (그룹 선택 모달에서 사용)
            room.availableGroups = data.groups;
            
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
    
    const room = appState.rooms.firepower[firepower][0];
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
            <input type="tel" id="firepowerPhoneInput" placeholder="전화번호 (예: +821012345678)">
            <button id="firepowerConnectBtn" class="btn-connect-api">연결하기</button>
            
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
    const verifyBtn = modal.querySelector('#firepowerVerifyBtn');
    
    connectBtn.onclick = () => connectFirepowerAPI(firepower);
    verifyBtn.onclick = () => verifyFirepowerCode(firepower);
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
            const existingRoom = appState.rooms.firepower[existingFirepower][0];
            const room = appState.rooms.firepower[firepower][0];
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
                const room = appState.rooms.firepower[firepower][0];
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
            const room = appState.rooms.firepower[firepower][0];
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
        } else {
            showFirepowerConnectionStatus(data.error || '인증 실패', 'error');
        }
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
function deleteFirepowerApi(firepower) {
    const room = appState.rooms.firepower[firepower]?.[0];
    if (!room || !room.phone) {
        alert('삭제할 API가 없습니다.');
        return;
    }
    
    if (confirm(`화력 ${firepower}의 API 연결을 삭제하시겠습니까?\n연결된 계정: ${room.user?.first_name || room.phone}`)) {
        // 정보 삭제
        room.phone = null;
        room.user = null;
        room.selectedGroups = [];
        room.active = false;
        
        saveToLocalStorage();
        renderFirepowerRooms(firepower);
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
            // active가 true인 그룹만 필터링
            const activeGroups = room.selectedGroups.filter(g => g.active !== false);
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
];

let autoSetupState = {
    active: false,
    currentFirepower: 1,
    currentPhone: '',
    maxFirepower: 7
};

// 자동 등록 시작
async function startAutoSetup() {
    if (autoSetupState.active) {
        alert('이미 자동 등록이 진행 중입니다.');
        return;
    }
    
    if (!confirm('화력 1-7까지 자동으로 API를 등록하시겠습니까?\n각 단계에서 인증 코드만 입력하시면 됩니다.')) {
        return;
    }
    
    autoSetupState.active = true;
    autoSetupState.currentFirepower = 1;
    
    // 버튼 상태 변경
    elements.autoSetupBtn.textContent = '🔄 자동 등록 진행 중...';
    elements.autoSetupBtn.disabled = true;
    
    await processNextFirepower();
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
        
        alert('화력 1-7까지 자동 등록이 완료되었습니다!');
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
    
    const room = appState.rooms.firepower[firepower][0];
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
        
        // 전문가 계정들 (모든 그룹에 전송)
        if (appState.rooms.expert && appState.rooms.expert.length > 0) {
            appState.rooms.expert.forEach((room, index) => {
                if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
                    targetAccounts.push({
                        phone: room.phone,
                        groupIds: room.selectedGroups.map(g => g.id),
                        type: 'expert'
                    });
                }
            });
        }
        
        // 화력별 계정들 (활성 그룹만)
        for (const firepower of Object.keys(appState.rooms.firepower)) {
            const room = appState.rooms.firepower[firepower][0];
            if (room && room.phone && room.selectedGroups && room.selectedGroups.length > 0) {
                const activeGroups = room.selectedGroups.filter(g => g.active !== false);
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
        
        // 진짜 랜덤 선택을 위한 개선된 로직
        for (let i = 0; i < targetAccounts.length; i++) {
            const account = targetAccounts[i];
            try {
                // 매번 완전히 랜덤하게 이미지 선택
                const randomIndex = Math.floor(Math.random() * allImages.length);
                const selectedImage = allImages[randomIndex];
                
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
                    console.log(`Profit verification sent to ${account.phone} with random image ${randomIndex + 1}/${allImages.length}`);
                } else {
                    console.error(`Failed to send to ${account.phone}:`, result.error);
                }
            } catch (error) {
                console.error(`Error sending to ${account.phone}:`, error);
            }
            
            // 전송 간격
            await new Promise(resolve => setTimeout(resolve, 1000));
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
        const room = appState.rooms.firepower[firepower][0];
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
    
    // 전문가 그룹
    if (appState.rooms.expert) {
        appState.rooms.expert.forEach(room => {
            if (room.selectedGroups && room.phone) {
                room.selectedGroups.forEach(group => {
                    groups.push({ id: group.id, phone: room.phone });
                });
            }
        });
    }
    
    // 화력 그룹
    Object.keys(appState.rooms.firepower).forEach(firepower => {
        const room = appState.rooms.firepower[firepower][0];
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
        const room = appState.rooms.firepower[firepower][0];
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
    const groups = [];
    const checkboxes = document.querySelectorAll('#profitSelectedGroups input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        groups.push({
            id: checkbox.value,
            phone: checkbox.dataset.phone
        });
    });
    
    return groups;
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
        const room = appState.rooms.firepower[firepower][0];
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
            </div>
        `;
    }).join('');
}

// 모든 등록된 계정의 그룹 목록 새로고침
async function refreshAllAccountGroups() {
    console.log('Refreshing all account groups...');
    
    try {
        // 서버가 실행 중인지 먼저 확인
        try {
            const testResponse = await fetch(`${API_BASE_URL}/proxy-status`);
            if (!testResponse.ok) {
                console.log('Server not available, skipping group refresh');
                return;
            }
        } catch (serverError) {
            console.log('Server not available, skipping group refresh');
            return;
        }
        
        // 전문가 계정들 새로고침
        if (appState.rooms.expert && appState.rooms.expert.length > 0) {
            for (let i = 0; i < appState.rooms.expert.length; i++) {
                const room = appState.rooms.expert[i];
                if (room && room.phone) {
                    console.log(`Refreshing expert groups for ${room.phone}`);
                    await refreshAccountGroups(room.phone, 'expert', i);
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 간격
                }
            }
        }
        
        // 화력별 계정들 새로고침
        for (const firepower of Object.keys(appState.rooms.firepower)) {
            const room = appState.rooms.firepower[firepower][0];
            if (room && room.phone) {
                console.log(`Refreshing firepower ${firepower} groups for ${room.phone}`);
                await refreshAccountGroups(room.phone, 'firepower', firepower);
                await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 간격
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

// 특정 계정의 그룹 목록 새로고침
async function refreshAccountGroups(phone, type, index) {
    try {
        const response = await fetch(`${API_BASE_URL}/get-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        
        if (!response.ok) {
            if (response.status === 400) {
                console.log(`Account ${phone} not connected, attempting auto-connection...`);
                // 400 에러면 자동 연결 시도
                const connectResult = await autoConnectAccount(phone);
                if (connectResult) {
                    // 연결 성공시 다시 그룹 목록 요청
                    console.log(`Auto-connection successful for ${phone}, retrying groups...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                    return refreshAccountGroups(phone, type, index); // 재귀 호출
                }
            }
            console.warn(`Server error for ${phone}: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.groups) {
            console.log(`Loaded ${data.groups.length} groups for ${phone}`);
            
            // 기존에 선택된 그룹 ID들 저장
            let previouslySelectedIds = [];
            let targetRoom = null;
            
            if (type === 'expert') {
                targetRoom = appState.rooms.expert[index];
            } else if (type === 'firepower') {
                targetRoom = appState.rooms.firepower[index] && appState.rooms.firepower[index][0];
            }
            
            if (targetRoom && targetRoom.selectedGroups) {
                previouslySelectedIds = targetRoom.selectedGroups.map(g => g.id);
            }
            
            // 새로운 그룹 목록에서 기존에 선택된 그룹들만 유지
            const updatedSelectedGroups = data.groups
                .filter(group => previouslySelectedIds.includes(group.id))
                .map(group => ({
                    id: group.id,
                    title: group.title,
                    name: group.title,
                    active: true
                }));
            
            // 상태 업데이트
            if (targetRoom) {
                targetRoom.selectedGroups = updatedSelectedGroups;
                targetRoom.availableGroups = data.groups;
                console.log(`Updated ${type} ${index}: ${updatedSelectedGroups.length} groups remain selected`);
            }
            
        } else {
            console.warn(`Failed to load groups for ${phone}:`, data.error || 'Unknown error');
        }
    } catch (error) {
        console.error(`Error refreshing groups for ${phone}:`, error);
        // 에러가 발생해도 계속 진행
    }
}

// 초기화 실행
document.addEventListener('DOMContentLoaded', init);