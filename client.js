document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('whiteboard');
  const context = canvas.getContext('2d');
  const colorInput = document.getElementById('color-input');
  const brushSizeInput = document.getElementById('brush-size');
  const brushSizeDisplay = document.getElementById('brush-size-display');
  const clearButton = document.getElementById('clear-button');
  const connectionStatus = document.getElementById('connection-status');
  const userCount = document.getElementById('user-count');

  let boardState = []; // ✅ moved before resizeCanvas use

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    redrawCanvas(boardState);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // ✅ Explicitly connect to port 3000 (Socket.IO server)
  const socket = io('http://localhost:3000');

  socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
  });

  socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
  });

  // ✅ Match server event name
  socket.on('currentUsers', (count) => {
    userCount.textContent = count;
  });

  socket.on('draw', (data) => {
    boardState.push(data);
    drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
  });

  socket.on('clear', () => {
    boardState = [];
    redrawCanvas();
  });

  socket.on('boardState', (state) => {
    boardState = state;
    redrawCanvas(boardState);
  });

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);

  clearButton.addEventListener('click', clearCanvas);

  brushSizeInput.addEventListener('input', () => {
    brushSizeDisplay.textContent = brushSizeInput.value;
  });

  function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoordinates(e);
    lastX = x;
    lastY = y;
  }

  function draw(e) {
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);

    socket.emit('draw', {
      x0: lastX,
      y0: lastY,
      x1: x,
      y1: y,
      color: colorInput.value,
      size: brushSizeInput.value
    });

    lastX = x;
    lastY = y;
  }

  function drawLine(x0, y0, x1, y1, color, size) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = size;
    context.lineCap = 'round';
    context.stroke();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function clearCanvas() {
    socket.emit('clear');
  }

  function redrawCanvas(state = []) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    state.forEach(line => {
      drawLine(line.x0, line.y0, line.x1, line.y1, line.color, line.size);
    });
  }

  function getCoordinates(e) {
    if (e.touches) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.offsetX,
        y: e.offsetY
      };
    }
  }

  function handleTouchStart(e) {
    e.preventDefault();
    startDrawing(e);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    draw(e);
  }
});