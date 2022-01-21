class PlotterCanvas {
    constructor(width, height, func, maxThreads = 10, maxPixSizePower = 2, minPixSizePower = 0, lodScale = 4) {
        this.width = width; // the resolution of the canvas;
        this.height = height;
        this.func = func;
        this.maxPixelsPerTask = 10000;
        this.maxThreads = maxThreads;
        this.scale = 0.01; // the scale of the plotter. Measured in the amount of units across one pixel (at pixsize 1)
        this.camX = 0; // center of the canvas;
        this.camY = 0;
        this.maxPixSizePower = maxPixSizePower; // pixSize is for LOD scaling. It is in lodScale^n, so pixsize 5 means pixels are 32 times larger
        this.minPixSizePower = minPixSizePower;
        this.currentPixsizePower = maxPixSizePower; // the current pixsize being calculated
        this.lodScale = lodScale;
        this.lastChangeID = Math.random(); // number that changes every time something has been changed in the canvas.

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled= false;

        this.workerManager = new WorkerManager(maxThreads, "cm4PlotterWorker.js");
        this.workerManager.messageCallback = (data) => {this.processCalculatedImage(data)}
        this.workerManager.queueEmptyCallback = () => {
            if (this.currentPixsizePower <= this.minPixSizePower) {
                console.log("rendering done");
                return;
            }
            this.currentPixsizePower -= 1;
            this.queueFullImage();
            // console.log("queued next pixsize");
        }
        this.queueFullImage();
    }
    zoom(scale) {
        this.scale = this.scale*scale;
        this.ctx.drawImage(this.canvas, this.width/2 - this.width/2/scale, this.height/2 - this.height/2/scale, this.width/scale, this.height/scale);
        if (plotter.workerManager.queuedTasks > 0) { // cancel currend LOD rendering, if rendering is done try at detailed LOD
            this.currentPixsizePower = Math.min(this.currentPixsizePower+1, this.maxPixSizePower);
        }
        this.workerManager.cancelQueue();
        this.queueFullImage();
        this.lastChangeID = Math.random()
    }
    translate(dx, dy) {
        const pdx = dx*this.scale;
        const pdy = dy*this.scale;
        this.camX += pdx;
        this.camY += pdy;
        this.ctx.drawImage(this.canvas, Math.round(-dx), Math.round(-dy));
        if (plotter.workerManager.queuedTasks > 0) { // cancel currend LOD rendering, if rendering is done try at detailed LOD
            this.currentPixsizePower = Math.min(Math.max(this.currentPixsizePower+1, 0), this.maxPixSizePower);
        } else {
            this.currentPixsizePower = Math.max(this.currentPixsizePower, 0);
        }
        const pixSize = this.lodScale**this.currentPixsizePower * this.scale;
        if (dx < 0) { // image moved to right
            this.workerManager.cancelQueue();
            this.queueTask(
                Math.floor((this.camX- this.width/2*this.scale)/pixSize),
                Math.floor((this.camY- this.height/2*this.scale)/pixSize),
                Math.ceil((this.camX - this.width/2*this.scale - pdx)/pixSize),
                Math.ceil((this.camY + this.height/2*this.scale)/pixSize),
                pixSize,
                1
            );
        } else if (dx > 0) {
            this.workerManager.cancelQueue();
            this.queueTask(
                Math.floor((this.camX+ this.width/2*this.scale - pdx)/pixSize),
                Math.floor((this.camY- this.height/2*this.scale)/pixSize),
                Math.ceil((this.camX + this.width/2*this.scale)/pixSize),
                Math.ceil((this.camY + this.height/2*this.scale)/pixSize),
                pixSize,
                1
            );
        }
        if (dy < 0) { // image moved to right
            this.workerManager.cancelQueue();
            this.queueTask(
                Math.floor((this.camX- this.width/2*this.scale)/pixSize),
                Math.floor((this.camY- this.height/2*this.scale)/pixSize),
                Math.ceil((this.camX + this.width/2*this.scale)/pixSize),
                Math.ceil((this.camY - this.height/2*this.scale - pdy)/pixSize),
                pixSize,
                1
            );
        } else if (dy > 0) {
            this.workerManager.cancelQueue();
            this.queueTask(
                Math.floor((this.camX- this.width/2*this.scale)/pixSize),
                Math.floor((this.camY+ this.height/2*this.scale- pdy)/pixSize),
                Math.ceil((this.camX + this.width/2*this.scale)/pixSize),
                Math.ceil((this.camY + this.height/2*this.scale)/pixSize),
                pixSize,
                1
            );
        }
        this.lastChangeID = Math.random()
    }
    restartDrawing(fullRestart = false) {
        this.currentPixsizePower = this.maxPixSizePower;
        if (fullRestart) {
            this.workerManager.restart();
        } else {
            this.workerManager.cancelQueue();
        }
        this.queueFullImage();
        // this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    }
    queueFullImage() {
        const pixSize = this.lodScale**Math.max(this.currentPixsizePower,0) * this.scale;
        const sampleCount = this.lodScale**Math.max(-this.currentPixsizePower,0);
        this.queueTask(
            Math.floor((this.camX- this.width/2*this.scale)/pixSize),
            Math.floor((this.camY- this.height/2*this.scale)/pixSize),
            Math.ceil((this.camX + this.width/2*this.scale)/pixSize),
            Math.ceil((this.camY + this.height/2*this.scale)/pixSize),
            pixSize,
            sampleCount
        );
    }
    queueTask(x1, y1, x2, y2, pixSize, sampleCount) { // coordinates in pixels at current pixsize relative to function coordinate space
        const width = x2-x1;
        const height = y2-y1;
        if (width == 0 || height == 0) {
            return;
        }

        if (width*height > this.maxPixelsPerTask) {
            if (width>height) {
                const mid1 = x1+Math.round(width/3);
                const mid2 = x2-Math.round(width/3);
                this.queueTask(mid1, y1, mid2, y2, pixSize, sampleCount);
                this.queueTask(x1  , y1, mid1, y2, pixSize, sampleCount);
                this.queueTask(mid2, y1, x2  , y2, pixSize, sampleCount);
            } else {
                const mid1 = y1+Math.round(height/3);
                const mid2 = y2-Math.round(height/3);
                this.queueTask(x1, mid1, x2, mid2, pixSize, sampleCount);
                this.queueTask(x1, y1  , x2, mid1, pixSize, sampleCount);
                this.queueTask(x1, mid2, x2, y2  , pixSize, sampleCount);
            }
            return;
        }

        this.workerManager.postMessage([x1, y1, width, height, pixSize, sampleCount, this.func]);
    }
    processCalculatedImage(data) {
        if (data[0] == "ok") {
            const [cx, cy, width, height, pixsize, image] = data[1];
            const imageMultiplier = pixsize/this.scale;
            const ix = (cx*imageMultiplier) - this.camX/this.scale + this.width/2;
            const iy = (cy*imageMultiplier) - this.camY/this.scale + this.height/2;
            let scalingCanvas = document.createElement("canvas");
            scalingCanvas.width = width;
            scalingCanvas.height = height;
            scalingCanvas.getContext("2d").putImageData(image, 0, 0);
            this.ctx.drawImage(scalingCanvas, Math.round(ix), Math.round(iy), Math.round(width*imageMultiplier), Math.round(height*imageMultiplier));
        } else if (data[0] == "error") {
            showError(...data[1]);
        }
        this.lastChangeID = Math.random()
    }
}