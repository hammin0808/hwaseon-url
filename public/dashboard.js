// URL 목록 로드
function loadUrls() {
    // 현재 도메인 기반으로 설정
    const baseUrl = window.location.origin;
    
    console.log('URL 목록 로드 시도');
        
    fetch(`${baseUrl}/urls`, {
        method: 'GET',
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        credentials: 'include' // 세션 쿠키 포함
    })
        .then(response => {
            console.log('URL 목록 응답 상태:', response.status);
            if (!response.ok) {
                if (response.status === 401) {
                    // 로그인이 필요한 경우
                    console.log('인증되지 않음, 로그인 페이지로 이동');
                    window.location.href = '/login';
                    return;
                }
                throw new Error('서버 응답 오류');
            }
            return response.json();
        })
        .then(urls => {
            console.log('URL 목록 수신 완료:', urls ? urls.length : 0);
            const tbody = document.getElementById('dashboard-tbody');
            tbody.innerHTML = '';

            if (!urls || urls.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="8" style="text-align: center; padding: 20px;">
                        등록된 URL이 없습니다.
                    </td>
                `;
                tbody.appendChild(row);
                return;
            }

            // 현재 사용자 정보 가져오기
            fetch('/api/me', {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            })
            .then(response => response.json())
            .then(userData => {
                let currentUser = '';
                if (userData && userData.success && userData.user) {
                    currentUser = userData.user.username;
                }

                urls.forEach(url => {
                    // 사용자 정보 표시 - URL 생성자에 따라 다르게 표시
                    let displayUsername = '비회원';
                    
                    // URL에 사용자 정보가 있는 경우
                    if (url.username) {
                        displayUsername = url.username;
                    }
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="action-cell" style="width: 5%; text-align: center;">
                            <button class="copy-btn" onclick="copyToClipboard('${url.shortUrl}')" style="padding: 4px 8px; background-color: #1877f2; color: white; border: none; border-radius: 4px; cursor: pointer;">복사</button>
                        </td>
                        <td class="url-cell" style="width: 15%; text-align: center;">
                            <a href="${url.shortUrl}" target="_blank" class="url-link">${url.shortUrl}</a>
                        </td>
                        <td class="url-cell" style="width: 30%; text-align: center;">${url.longUrl}</td>
                        <td class="visits-cell" style="width: 8%; text-align: center;">${url.todayVisits || 0}</td>
                        <td class="visits-cell" style="width: 8%; text-align: center;">${url.totalVisits || 0}</td>
                        <td class="user-cell" style="width: 10%; text-align: center;">${displayUsername}</td>
                        <td class="action-cell" style="width: 7%; text-align: center;">
                            <button class="delete-btn" onclick="deleteUrl('${url.shortCode}')">삭제</button>
                        </td>
                        <td class="action-cell" style="width: 7%; text-align: center;">
                            <button class="detail-btn" onclick="showDetails('${url.shortCode}')">보기</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            })
            .catch(error => {
                // 사용자 정보를 가져오는데 실패해도 URL 목록은 표시
                console.error('Error getting user info:', error);
                
                urls.forEach(url => {
                    // 사용자 정보 표시 - URL 생성자에 따라 다르게 표시
                    let displayUsername = '비회원';
                    
                    // URL에 사용자 정보가 있는 경우
                    if (url.username) {
                        displayUsername = url.username;
                    }
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="action-cell" style="width: 5%; text-align: center;">
                            <button class="copy-btn" onclick="copyToClipboard('${url.shortUrl}')" style="padding: 4px 8px; background-color: #1877f2; color: white; border: none; border-radius: 4px; cursor: pointer;">복사</button>
                        </td>
                        <td class="url-cell" style="width: 15%; text-align: center;">
                            <a href="${url.shortUrl}" target="_blank" class="url-link">${url.shortUrl}</a>
                        </td>
                        <td class="url-cell" style="width: 30%; text-align: center;">${url.longUrl}</td>
                        <td class="visits-cell" style="width: 8%; text-align: center;">${url.todayVisits || 0}</td>
                        <td class="visits-cell" style="width: 8%; text-align: center;">${url.totalVisits || 0}</td>
                        <td class="user-cell" style="width: 10%; text-align: center;">${displayUsername}</td>
                        <td class="action-cell" style="width: 7%; text-align: center;">
                            <button class="delete-btn" onclick="deleteUrl('${url.shortCode}')">삭제</button>
                        </td>
                        <td class="action-cell" style="width: 7%; text-align: center;">
                            <button class="detail-btn" onclick="showDetails('${url.shortCode}')">보기</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('URL 목록을 불러오는 중 오류가 발생했습니다.');
        });
}

// URL 삭제
function deleteUrl(shortCode) {
    // 현재 도메인 기반으로 설정
    const baseUrl = window.location.origin;
        
    if (confirm('정말 삭제하시겠습니까?')) {
        fetch(`${baseUrl}/urls/${shortCode}`, {
            method: 'DELETE',
            credentials: 'include' // 세션 쿠키 포함
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('삭제 실패');
            }
            loadUrls();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('URL 삭제 중 오류가 발생했습니다.');
        });
    }
}

// 상세 정보 표시
function showDetails(shortCode) {
    // 현재 도메인 기반으로 설정
    const baseUrl = window.location.origin;
        
    fetch(`${baseUrl}/urls/${shortCode}/details`, {
        credentials: 'include' // 세션 쿠키 포함
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('상세 정보 조회 실패');
            }
            return response.json();
        })
        .then(details => {
            // 기존 모달이 있다면 제거
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                existingModal.remove();
            }
            // 날짜 포맷팅
            const date = new Date(details.createdAt);
            const formattedDate = date.getFullYear() + '. ' + String(date.getMonth()+1).padStart(2,'0') + '. ' + String(date.getDate()).padStart(2,'0') + '. ' +
                String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0') + ':' + String(date.getSeconds()).padStart(2,'0');
            // IP 괄호로 한 줄(맨 앞 IP만)
            let ipDisplay = details.ip || 'localhost';
            if (ipDisplay && typeof ipDisplay === 'string') {
                ipDisplay = '(' + ipDisplay.split(',')[0].trim() + ')';
            }
            // logs 표 생성
            let logsTable = '';
            if (details.logs && details.logs.length > 0) {
                logsTable = `<table style="width:100%;margin-top:10px;font-size:13px;text-align:center;"><thead><tr><th style='text-align:center;'>IP</th><th style='text-align:center;'>접속시간</th></tr></thead><tbody>`;
                details.logs.forEach(log => {
                    const t = new Date(log.time).toLocaleString('ko-KR', {year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
                    logsTable += `<tr><td style='text-align:center;'>${log.ip}</td><td style='text-align:center;'>${t}</td></tr>`;
                });
                logsTable += '</tbody></table>';
            } else {
                logsTable = '<div style="color:#888;font-size:13px;">접속 기록 없음</div>';
            }
            // 모달 생성
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">단축 도메인 정보: ${shortCode}</div>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">생성일 / IP</div>
                            <div class="detail-value">${formattedDate} <br>${ipDisplay}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">하루 접속허용수</div>
                            <div class="detail-value highlight">5,000</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">오늘 방문자 수</div>
                            <div class="detail-value">${details.todayVisits || 0}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">누적 방문자 수</div>
                            <div class="detail-value">${details.totalVisits || 0}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">접속 로그</div>
                            <div class="detail-value"><div class="logs-scroll">${logsTable}</div></div>
                        </div>
                    </div>
                </div>
            `;
            // 모달 닫기 이벤트
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            document.body.appendChild(modal);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('상세 정보를 불러오는 중 오류가 발생했습니다.');
        });
}

// 페이지 로드 시 URL 목록 로드
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태 확인
    checkLoginStatus();
    
    // 전체 삭제 버튼 이벤트 리스너
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async function() {
            if (!confirm('모든 URL을 삭제하시겠습니까?')) return;
            try {
                // 현재 도메인 기반으로 설정
                const baseUrl = window.location.origin;
                    
                const response = await fetch(`${baseUrl}/delete-all`, { 
                    method: 'DELETE',
                    credentials: 'include' // 세션 쿠키 포함
                });
                if (!response.ok) throw new Error('전체 삭제 실패');
                loadUrls();
                alert('모든 URL이 삭제되었습니다.');
            } catch (e) {
                alert('전체 삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // 엑셀 다운로드 버튼 이벤트 리스너
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', async function() {
            // 1. 로딩 모달 표시
            const loadingModal = document.createElement('div');
            loadingModal.className = 'modal-overlay';
            loadingModal.innerHTML = `
                <div class="modal-content" style="text-align:center;padding:40px 30px;min-width:260px;">
                    <div style="font-size:20px;font-weight:bold;color:#1877f2;">엑셀 다운로드 중...</div>
                    <div style="margin-top:18px;color:#888;font-size:15px;">잠시만 기다려주세요</div>
                </div>
            `;
            document.body.appendChild(loadingModal);
            try {
                // 현재 도메인 기반으로 설정
                const baseUrl = window.location.origin;
                // 1. 전체 URL 목록 가져오기
                const urlRes = await fetch(`${baseUrl}/urls`, {
                    credentials: 'include' // 세션 쿠키 포함
                });
                if (!urlRes.ok) throw new Error('URL 목록 조회 실패');
                const urls = await urlRes.json();
                if (!Array.isArray(urls) || urls.length === 0) {
                    alert('다운로드할 데이터가 없습니다.');
                    loadingModal.remove();
                    return;
                }
                // 2. 각 URL의 상세 정보(IP 등) 병합
                const dataWithDetails = await Promise.all(urls.map(async url => {
                    try {
                        const detailRes = await fetch(`${baseUrl}/urls/${url.shortCode}/details`, {
                            credentials: 'include' // 세션 쿠키 포함
                        });
                        if (!detailRes.ok) throw new Error();
                        const details = await detailRes.json();
                        return {
                            ...url,
                            ip: details.ip || '',
                            createdAt: details.createdAt || '',
                            logs: details.logs || []
                        };
                    } catch {
                        return { ...url, ip: '', createdAt: '', logs: [] };
                    }
                }));
                // 3. 엑셀 데이터 생성 (시트 1: URL 대시보드)
                const wsDataDashboard = [
                    ['Short URL', 'Long URL', '오늘 방문', '누적 방문', '생성일 / IP']
                ];
                // 3. 엑셀 데이터 생성 (시트 2: 상세보기)
                const wsDataDetail = [
                    ['Short URL', 'Long URL', '생성일 / IP', '접속 IP', '접속시간']
                ];
                // 3. 날짜별 방문자수 시트 데이터 준비
                // 1) 날짜 집계용 객체
                const dateSet = new Set();
                const urlDateCount = {};
                dataWithDetails.forEach(item => {
                    // 생성일/ IP (맨 앞 IP만)
                    let formattedDate = '';
                    if (item.createdAt) {
                        const date = new Date(item.createdAt);
                        formattedDate = `${date.getFullYear()}. ${String(date.getMonth()+1).padStart(2,'0')}. ${String(date.getDate()).padStart(2,'0')}. ` +
                            `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
                    }
                    let ipDisplay = item.ip || '';
                    if (ipDisplay && typeof ipDisplay === 'string') {
                        ipDisplay = '(' + ipDisplay.split(',')[0].trim() + ')';
                    }
                    const dateIp = `${formattedDate} ${ipDisplay}`;

                    // URL 대시보드 시트 한 줄
                    wsDataDashboard.push([
                        item.shortUrl,
                        item.longUrl,
                        item.todayVisits,
                        item.totalVisits,
                        dateIp
                    ]);

                    // 상세보기 시트: 모든 로그를 개별 행으로 표시
                    if (item.logs && item.logs.length > 0) {
                        item.logs.forEach(log => {
                            const logIp = log.ip;
                            const logTime = new Date(log.time).toLocaleString('ko-KR', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            });
                            wsDataDetail.push([
                                item.shortUrl,
                                item.longUrl,
                                dateIp,
                                logIp,
                                logTime
                            ]);
                        });
                    } else {
                        wsDataDetail.push([
                            item.shortUrl,
                            item.longUrl,
                            dateIp,
                            '-',
                            '-'
                        ]);
                    }
                    // 날짜별 방문자수 집계
                    urlDateCount[item.shortUrl] = {};
                    if (item.logs && item.logs.length > 0) {
                        item.logs.forEach(log => {
                            const d = new Date(log.time);
                            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            dateSet.add(dateStr);
                            urlDateCount[item.shortUrl][dateStr] = (urlDateCount[item.shortUrl][dateStr] || 0) + 1;
                        });
                    }
                });
                // 날짜 배열을 반드시 wsDataDate 생성 전에 선언
                const dateArr = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
                // 3) 시트 데이터 헤더
                const wsDataDate = [['Short URL', 'Long URL', '총 조회수', ...dateArr]];
                // 4) 각 URL별로 날짜별 방문자수 행 생성
                dataWithDetails.forEach(item => {
                    const row = [item.shortUrl, item.longUrl];
                    // 총 조회수 계산
                    let total = 0;
                    dateArr.forEach(date => {
                        total += (urlDateCount[item.shortUrl][date] || 0);
                    });
                    row.push(total);
                    dateArr.forEach(date => {
                        row.push(urlDateCount[item.shortUrl][date] || 0);
                    });
                    wsDataDate.push(row);
                });
                // 기존 시트 생성 및 워크북에 추가
                const wsDashboard = XLSX.utils.aoa_to_sheet(wsDataDashboard);
                wsDashboard['!cols'] = [
                    { wch: 30 }, // Short URL
                    { wch: 50 }, // Long URL
                    { wch: 10 }, // 오늘 방문
                    { wch: 10 }, // 누적 방문
                    { wch: 32 }  // 생성일 / IP
                ];
                // 헤더 스타일 적용 (보라색 계열 배경, 흰색 글씨, 굵은 글씨)
                const dashboardHeader = ['A1','B1','C1','D1','E1'];
                dashboardHeader.forEach(cell => {
                    if(wsDashboard[cell]) {
                        wsDashboard[cell].s = {
                            fill: { fgColor: { rgb: '7D5FFF' } },
                            font: { color: { rgb: 'FFFFFF' }, bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        };
                    }
                });
                const wsDetail = XLSX.utils.aoa_to_sheet(wsDataDetail);
                wsDetail['!cols'] = [
                    { wch: 30 }, // Short URL
                    { wch: 50 }, // Long URL
                    { wch: 32 }, // 생성일 / IP
                    { wch: 40 }, // 접속 IP
                    { wch: 22 }  // 접속시간
                ];
                // 헤더 스타일 적용 (보라색 계열 배경, 흰색 글씨, 굵은 글씨)
                const detailHeader = ['A1','B1','C1','D1','E1'];
                detailHeader.forEach(cell => {
                    if(wsDetail[cell]) {
                        wsDetail[cell].s = {
                            fill: { fgColor: { rgb: '7D5FFF' } },
                            font: { color: { rgb: 'FFFFFF' }, bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        };
                    }
                });
                // 날짜별 방문자수 시트 생성
                const wsDate = XLSX.utils.aoa_to_sheet(wsDataDate);
                wsDate['!cols'] = [
                    { wch: 30 }, // Short URL
                    { wch: 50 }, // Long URL
                    { wch: 10 }, // 총 조회수
                    ...dateArr.map(_ => ({ wch: 12 }))
                ];
                // 헤더 스타일 적용 (보라색 계열 배경, 흰색 글씨, 굵은 글씨)
                const dateHeader = ['A1', 'B1', 'C1', ...dateArr.map((_,i)=>String.fromCharCode(66+i)+'1')];
                dateHeader.forEach(cell => {
                    if(wsDate[cell]) {
                        wsDate[cell].s = {
                            fill: { fgColor: { rgb: '7D5FFF' } },
                            font: { color: { rgb: 'FFFFFF' }, bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        };
                    }
                });
                // 워크북 생성 및 시트 추가
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, wsDashboard, 'URL 대시보드');
                XLSX.utils.book_append_sheet(wb, wsDetail, '상세보기');
                XLSX.utils.book_append_sheet(wb, wsDate, '날짜별 방문자수');
                XLSX.writeFile(wb, 'url_list.xlsx');
            } catch (e) {
                console.error('엑셀 다운로드 중 JS 에러:', e);
                alert('엑셀 다운로드 중 오류가 발생했습니다.');
            } finally {
                // 2. 로딩 모달 제거
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
            }
        });
    }
});

// 로그인 상태 확인 함수
function checkLoginStatus() {
    const baseUrl = window.location.origin;
    
    console.log('로그인 상태 확인 중...');
    
    fetch(`${baseUrl}/api/me`, {
        method: 'GET',
        credentials: 'include', // 세션 쿠키 포함
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                console.error('인증되지 않음, 로그인 페이지로 이동');
                window.location.href = '/login';
                return null;
            }
            throw new Error('서버 응답 오류');
        }
        return response.json();
    })
    .then(data => {
        if (data && data.success && data.user) {
            console.log('인증된 사용자:', data.user.username);
            // 로그인 성공, URL 목록 로드
            loadUrls();
        } else if (data !== null) {
            console.error('사용자 정보가 없음, 로그인 페이지로 이동');
            window.location.href = '/login';
        }
    })
    .catch(error => {
        console.error('로그인 상태 확인 오류:', error);
        // 오류 발생 시도 로그인 페이지로 이동
        window.location.href = '/login';
    });
}

// 클립보드에 복사하는 함수
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 복사 성공 알림 표시
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '90%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '15px 25px';
        notification.style.backgroundColor = '#28a745';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.textAlign = 'center';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        notification.textContent = 'URL이 복사되었습니다!';
        
        document.body.appendChild(notification);
        
        // 1.5초 후 알림 제거 (중앙에 표시되므로 시간을 좀 더 짧게 조정)
        setTimeout(() => {
            notification.remove();
        }, 1500);
    }).catch(err => {
        console.error('클립보드 복사 실패:', err);
        alert('URL 복사에 실패했습니다.');
    });
} 