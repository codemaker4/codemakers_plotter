let idleWorkers = [];
let allWorkers = [];
let queue = [];

setInterval(() => {
    id = Math.random();
}, 10);

onmessage = (e) => {
    const task = e.data[1];

    switch (e.data[0]) {
        case 0: // init
            let maxThreads = task[0];
            let workerScriptName = task[1];
            idleWorkers = [];
            allWorkers = [];
            queue = [];
            fetch(new Request(workerScriptName))
            .then(response => response.blob())
            .then(blob => {
                for (let i = 0; i < maxThreads; i++) {
                    let newWorker = new Worker(URL.createObjectURL(blob))
                    allWorkers.push(newWorker);
                    if (queue.length > 0) {
                        startTask(newWorker, queue[0]);
                        queue.splice(0, 1);
                    } else {
                        idleWorkers.push(newWorker);
                    }
                }
            });
            break;
        
        case 1: // message
            queueTask(task);
            break;
    
        case 2: // terminate
            for (let i = 0; i < allWorkers.length; i++) {
                allWorkers[i].terminate();
                allWorkers[i].onmessage = () => {};
            }
            break;
        case 3: // empty queue
            queue = [];
            break;
        default:
            break;
    }
}

function queueTask(task) {
    if (idleWorkers.length >= 1) {
        let worker = idleWorkers[0];
        idleWorkers.splice(0, 1);
        startTask(worker, task);
    } else {
        queue.push(task);
    }
}

function startTask(worker, task) {
    worker.postMessage(task);
    worker.onmessage = function(e) {
        if (queue.length == 0) {
            idleWorkers.push(worker);
        } else {
            startTask(worker, queue[0]);
            queue.splice(0, 1);
        }
        postMessage([queue.length, idleWorkers.length, e.data]);
    }
}