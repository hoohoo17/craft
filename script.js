// 게임 상태 관리
const gameState = {
    score: 0,
    turn: 1,
    selectedElement: null,
    board: Array(8).fill().map(() => Array(8).fill(null)),
    availableElements: [
        { id: 'water', name: '물', color: '#3498db' },
        { id: 'fire', name: '불', color: '#e74c3c' },
        { id: 'earth', name: '흙', color: '#8e44ad' },
        { id: 'air', name: '공기', color: '#2ecc71' }
    ],
    // 원소 조합 규칙 추가
    combinations: {
        'fire+water': { id: 'steam', name: '증기', color: '#95a5a6' },
        'earth+fire': { id: 'lava', name: '용암', color: '#d35400' },
        'earth+water': { id: 'mud', name: '진흙', color: '#7f8c8d' },
        'air+water': { id: 'rain', name: '비', color: '#2980b9' },
        'air+fire': { id: 'lightning', name: '번개', color: '#f1c40f' },
        'earth+air': { id: 'dust', name: '먼지', color: '#bdc3c7' }
    }
};

// DOM 요소
const gameBoard = document.getElementById('game-board');
const availableElements = document.getElementById('available-elements');
const scoreElement = document.getElementById('score');
const turnElement = document.getElementById('turn');
const endTurnButton = document.getElementById('end-turn');
const resetGameButton = document.getElementById('reset-game');

// 게임 보드 초기화
function initializeBoard() {
    gameBoard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(row, col));
            gameBoard.appendChild(cell);
        }
    }
}

// 사용 가능한 원소 패널 초기화
function initializeElementPanel() {
    availableElements.innerHTML = '';
    gameState.availableElements.forEach(element => {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'element';
        elementDiv.style.backgroundColor = element.color;
        elementDiv.textContent = element.name;
        elementDiv.addEventListener('click', () => selectElement(element));
        availableElements.appendChild(elementDiv);
    });
}

// 원소 선택 처리
function selectElement(element) {
    gameState.selectedElement = element;
    // 선택된 원소 시각적 표시 추가
    document.querySelectorAll('.element').forEach(el => {
        el.style.border = 'none';
    });
    event.target.style.border = '3px solid white';
}

// 셀 클릭 처리
function handleCellClick(row, col) {
    if (!gameState.selectedElement) return;
    
    if (gameState.board[row][col] === null) {
        console.log(`=== 새로운 원소 배치 ===`);
        console.log(`위치: (${row}, ${col})`);
        console.log(`원소: ${gameState.selectedElement.name} (ID: ${gameState.selectedElement.id})`);
        
        // 원소 배치
        gameState.board[row][col] = gameState.selectedElement;
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        cell.style.backgroundColor = gameState.selectedElement.color;
        cell.textContent = gameState.selectedElement.name;
        
        // 조합 체크
        checkCombinations(row, col);
        
        // 점수 증가
        gameState.score += 10;
        updateScore();
    }
}

// 조합 체크 함수
function checkCombinations(row, col) {
    const currentElement = gameState.board[row][col];
    if (!currentElement) return;

    console.log('=== 조합 체크 시작 ===');
    console.log(`현재 위치: (${row}, ${col})`);
    console.log(`현재 원소: ${currentElement.name} (ID: ${currentElement.id})`);

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1] // 상, 하, 좌, 우
    ];

    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const adjacentElement = gameState.board[newRow][newCol];
            if (adjacentElement) {
                console.log(`인접한 원소: ${adjacentElement.name} (ID: ${adjacentElement.id})`);
                
                // 조합 키 생성 (정렬하여 순서 무관하게)
                const elements = [currentElement.id, adjacentElement.id].sort();
                const combinationKey = elements.join('+');
                
                console.log(`생성된 조합 키: ${combinationKey}`);
                console.log(`가능한 조합들:`, Object.keys(gameState.combinations));
                
                // 조합 가능한 경우
                if (gameState.combinations[combinationKey]) {
                    console.log('조합 성공!');
                    const newElement = gameState.combinations[combinationKey];
                    console.log(`새로운 원소: ${newElement.name}`);
                    
                    // 새로운 원소 생성
                    gameState.board[row][col] = newElement;
                    gameState.board[newRow][newCol] = null;
                    
                    // 시각적 업데이트
                    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                    cell.style.backgroundColor = newElement.color;
                    cell.textContent = newElement.name;
                    
                    const adjacentCell = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
                    adjacentCell.style.backgroundColor = '';
                    adjacentCell.textContent = '';
                    
                    // 조합 성공 시 추가 점수
                    gameState.score += 50;
                    updateScore();
                    
                    // 조합 애니메이션
                    showCombinationAnimation(row, col, newRow, newCol);
                    
                    console.log('=== 조합 완료 ===');
                    return; // 조합이 성공하면 함수 종료
                } else {
                    console.log('조합 실패: 해당 조합이 존재하지 않습니다');
                }
            }
        }
    }
    console.log('=== 조합 체크 종료 ===');
}

// 조합 애니메이션
function showCombinationAnimation(row1, col1, row2, col2) {
    const cell1 = document.querySelector(`.cell[data-row="${row1}"][data-col="${col1}"]`);
    const cell2 = document.querySelector(`.cell[data-row="${row2}"][data-col="${col2}"]`);
    
    cell1.style.transform = 'scale(1.2)';
    cell2.style.transform = 'scale(1.2)';
    
    setTimeout(() => {
        cell1.style.transform = 'scale(1)';
        cell2.style.transform = 'scale(1)';
    }, 300);
}

// 점수 업데이트
function updateScore() {
    scoreElement.textContent = gameState.score;
}

// 턴 종료 처리
function endTurn() {
    gameState.turn++;
    turnElement.textContent = gameState.turn;
    gameState.selectedElement = null;
    document.querySelectorAll('.element').forEach(el => {
        el.style.border = 'none';
    });
}

// 게임 초기화
function resetGame() {
    gameState.score = 0;
    gameState.turn = 1;
    gameState.selectedElement = null;
    gameState.board = Array(8).fill().map(() => Array(8).fill(null));
    
    updateScore();
    turnElement.textContent = gameState.turn;
    initializeBoard();
}

// 이벤트 리스너 설정
endTurnButton.addEventListener('click', endTurn);
resetGameButton.addEventListener('click', resetGame);

// 게임 시작
initializeBoard();
initializeElementPanel(); 