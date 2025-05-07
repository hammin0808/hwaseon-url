// 알림 함수 추가
function showNotification(message, isError = false) {
    alert(message);
}

document.addEventListener('DOMContentLoaded', function() {
    // 기존 .add-url 등 불필요한 코드 제거

    // 엑셀 업로드 및 URL 변환 관련 코드만 유지
    // 아래는 기존 코드 예시, 실제 코드에 맞게 배치

    const excelFileInput = document.getElementById('excelFile');
    const fileNameSpan = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const resultSection = document.querySelector('.result-section');
    const resultTableBody = document.getElementById('resultTableBody');
    const copyAllBtn = document.getElementById('copyAllBtn');

    // 엑셀 파일 선택 시
    excelFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            convertBtn.disabled = false;
        } else {
            fileNameSpan.textContent = '';
            convertBtn.disabled = true;
        }
    });

    // 변환 버튼 클릭 시
    convertBtn.addEventListener('click', async function() {
        const file = excelFileInput.files[0];
        if (!file) return;

        try {
            const urls = await readExcelFile(file);
            if (urls.length === 0) {
                showNotification('URL이 없습니다.', 'error');
                return;
            }

            // 결과 테이블 초기화
            resultTableBody.innerHTML = '';
            resultSection.style.display = 'block';

            // URL 단축 처리
            for (const url of urls) {
                try {
                    const shortUrl = await shortenUrl(url);
                    addResultRow(url, shortUrl);
                } catch (error) {
                    console.error('URL 단축 실패:', error);
                    addResultRow(url, '변환 실패', true);
                }
            }
        } catch (error) {
            console.error('파일 처리 실패:', error);
            showNotification('파일 처리 중 오류가 발생했습니다.', 'error');
        }
    });

    // 엑셀 파일 읽기
    async function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    const urls = jsonData
                        .map(row => row[0])
                        .filter(url => url && typeof url === 'string' && url.trim() !== '');
                    resolve(urls);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // URL 단축
    async function shortenUrl(longUrl) {
        const response = await fetch('/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.shortUrl;
    }

    // 결과 행 추가
    function addResultRow(originalUrl, shortUrl, isError = false) {
        const row = document.createElement('tr');
        const originalCell = document.createElement('td');
        originalCell.textContent = originalUrl;
        originalCell.style.wordBreak = 'break-all';
        const shortCell = document.createElement('td');
        shortCell.textContent = shortUrl;
        shortCell.style.wordBreak = 'break-all';
        if (isError) {
            shortCell.style.color = '#e74c3c';
        }
        const copyCell = document.createElement('td');
        if (!isError) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '복사';
            copyBtn.onclick = () => copyToClipboard(shortUrl);
            copyCell.appendChild(copyBtn);
        }
        row.appendChild(originalCell);
        row.appendChild(shortCell);
        row.appendChild(copyCell);
        resultTableBody.appendChild(row);
    }

    // 클립보드에 복사
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('URL이 복사되었습니다.');
        } catch (error) {
            console.error('복사 실패:', error);
            showNotification('복사에 실패했습니다.', 'error');
        }
    }

    // 전체 복사
    copyAllBtn.addEventListener('click', async function() {
        const rows = resultTableBody.getElementsByTagName('tr');
        const urls = Array.from(rows).map(row => {
            const cells = row.getElementsByTagName('td');
            return cells[1].textContent;
        }).filter(url => url !== '변환 실패');
        if (urls.length === 0) {
            showNotification('복사할 URL이 없습니다.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(urls.join('\n'));
        } catch (error) {
            console.error('전체 복사 실패:', error);
            showNotification('전체 복사에 실패했습니다.', 'error');
        }
    });
}); 