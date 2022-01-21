onmessage = (e) => {
    const [cx, cy, width, height, pixsize, sampleCount, funcTXT] = e.data; // cx = corner x
    let func
    try {
        func = Function("x", "y", "pixSize", funcTXT);
    } catch (error) {
        postMessage(["error", [error, cx, -cy, pixsize]]);
        return;
    }
    let image = new ImageData(width, height);
    for (let ix = 0; ix < width; ix++) {
        for (let iy = 0; iy < height; iy++) {
            let result
            try {
                if (sampleCount <= 1) {
                    result = toRGB(func((cx+ix)*pixsize + pixsize/2, -((cy+iy)*pixsize + pixsize/2), pixsize));
                } else {
                    const x = (cx+ix)*pixsize + pixsize/2;
                    const y = -((cy+iy)*pixsize + pixsize/2);
                    let newRes = [];
                    result = [0,0,0];
                    const samplesPerColor = Math.ceil(sampleCount/3);
                    for (let s = 0; s < sampleCount; s++) {
                        const xOff = (Math.random()-0.5)
                        newRes = toRGB(func(x + xOff*pixsize, y + (Math.random()-0.5)*pixsize, pixsize));
                        result[0] += newRes[0];
                        result[1] += newRes[1];
                        result[2] += newRes[2];
                    }
                    result[0] = result[0] / sampleCount;
                    result[1] = result[1] / sampleCount;
                    result[2] = result[2] / sampleCount;
                }
                image.data[(ix + iy*width)*4    ] = result[0];
                image.data[(ix + iy*width)*4 + 1] = result[1];
                image.data[(ix + iy*width)*4 + 2] = result[2];
                image.data[(ix + iy*width)*4 + 3] = 255;
            } catch (error) {
                postMessage(["error", [error, (cx+ix)*pixsize + pixsize/2, -((cy+iy)*pixsize + pixsize/2), pixsize]]);
                return;
            }
        }
    }
    postMessage(["ok", [cx, cy, width, height, pixsize, image]]);
}

function toRGB(result) {
    let out = [0,0,255]
    if (typeof result == "object") {
        out[0] = typeof result[0] == "number" ? result[0]*255 : (result[0] ? 255 : 0);
        out[1] = typeof result[1] == "number" ? result[1]*255 : (result[1] ? 255 : 0);
        out[2] = typeof result[2] == "number" ? result[2]*255 : (result[2] ? 255 : 0);
    } else if (typeof result == "number") {
        out[0] = result*255;
        out[1] = result*255;
        out[2] = result*255;
    } else if (typeof result == "boolean") {
        out[0] = result ? 255 : 0;
        out[1] = result ? 255 : 0;
        out[2] = result ? 255 : 0;
    } else {
        throw `Plotter: type ${typeof result} cannot be displayed`
    }
    return out;
}

function axis(x, y, pixSize) {
    const h = pixSize/2;
    return (x > -h && x <= h) || (y > -h && y <= h);
}

function grid(x, y, pixSize, gridSize) {
    const rPixSize = 10**Math.round(Math.log10(pixSize));
    return Math.abs(x%(rPixSize*gridSize)) < pixSize || Math.abs(y%(rPixSize*gridSize)) < pixSize
}

function line(func, x, y, pixSize) {
    const a = func(x - pixSize/2);
    const b = func(x + pixSize/2);
    return Math.min(a, b)-pixSize/2 < y && Math.max(a, b)+pixSize/2 > y;
}

function equal(funcA, funcB, x, y, pixSize) {
    const a = funcA(x-pixSize/2,y-pixSize/2) - funcB(x-pixSize/2,y-pixSize/2);
    const b = funcA(x-pixSize/2,y+pixSize/2) - funcB(x-pixSize/2,y+pixSize/2);
    const c = funcA(x+pixSize/2,y-pixSize/2) - funcB(x+pixSize/2,y-pixSize/2);
    const d = funcA(x+pixSize/2,y+pixSize/2) - funcB(x+pixSize/2,y+pixSize/2);
    return (a==0 || b==0 || c==0 || d==0) || !((a>0 == b>0) && (b>0 == c>0) && (c>0 == d>0))
}

function zero(funcA, x, y, pixSize) {
    const a = funcA(x-pixSize/2,y-pixSize/2);
    const b = funcA(x-pixSize/2,y+pixSize/2);
    const c = funcA(x+pixSize/2,y-pixSize/2);
    const d = funcA(x+pixSize/2,y+pixSize/2);
    return (a==0 || b==0 || c==0 || d==0) || !((a>0 == b>0) && (b>0 == c>0) && (c>0 == d>0))
}