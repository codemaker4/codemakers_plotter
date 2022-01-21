let plotter;
let lastChangeID = -1;
let canvas;
let ctx;
let guiElements;

const simple = "const a=(x*y)%255;return [a,a,a]";
const mandel = "const maxI = 1000;\nvar i=0;\nvar cx=x;\nvar cy=y;\nvar zx=0;\nvar zy=0;\ndo {\n    var xt=zx*zy;\n    zx=zx*zx-zy*zy+cx;\n    zy=2*xt+cy;\n    i++;\n} while(i<maxI&&(zx*zx+zy*zy)<4);\n\nif(i>=maxI){\n    return [0,0,0];\n}\nreturn [\n    Math.sin(i/127*Math.PI*2)+0.5,\n    Math.sin((i/127*Math.PI*2)+(Math.PI*0.6))+0.5,\n    Math.sin((i/127*Math.PI*2)+(Math.PI*1.3))+0.5\n];";
const lodDebug = "let i = 0; while (i < 1000) {i ++; let a = Math.sqrt(Math.random())} return [(pixSize*2454000000000)%255, (pixSize*23452000000000)%255, (pixSize*12410000000000000)%255]"
const random = "let i = 0; while (i < 1000) {i ++; let a = Math.sqrt(Math.random())} return [Math.random()*255, Math.random()*255, Math.random()*255]"
const circle = "return equal((x,y) => Math.sqrt(x**2 + y**2), (x,y) => 100, x, y, pixSize);"

window.onbeforeunload = function (e) {
    e = e || window.event;

    // For IE and Firefox prior to version 4
    if (e) {
        e.returnValue = 'Sure?';
    }

    // For Safari
    return 'Sure?';
};

window.addEventListener("load", () => {
    plotter = new PlotterCanvas(innerWidth, innerHeight, mandel, 10);
    canvas = document.getElementById("mainCanvas");
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    ctx = canvas.getContext("2d");
    
    let drawFunc = () => {
        // ctx.clearRect(0,0,canvas.width, canvas.height);
        if (lastChangeID !== plotter.lastChangeID) {
            ctx.drawImage(plotter.canvas, 0, 0);
            lastChangeID = plotter.lastChangeID;
        }

        guiElements.tasks.innerText = plotter.workerManager.queuedTasks;
        guiElements.pixSize.innerText = plotter.lodScale**plotter.currentPixsizePower;

        window.requestAnimationFrame(drawFunc);
    }
    window.requestAnimationFrame(drawFunc);

    guiElements = {
        guiDiv: document.getElementById("guiDiv"),
        buttonHide: document.getElementById("buttonHide"),
        buttonAdvanced: document.getElementById("buttonAdvanced"),
        inpFunc: document.getElementById("inpFunc"),
        pErr: document.getElementById("error"),
        inpX: document.getElementById("inpX"),
        inpY: document.getElementById("inpY"),
        tasks: document.getElementById("tasks"),
        pixSize: document.getElementById("pixSize"),
        inpScale: document.getElementById("inpScale"),
        inpLodP: document.getElementById("inpLodP"),
        inpLodM: document.getElementById("inpLodM"),
        inpLodC: document.getElementById("inpLodC"),
        inpPPC: document.getElementById("inpPPC"),
        inpThread: document.getElementById("inpThread"),
        advancedHidden: true,
        hidden: false
    }
    document.getElementById("buttonHide").onclick = toggleHidden;
    document.getElementById("buttonAdvanced").onclick = toggleAdvanced;
    document.getElementById("buttonRestart").onclick = () => {
        plotter.restartDrawing(true);
    };
    guiElements.inpFunc.oninput = (e) => {plotter.func = guiElements.inpFunc.value; hideError(); plotter.restartDrawing()}
    guiElements.inpX.oninput = (e) => {plotter.camX = parseFloat(guiElements.inpX.value); plotter.restartDrawing()}
    guiElements.inpY.oninput = (e) => {plotter.camY = parseFloat(-guiElements.inpY.value); plotter.restartDrawing()}
    guiElements.inpScale.oninput = (e) => {plotter.scale = parseFloat(guiElements.inpScale.value); plotter.restartDrawing()}
    guiElements.inpLodP.oninput = (e) => {if (isNaN(parseInt(guiElements.inpLodP.value))) {return}; plotter.lodScale = parseInt(guiElements.inpLodP.value); plotter.restartDrawing()}
    guiElements.inpLodM.oninput = (e) => {if (isNaN(parseInt(guiElements.inpLodM.value))) {return}; plotter.minPixSizePower = parseInt(guiElements.inpLodM.value); plotter.restartDrawing()}
    guiElements.inpLodC.oninput = (e) => {if (isNaN(parseInt(guiElements.inpLodC.value))) {return}; plotter.maxPixSizePower = parseInt(guiElements.inpLodC.value); plotter.restartDrawing()}
    guiElements.inpPPC.oninput = (e) => {if (isNaN(parseInt(guiElements.inpPPC.value))) {return}; plotter.maxPixelsPerTask = parseInt(guiElements.inpPPC.value); plotter.restartDrawing()}
    guiElements.inpThread.oninput = (e) => {if (isNaN(parseInt(guiElements.inpThread.value))) {return}; plotter.workerManager.maxThreads = parseInt(guiElements.inpThread.value); plotter.workerManager.restart(); plotter.restartDrawing()}
    updateGui();
});

