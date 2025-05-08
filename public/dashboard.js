// URL 목록 로드
function loadUrls() {
    fetch('https://hwaseon-url.onrender.com/urls')
        .then(response => {
            if (!response.ok) {
                throw new Error('서버 응답 오류');
            }
            return response.json();
        })
        .then(urls => {
            const tbody = document.getElementById('dashboard-tbody');
            tbody.innerHTML = '';

            if (!urls || urls.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        등록된 URL이 없습니다.
                    </td>
                `;
                tbody.appendChild(row);
                return;
            }

            urls.forEach(url => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="star-cell">
                        <span class="star inactive">★</span>
                    </td>
                    <td class="url-cell">
                        <a href="${url.shortUrl}" target="_blank" class="url-link">${url.shortUrl}</a>
                    </td>
                    <td class="url-cell">${url.longUrl}</td>
                    <td class="visits-cell">${url.todayVisits || 0}</td>
                    <td class="visits-cell">${url.totalVisits || 0}</td>
                    <td class="action-cell">
                        <button class="delete-btn" onclick="deleteUrl('${url.shortCode}')">삭제</button>
                    </td>
                    <td class="action-cell">
                        <button class="detail-btn" onclick="showDetails('${url.shortCode}')">보기</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('URL 목록을 불러오는 중 오류가 발생했습니다.');
        });
}

// URL 삭제
function deleteUrl(shortCode) {
    if (confirm('정말 삭제하시겠습니까?')) {
        fetch(`https://hwaseon-url.onrender.com/urls/${shortCode}`, {
            method: 'DELETE'
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
    fetch(`https://hwaseon-url.onrender.com/urls/${shortCode}/details`)
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
            // IP 괄호로 한 줄
            let ipDisplay = details.ip || 'localhost';
            if (ipDisplay && typeof ipDisplay === 'string') {
                ipDisplay = '(' + ipDisplay.split(',').map(ip => ip.trim()).join(', ') + ')';
            }
            // logs 표 생성
            let logsTable = '';
            if (details.logs && details.logs.length > 0) {
                logsTable = `<table style="width:100%;margin-top:10px;font-size:13px;"><thead><tr><th>IP</th><th>접속시각</th></tr></thead><tbody>`;
                details.logs.forEach(log => {
                    const t = new Date(log.time).toLocaleString('ko-KR', {year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
                    logsTable += `<tr><td>${log.ip}</td><td>${t}</td></tr>`;
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
                            <div class="detail-value highlight">3,000</div>
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
                            <div class="detail-value">${logsTable}</div>
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

// 60초마다 URL 목록 자동 새로고침
setInterval(loadUrls, 60000);

// 페이지 로드 시 URL 목록 로드
document.addEventListener('DOMContentLoaded', function() {
    loadUrls();
    // 전체 삭제 버튼 이벤트 리스너
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async function() {
            if (!confirm('모든 URL을 삭제하시겠습니까?')) return;
            try {
                const response = await fetch('https://hwaseon-url.onrender.com/delete-all', { method: 'DELETE' });
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
            try {
                // 1. 전체 URL 목록 가져오기
                const urlRes = await fetch('https://hwaseon-url.onrender.com/urls');
                if (!urlRes.ok) throw new Error('URL 목록 조회 실패');
                const urls = await urlRes.json();
                if (!Array.isArray(urls) || urls.length === 0) {
                    alert('다운로드할 데이터가 없습니다.');
                    return;
                }
                // 2. 각 URL의 상세 정보(IP 등) 병합
                const dataWithDetails = await Promise.all(urls.map(async url => {
                    try {
                        const detailRes = await fetch(`https://hwaseon-url.onrender.com/urls/${url.shortCode}/details`);
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
                // 3. 엑셀 데이터 생성
                const wsData = [
                    ['Short URL', 'Long URL', '오늘 방문', '누적 방문', '생성일 / IP', '접속 로그', '접속 시각']
                ];
                dataWithDetails.forEach(item => {
                    let formattedDate = '';
                    if (item.createdAt) {
                        const date = new Date(item.createdAt);
                        formattedDate = `${date.getFullYear()}. ${String(date.getMonth()+1).padStart(2,'0')}. ${String(date.getDate()).padStart(2,'0')}. ` +
                            `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
                    }
                    const dateIp = `${formattedDate} (${item.ip || ''})`;
                    // logs를 분리: IP만, 시각만 각각 줄바꿈
                    let logsIp = '', logsTime = '';
                    if (item.logs && item.logs.length > 0) {
                        logsIp = item.logs.map(log => log.ip).join('\n');
                        logsTime = item.logs.map(log => new Date(log.time).toLocaleString('ko-KR', {year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})).join('\n');
                    }
                    wsData.push([
                        item.shortUrl,
                        item.longUrl,
                        item.todayVisits,
                        item.totalVisits,
                        dateIp,
                        logsIp,
                        logsTime
                    ]);
                });
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                // 컬럼 너비 지정
                ws['!cols'] = [
                    { wch: 30 }, // Short URL
                    { wch: 50 }, // Long URL
                    { wch: 10 }, // 오늘 방문
                    { wch: 10 }, // 누적 방문
                    { wch: 32 },  // 생성일 / IP
                    { wch: 40 },  // 접속 로그
                    { wch: 22 }   // 접속 시각
                ];
                // wrapText 스타일 적용 (접속 로그, 접속 시각 컬럼)
                const rowCount = wsData.length;
                for (let i = 2; i <= rowCount; i++) { // 1-based index, 1은 헤더
                    const logCell = ws[`F${i}`]; // 접속 로그
                    const timeCell = ws[`G${i}`]; // 접속 시각
                    if (logCell) {
                        logCell.s = { alignment: { wrapText: true } };
                    }
                    if (timeCell) {
                        timeCell.s = { alignment: { wrapText: true } };
                    }
                }
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'URL 목록');
                XLSX.writeFile(wb, 'url_list.xlsx');
            } catch (e) {
                alert('엑셀 다운로드 중 오류가 발생했습니다.');
            }
        });
    }
}); 