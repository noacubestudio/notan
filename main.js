class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// display the main and stroke canvases in here, plus any overlays
const display_canvas = document.getElementById('display-canvas');
const display_ctx = display_canvas.getContext('2d');
display_canvas.width = window.innerWidth;
display_canvas.height = window.innerHeight;
display_canvas.imageSmoothingEnabled = false;

const main_canvas = document.createElement('canvas');
const main_ctx = main_canvas.getContext('2d');
main_canvas.width = display_canvas.width - 200;
main_canvas.height = display_canvas.height - 200;
main_ctx.fillStyle = 'white';
main_ctx.fillRect(0, 0, main_canvas.width, main_canvas.height);

const displayToPainting = ({x, y}) => {return {x: x - 100, y: y - 100};};
const paintingToDisplay = ({x, y}) => {return {x: x + 100, y: y + 100};};

const stroke_canvas = document.createElement('canvas');
const stroke_ctx = stroke_canvas.getContext('2d');
stroke_canvas.width = main_canvas.width;
stroke_canvas.height = main_canvas.height;

let points = [];
let isDrawing = false;
let isErasing = false;
let isLine = false;

// fixed settings for drawing
stroke_ctx.lineWidth = 2;
stroke_ctx.lineJoin = 'round';

window.addEventListener('pointerdown', (e) => {
    points = [];

    // apply last stroke to main canvas
    main_ctx.drawImage(stroke_canvas, 0, 0);
    stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

    isDrawing = true;
    if (isErasing) {
        stroke_ctx.strokeStyle = 'white';
        stroke_ctx.fillStyle = 'white';
    } else {
        stroke_ctx.strokeStyle = 'black';
        stroke_ctx.fillStyle = 'black';
    }
    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    points.push(new Point(x, y));
    draw_ui(display_ctx);
});
window.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    points.push(new Point(x, y));
    draw_stroke(e, stroke_ctx);
    draw_ui(display_ctx);
});
window.addEventListener('pointerup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    if (!isLine) isErasing = !isErasing;
    draw_ui(display_ctx);
});
window.addEventListener('pointercancel', (e) => {
    isDrawing = false;
    draw_ui(display_ctx);
});

function draw_stroke(e, ctx) {
    // get altitude angle
    if (e.pointerType === 'pen') {
        const altitudeAngle = e.altitudeAngle || 0; // in radians, 0 means flat
        const altitudeFactor = Math.cos(altitudeAngle);
        isLine = (altitudeFactor < 0.6);
        
        if (!isLine) {
            draw_fan(ctx);
            return;
        }
        draw_line(ctx);
        return;
    }
    draw_lasso(ctx);
}

function draw_lasso(ctx) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let point of points) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}

function draw_fan(ctx) {
    if (points.length < 2) return;
    for (let i = 1; i < points.length; i++) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[i-1].x, points[i-1].y);
        ctx.lineTo(points[i].x, points[i].y);
        ctx.fill();
        ctx.stroke();
    }
}

function draw_line(ctx) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
}

function draw_ui(ctx) {
    ctx.fillStyle = (isErasing) ? 'pink' : 'lightblue';
    ctx.fillRect(0, 0, display_canvas.width, display_canvas.height);
    const {x: paintingX, y: paintingY} = paintingToDisplay({x: 0, y: 0});
    ctx.drawImage(main_canvas, paintingX, paintingY);
    ctx.drawImage(stroke_canvas, paintingX, paintingY);

    ctx.fillStyle = 'white';
    ctx.font = '32px Serif';
    ctx.fillText(isErasing ? 'You Can Erase' : 'You Can Draw', 15, 40);
}

draw_ui(display_ctx);