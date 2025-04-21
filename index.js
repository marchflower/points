// index.js
document.addEventListener("DOMContentLoaded", function() {
    const toggleStreamBtn = document.querySelector("#toggle-stream-btn");
    const submitBtn = document.querySelector("#submit-btn");
    const videoFeed = document.querySelector("#video-feed");
    const canvas = document.querySelector("#overlay-canvas");
    const pointTable = document.querySelector("#point-table");
    const pointTableBody = pointTable.querySelector("tbody");
    const submitMessage = document.querySelector("#submit-message");
    const ctx = canvas.getContext("2d");

    let points = Array(4).fill(null);
    let isStreaming = false;

    fetch('http://223.171.143.119:8000/get-points')
        .then(response => response.json())
        .then(data => {
            data.points.forEach(point => {
                if (point.id >= 1 && point.id <= 4) {
                    points[point.id - 1] = point.x ? point : null;
                }
            });
            updateTable();
            if (isStreaming) drawOverlay();
        })
        .catch(error => console.error("Error loading points:", error));

    toggleStreamBtn.addEventListener("click", function() {
        fetch('http://223.171.143.119:8000/toggle-stream')
            .then(response => response.json())
            .then(data => {
                if (data.status === "started") {
                    toggleStreamBtn.textContent = "스트리밍 중지";
                    videoFeed.src = "/video_feed";
                    videoFeed.style.display = "block";
                    canvas.style.display = "block";
                    submitBtn.disabled = false;
                    points = Array(4).fill(null);
                    fetch('http://223.171.143.119:8000/get-points')
                        .then(response => response.json())
                        .then(data => {
                            data.points.forEach(point => {
                                if (point.id >= 1 && point.id <= 4) {
                                    points[point.id - 1] = point.x ? point : null;
                                }
                            });
                            updateTable();
                            videoFeed.onload = resizeCanvas;
                            isStreaming = true;
                        });
                } else if (data.status === "stopped") {
                    toggleStreamBtn.textContent = "스트리밍 시작";
                    videoFeed.src = "";
                    videoFeed.style.display = "none";
                    canvas.style.display = "none";
                    submitBtn.disabled = true;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    isStreaming = false;
                } else {
                    alert("Error: " + data.message);
                }
            });
    });

    submitBtn.addEventListener("click", function() {
        const validPoints = points.filter(p => p !== null);
        if (validPoints.length === 4) {
            fetch('http://223.171.143.119:8000/submit-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: validPoints })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    submitMessage.textContent = "정상적으로 저장되었습니다.";
                    setTimeout(() => submitMessage.textContent = "", 3000); // 3초 후 메시지 제거
                } else {
                    submitMessage.textContent = "저장에 실패했습니다.";
                    setTimeout(() => submitMessage.textContent = "", 3000);
                }
            });
        } else {
            submitMessage.textContent = "4개의 점을 선택해야 합니다.";
            setTimeout(() => submitMessage.textContent = "", 3000);
        }
    });

    function resizeCanvas() {
        canvas.width = videoFeed.width;
        canvas.height = videoFeed.height;
        drawOverlay();
    }

    function drawOverlay() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        points.forEach((point, index) => {
            if (point) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "black";
                ctx.fillText((index + 1).toString(), point.x, point.y);
                ctx.fillStyle = "white";
            }
        });

        const validPoints = points.filter(p => p !== null);
        if (validPoints.length === 4) {
            ctx.beginPath();
            ctx.moveTo(validPoints[0].x, validPoints[0].y);
            for (let i = 1; i < validPoints.length; i++) {
                ctx.lineTo(validPoints[i].x, validPoints[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fill();
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function updateTable() {
        pointTableBody.innerHTML = "";
        console.log(points);
        points.forEach((point, index) => {
            const row = document.createElement("tr");
            row.setAttribute("data-index", index);
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${point && point.x ? `(${Math.round(point.x)}, ${Math.round(point.y)})` : "N/A"}</td>
                <td>${point && point.lat ? point.lat.toFixed(6) : "N/A"}, ${point && point.lon ? point.lon.toFixed(6) : "N/A"}</td>
            `;
            row.style.cursor = point && point.x ? "pointer" : "default";
            row.addEventListener("click", function() {
                if (points[index]) {
                    points[index] = null;
                    drawOverlay();
                    updateTable();
                }
            });
            pointTableBody.appendChild(row);
        });
    }

    function getGPS(callback) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => callback({ lat: position.coords.latitude, lon: position.coords.longitude }),
                (error) => callback({ lat: null, lon: null })
            );
        } else {
            callback({ lat: null, lon: null });
        }
    }

    canvas.addEventListener("click", function(event) {
        if (!isStreaming) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        let pointRemoved = false;
        points.forEach((point, index) => {
            if (point && Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < 10) {
                points[index] = null;
                pointRemoved = true;
            }
        });

        if (pointRemoved) {
            drawOverlay();
            updateTable();
            return;
        }

        const emptyIndex = points.indexOf(null);
        if (emptyIndex !== -1) {
            getGPS((gps) => {
                points[emptyIndex] = { x, y, lat: gps.lat, lon: gps.lon };
                drawOverlay();
                updateTable();
            });
        }
    });

    window.addEventListener("resize", function() {
        if (videoFeed.style.display === "block") resizeCanvas();
    });
});