document.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName == "INPUT" || document.activeElement.tagName == "TEXTAREA") {
        return;
    }
    if (e.key == "-") {
        plotter.zoom(2);
    } else if (e.key == "=" || e.key == "+") {
        plotter.zoom(0.5);
    } else if (e.key == "a" || e.key == "4" || e.key == "ArrowLeft") {
        plotter.translate(-innerWidth*0.1, 0);
    } else if (e.key == "d" || e.key == "6" || e.key == "ArrowRight") {
        plotter.translate(innerWidth*0.1, 0);
    } else if (e.key == "w" || e.key == "8" || e.key == "ArrowUp") {
        plotter.translate(0, -innerHeight*0.1);
    } else if (e.key == "s" || e.key == "2" || e.key == "ArrowDown") {
        plotter.translate(0, innerHeight*0.1);
    } else if (e.key == "h") {
        toggleHidden()
    }
    updateGui();
});

function updateGui() {
    guiElements.inpFunc.value = plotter.func;
    guiElements.inpX.value = plotter.camX;
    guiElements.inpY.value = -plotter.camY;
    guiElements.inpScale.value = plotter.scale;
    guiElements.inpLodP.value = plotter.lodScale;
    guiElements.inpLodM.value = plotter.minPixSizePower;
    guiElements.inpLodC.value = plotter.maxPixSizePower;
    guiElements.inpPPC.value = plotter.maxPixelsPerTask;
    guiElements.inpThread.value = plotter.workerManager.maxThreads;
}

function toggleHidden() {
    guiElements.hidden = !guiElements.hidden;
    if (guiElements.hidden) {
        guiElements.guiDiv.classList.add("hidden");
    } else {
        guiElements.guiDiv.classList.remove("hidden");
    }
}

function toggleAdvanced() {
    guiElements.advancedHidden = !guiElements.advancedHidden;
    let advancedEls = document.getElementsByClassName("advanced");
    for (let i = 0; i < advancedEls.length; i++) {
        const advancedEl = advancedEls[i];
        if (guiElements.advancedHidden) {
            advancedEl.classList.add("hidden");
        } else {
            advancedEl.classList.remove("hidden");
        }
    }
}

function showError(error, x, y, pixSize) {
    let errorText = `Error at:\nX: ${x}\nY: ${y}\nPixSize: ${pixSize}\nError:\n${error}`;
    guiElements.pErr.title = errorText;
    guiElements.pErr.innerHTML = errorText.replace(/\n/g, "<br>");
    guiElements.pErr.classList.remove("hidden");
}

function hideError() {
    guiElements.pErr.classList.add("hidden");
}