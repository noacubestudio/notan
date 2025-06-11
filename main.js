class Point {
    constructor(x, y, pressure) {
        this.x = x;
        this.y = y;
        this.pressure = pressure || null;
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
const insidePainting = ({x, y}) => {return (x >= 0 && x < main_canvas.width && y >= 0 && y < main_canvas.height);};

const stroke_canvas = document.createElement('canvas');
const stroke_ctx = stroke_canvas.getContext('2d');
stroke_canvas.width = main_canvas.width;
stroke_canvas.height = main_canvas.height;

let points = [];
let isDrawing = false;
let isErasing = false;
let isLine = false;
// let partInsidePainting = false;

// fixed settings for drawing
stroke_ctx.lineWidth = 2;
stroke_ctx.lineJoin = 'round';
stroke_ctx.lineCap = 'round';

display_canvas.addEventListener('pointerdown', (e) => {
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
display_canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    //stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    const pressure = (e.pointerType === 'mouse') ? null : e.pressure;
    points.push(new Point(x, y, pressure));

    draw_stroke(stroke_ctx);
    draw_ui(display_ctx);
});
display_canvas.addEventListener('pointerup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    draw_ui(display_ctx);
});
window.addEventListener('pointercancel', (e) => {
    isDrawing = false;
    draw_ui(display_ctx);
});

function pressedButton(el) {
    if (el.innerText === 'draw') {
        el.innerText = 'erase';
        el.style.backgroundColor = 'white';
        el.style.color = 'black';
        isErasing = true;
    } else if (el.innerText === 'erase') {
        el.innerText = 'draw';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'white';
        isErasing = false;
    } else if (el.innerText === 'line') {
        el.innerText = 'shape';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'white';
        isLine = false;
    } else if (el.innerText === 'shape') {
        el.innerText = 'line';
        el.style.backgroundColor = 'white';
        el.style.color = 'black';
        isLine = true;
    } else if (el.innerText === 'undo') {
        stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);
        draw_ui(display_ctx);
    } else if (el.innerText === 'save') {
        // apply last stroke to main canvas
        main_ctx.drawImage(stroke_canvas, 0, 0);
        stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);
        // open just the main canvas in a new tab
        const dataURL = main_canvas.toDataURL('image/png');
        const newTab = window.open();
        if (newTab) {
            newTab.document.body.innerHTML = `<img src="${dataURL}" alt="Drawing">`;
        } else {
            alert('Please allow popups for this website to save the drawing.');
        }
    }
}

function draw_stroke(ctx) {
    if (!isLine) {
        draw_fan(ctx);
        return;
    }
    draw_line(ctx);
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

    // for (let i = 1; i < points.length; i++) {
    //     ctx.beginPath();
    //     ctx.moveTo(points[0].x, points[0].y);
    //     ctx.lineTo(points[i-1].x, points[i-1].y);
    //     ctx.lineTo(points[i].x, points[i].y);
    //     ctx.fill();
    //     ctx.stroke();
    // }

    // only draw the last points, assuming no refreshing of the canvas
    const i = points.length - 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[i-1].x, points[i-1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.fill();
    ctx.stroke();
}

function draw_line(ctx) {
    if (points.length < 2) return;

    // ctx.beginPath();
    // ctx.moveTo(points[0].x, points[0].y);
    // for (let i = 1; i < points.length; i++) {
    //     ctx.lineTo(points[i].x, points[i].y);
    // }
    // ctx.stroke();

    // only draw the last points, assuming no refreshing of the canvas
    const i = points.length - 1;
    const setWidth = points[i].pressure * 10 || 2;
    const randomness = Math.random() * 0.4 - 0.2; // add some randomness to the line width
    stroke_ctx.lineWidth = setWidth + randomness; // use pressure for line width, default to 2
    ctx.beginPath();
    ctx.moveTo(points[i-1].x, points[i-1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    stroke_ctx.lineWidth = 2;
}

function draw_ui(ctx) {
    ctx.fillStyle = '#864';
    ctx.fillRect(0, 0, display_canvas.width, display_canvas.height);

    const {x: paintingX, y: paintingY} = paintingToDisplay({x: 0, y: 0});
    ctx.drawImage(main_canvas, paintingX, paintingY);
    ctx.drawImage(stroke_canvas, paintingX, paintingY);

    // border around the painting area
    //ctx.strokeStyle = 'white';
    //ctx.strokeRect(paintingX, paintingY, main_canvas.width, main_canvas.height);
}

draw_ui(display_ctx);