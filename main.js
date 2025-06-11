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
display_canvas.imageSmoothingEnabled = false;

// main canvas for the painting area
const main_canvas = document.createElement('canvas');
const main_ctx = main_canvas.getContext('2d');
let padding_h = 100;
let padding_v = 100;
const displayToPainting = ({x, y}) => {return {x: x - padding_h, y: y - padding_v};};
const paintingToDisplay = ({x, y}) => {return {x: x + padding_h, y: y + padding_v};};
const insidePainting = ({x, y}) => {return (x >= 0 && x < main_canvas.width && y >= 0 && y < main_canvas.height);};

// rendered on top of the main canvas, used for current stroke
const stroke_canvas = document.createElement('canvas');
const stroke_ctx = stroke_canvas.getContext('2d');

function resize_painting() {
    display_canvas.width = Math.floor(window.innerWidth);
    display_canvas.height = Math.floor(window.innerHeight);
    display_canvas.style.width = `${display_canvas.width}px`;
    display_canvas.style.height = `${display_canvas.height}px`;
    
    padding_h = display_canvas.width > 600 ? 64 : 16;
    padding_v = display_canvas.width > 600 ? 84 : 48;
    main_canvas.width = display_canvas.width - padding_h * 2;
    main_canvas.height = display_canvas.height - padding_v * 2;

    main_ctx.fillStyle = 'white';
    main_ctx.fillRect(0, 0, main_canvas.width, main_canvas.height);

    stroke_canvas.width = main_canvas.width;
    stroke_canvas.height = main_canvas.height;
}
resize_painting(); // initial size

// state for drawing
let points = [];
let isDrawing = false;
let isErasing = false;
let isLine = false;

// initial drawing
stroke_ctx.lineWidth = 2;
stroke_ctx.lineJoin = 'round';
stroke_ctx.lineCap = 'round';


// events

window.addEventListener('resize', () => {
    resize_painting();
    draw_ui(display_ctx);
});

display_canvas.addEventListener('pointerdown', (e) => {
    points = [];

    // apply last stroke to main canvas
    main_ctx.drawImage(stroke_canvas, 0, 0);
    stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

    isDrawing = true;
    set_color(stroke_ctx, isErasing);
    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    const pressure = (e.pointerType === 'mouse') ? null : e.pressure;
    points.push(new Point(x, y, pressure));

    draw_ui(display_ctx);
});
display_canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    
    // only draw the last part
    // not: stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

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

document.addEventListener('keydown', (e) => {
    if (e.key === '1') {
        pressedButton(document.getElementById('button-color'));
    } else if (e.key === '2') {
        pressedButton(document.getElementById('button-tool'));
    } else if (e.key === '3') {
        pressedButton(document.getElementById('button-undo'));
    } else if (e.key === '4') {
        pressedButton(document.getElementById('button-save'));
    }
});

function pressedButton(el) {
    if (el.innerText === 'draw') {
        el.innerText = 'erase';
        el.style.backgroundColor = 'white';
        el.style.color = 'black';
        isErasing = true;
        set_color(stroke_ctx, isErasing);
    } else if (el.innerText === 'erase') {
        el.innerText = 'draw';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'white';
        isErasing = false;
        set_color(stroke_ctx, isErasing);
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
        if (isDrawing) return;
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

function set_color(ctx, isErasing) {
    if (isErasing) {
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
    } else {
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
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
    const pressure = points[i].pressure || points[i-1].pressure || 0.2;
    const randomness = 1 + Math.random() * 0.4 - 0.2; // add some randomness to the line width
    stroke_ctx.lineWidth = pressure * 10;
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
}

draw_ui(display_ctx);