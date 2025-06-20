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
main_ctx.imageSmoothingEnabled = false;
let padding_h = 100;
let padding_v = 100;
const displayToPainting = ({x, y}) => {return {x: x - padding_h, y: y - padding_v};};
const paintingToDisplay = ({x, y}) => {return {x: x + padding_h, y: y + padding_v};};
const insidePainting = ({x, y}) => {return (x >= 0 && x < main_canvas.width && y >= 0 && y < main_canvas.height);};

// rendered on top of the main canvas, used for current stroke
const stroke_canvas = document.createElement('canvas');
const stroke_ctx = stroke_canvas.getContext('2d');

function resize_painting(is_initial = false) {
    // resize display
    display_canvas.width = Math.floor(window.innerWidth);
    display_canvas.height = Math.floor(window.innerHeight);
    display_canvas.style.width = `${display_canvas.width}px`;
    display_canvas.style.height = `${display_canvas.height}px`;
    padding_h = display_canvas.width > 600 ? 64 : 16;
    padding_v = display_canvas.width > 600 ? 84 : 48;

    // save old state and resize main canvas
    const image_data = main_ctx.getImageData(0, 0, main_canvas.width, main_canvas.height);
    main_canvas.width = display_canvas.width - padding_h * 2;
    main_canvas.height = display_canvas.height - padding_v * 2;
    // fill with white and draw new state
    main_ctx.fillStyle = 'white';
    main_ctx.fillRect(0, 0, main_canvas.width, main_canvas.height);
    if (!is_initial) { 
        main_ctx.putImageData(image_data, 0, 0);
        main_ctx.drawImage(stroke_canvas, 0, 0);
    }

    // also update stroke canvas
    stroke_canvas.width = main_canvas.width;
    stroke_canvas.height = main_canvas.height;
    stroke_ctx.lineJoin = 'round';
    stroke_ctx.lineCap = 'round';
}

// ui

function draw_ui(ctx) {
    ctx.fillStyle = '#864';
    ctx.fillRect(0, 0, display_canvas.width, display_canvas.height);

    const {x: paintingX, y: paintingY} = paintingToDisplay({x: 0, y: 0});
    ctx.drawImage(main_canvas, paintingX, paintingY);
    ctx.drawImage(stroke_canvas, paintingX, paintingY);
}
resize_painting(true); // initial size
draw_ui(display_ctx); // initial draw


// events

let points = [];
let isDrawing = false;
let isErasing = false;
let isLine = false;
let empty_canvas = true;

window.addEventListener('resize', () => {
    resize_painting();
    draw_ui(display_ctx);
});

const canvas_input_div = document.getElementById('canvas-input-div');

// fix to allow scribble feature on iPadOS while still getting all points
canvas_input_div.addEventListener('touchmove', (e) => { e.preventDefault(); }); 

canvas_input_div.addEventListener('pointerdown', (e) => {
    points = [];
    // apply last stroke to main canvas
    main_ctx.drawImage(stroke_canvas, 0, 0);
    stroke_ctx.clearRect(0, 0, stroke_canvas.width, stroke_canvas.height);

    isDrawing = true;
    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    const pressure = (e.pointerType === 'mouse') ? null : e.pressure;
    points.push(new Point(x, y, pressure));
});
canvas_input_div.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    
    // only draw the last part
    const {x, y} = displayToPainting({x: e.clientX, y: e.clientY});
    const pressure = (e.pointerType === 'mouse') ? null : e.pressure;
    points.push(new Point(x, y, pressure));

    draw_stroke(stroke_ctx);
    draw_ui(display_ctx);
});
window.addEventListener('pointerup', (e) => {
    if (!isDrawing) return;
    if (empty_canvas) {
        empty_canvas = false;
        document.getElementById('button-save').innerText = 'save';
    }
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
    } else if (el.innerText === 'erase') {
        el.innerText = 'draw';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'white';
        isErasing = false;
    } else if (el.innerText === 'lines') {
        el.innerText = 'shapes';
        el.style.backgroundColor = 'transparent';
        el.style.color = 'white';
        isLine = false;
    } else if (el.innerText === 'shapes') {
        el.innerText = 'lines';
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
    } else if (el.innerText === 'load') {
        // load from image file
        const input = document.createElement('input');
        input.type = 'file';
        // ideally, the first one works, which covers all sorts of images. whether or not it can be drawn, at least it will be loaded...
        input.accept = 'image/*, image/png, image/jpeg, image/gif, image/bmp, image/webp, image/heic';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // success
                    main_ctx.drawImage(img, 0, 0);
                    draw_ui(display_ctx);
                    el.innerText = 'save';
                }
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }
}

// draw brushstrokes

function draw_stroke(ctx) {
    // const dark_hues =  ["#2b1e22", "#2b1f1f", "#2b1f1d", "#2a201b", "#29211a", "#272119", "#262219", "#23231a", "#21241a", "#1f241c", "#1d251e", "#1b2520", "#1a2523", "#1a2525", "#1a2527", "#1a2428", "#1b242a", "#1c232c", "#1e222d", "#21212c", "#24202b", "#261f2a", "#281f27", "#2a1e25"]
    // const light_hues = ["#f1dce2", "#f2ddde", "#f1deda", "#f1ded6", "#f0dfd2", "#eee0ce", "#ebe2ca", "#e6e5c9", "#dfe7ca", "#d8e9d0", "#d2ead6", "#ceebdd", "#cbebe3", "#cbeae9", "#cde8ed", "#d1e7f0", "#d5e5f1", "#d9e4f2", "#dde2f2", "#e1e1f2", "#e5dff1", "#e9deef", "#edddeb", "#f0dce6"]
    
    // set color
    if (isErasing) {
        ctx.strokeStyle = 'white'; // light_hues[Math.floor(Math.random() * light_hues.length)];
        ctx.fillStyle = 'white'; // '#fcfcfc'; // '#e2e2e2';
    } else {
        ctx.strokeStyle = 'black'; // dark_hues[Math.floor(Math.random() * dark_hues.length)];
        ctx.fillStyle = 'black'; // '#080808'; // '#222'
    }

    // draw
    if (isLine) {
        draw_line(ctx);
        return;
    }
    draw_fan(ctx);
}

function draw_fan(ctx) {
    if (points.length < 2) return;

    // only draw the last points, assuming no refreshing of the canvas
    const i = points.length - 1;
    ctx.lineWidth = 2; // 1 is not enough apparently to hide the gaps
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[i-1].x, points[i-1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.fill();
    ctx.stroke();
}

function draw_line(ctx) {
    if (points.length < 2) return;

    // only draw the last points, assuming no refreshing of the canvas
    const i = points.length - 1;
    const pressure = points[i].pressure || points[i-1].pressure || 0.2;
    // const randomness = 1 + Math.random() * 0.4 - 0.2; // add some randomness to the line width
    ctx.lineWidth = pressure * 10; // default 2 if no pressure
    ctx.beginPath();
    ctx.moveTo(points[i-1].x, points[i-1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
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