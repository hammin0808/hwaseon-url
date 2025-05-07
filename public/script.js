// DOM 요소
const longUrlInput = document.getElementById('longUrl');
const shortenBtn = document.getElementById('shortenBtn');
const resultBox = document.getElementById('resultBox');
const shortUrlSpan = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');

// API 엔드포인트 설정
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001' 
  : 'https://hwaseon-url.onrender.com';

// 상태
let currentShortCode = '';

// URL 단축
shortenBtn.addEventListener('click', async function(e) {
  e.preventDefault();
  
  // input 요소가 null이 아닌지 체크
  const urlInput = document.getElementById('longUrl');
  if (!urlInput) {
    alert('URL 입력창을 찾을 수 없습니다.');
    return;
  }
  const longUrl = urlInput.value.trim();
  if (!longUrl) {
    alert('URL을 입력하세요');
    return;
  }

  try {
    const response = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.shortUrl) {
      throw new Error('Invalid response from server');
    }

    // 사용자에게는 hwaseon-url 형식으로 보여줌
    shortUrlSpan.textContent = data.shortUrl;
    // 실제 리다이렉션은 redirectUrl을 사용
    shortUrlSpan.dataset.redirectUrl = data.redirectUrl;
    resultBox.style.display = 'flex';
    
    // 단축 성공 메시지 표시
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'URL이 단축되었습니다!';
    document.body.appendChild(notification);
    
    // 2초 후 메시지 제거
    setTimeout(() => {
      notification.remove();
    }, 2000);
  } catch (err) {
    console.error('Error:', err);
    alert('URL 단축 실패: ' + err.message);
  }
});

// URL 복사
copyBtn.addEventListener('click', function(e) {
  e.preventDefault();
  
  const text = shortUrlSpan.textContent;
  navigator.clipboard.writeText(text)
    .then(() => {
      // 복사 성공 메시지 표시
      const notification = document.createElement('div');
      notification.className = 'copy-notification';
      notification.textContent = 'URL이 복사되었습니다!';
      document.body.appendChild(notification);
      
      // 2초 후 메시지 제거
      setTimeout(() => {
        notification.remove();
      }, 2000);
    })
    .catch(err => {
      console.error('복사 실패:', err);
      const notification = document.createElement('div');
      notification.className = 'copy-notification error';
      notification.textContent = 'URL 복사에 실패했습니다.';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 2000);
    });
});

// Enter 키로 단축하기
longUrlInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    shortenBtn.click();
  }
});

// 폼 제출 방지
document.addEventListener('submit', function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
});

// 모든 링크 클릭 이벤트 방지
document.addEventListener('click', function(e) {
  if (e.target.tagName === 'A') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
});

// F5 키 방지
document.addEventListener('keydown', function(e) {
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
});

// 마우스 우클릭 메뉴 방지
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
});

// 버튼 클릭 효과 함수
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// URL 입력창 복사 기능
document.getElementById('longUrl').addEventListener('click', function() {
    this.select();
    document.execCommand('copy');
});

// URL 유효성 검사 함수
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// 단축 버튼 클릭 이벤트
document.getElementById('shortenBtn').addEventListener('click', function() {
    const urlInput = document.getElementById('longUrl');
    if (!urlInput) {
        showNotification('URL 입력창을 찾을 수 없습니다.');
        return;
    }
    const url = urlInput.value.trim();
    if (!url) {
        showNotification('URL을 입력하세요');
        return;
    }
    if (!isValidUrl(url)) {
        showNotification('올바른 URL 형식을 입력하세요');
        return;
    }
    fetch('/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <p>단축된 URL: <span id="shortUrl">${data.shortUrl}</span></p>
            <button id="copyBtn">복사하기</button>
        `;
        // 복사 버튼 이벤트
        document.getElementById('copyBtn').addEventListener('click', function() {
            const shortUrl = document.getElementById('shortUrl').textContent;
            navigator.clipboard.writeText(shortUrl).then(() => {
                showNotification('URL이 복사되었습니다');
            });
        });
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('URL 단축에 실패했습니다');
    });
});

// 대시보드 버튼 클릭 이벤트

document.querySelector('.dashboard-btn').addEventListener('click', function() {
    window.location.href = '/dashboard';
});

// 다중 URL 단축 버튼 클릭 이벤트
document.querySelector('.multiple-btn').addEventListener('click', function() {
    window.location.href = '/multiple';
});

// 버튼 hover 효과 함수
function addHoverEffect(button) {
    button.addEventListener('mouseover', function() {
        this.style.transform = 'scale(1.05)';
        this.style.transition = 'transform 0.2s ease';
    });

    button.addEventListener('mouseout', function() {
        this.style.transform = 'scale(1)';
    });
}

// 모든 버튼에 hover 효과 적용
document.addEventListener('DOMContentLoaded', function() {
    // 단축 버튼
    const shortenBtn = document.getElementById('shortenBtn');
    addHoverEffect(shortenBtn);

    // 복사 버튼 (동적으로 생성되므로 이벤트 위임 사용)
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'copyBtn') {
            addHoverEffect(e.target);
        }
    });

    // 대시보드 버튼
    const dashboardBtn = document.querySelector('.dashboard-btn');
    addHoverEffect(dashboardBtn);

    // 다중 URL 단축 버튼
    const multipleBtn = document.querySelector('.multiple-btn');
    addHoverEffect(multipleBtn);
}); 