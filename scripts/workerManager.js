class WorkerManager {
    constructor(maxThreads, workerScriptName) {
        this.maxThreads = maxThreads;
        this.workerScriptName = workerScriptName;

        this.messageCallback = () => {throw "No callback set"}; // must be overwritten externally.
        this.queueEmptyCallback = undefined; // function that can optionally be set externally.

        this.worker = new Worker("scripts/workerManagerWorker.js");
        this.worker.postMessage([0, [this.maxThreads, this.workerScriptName]]);
                // [messageType, messageContent, [messageContent]];
        // messageType 0 = init(maxThreads, workerScriptName)
        // messageType 1 = queueTask(data)
        // messageType 2 = terminateAll

        this.worker.onmessage = (e) => {
            this.queuedTasks = e.data[0] + (this.maxThreads - e.data[1]);
            this.messageCallback(e.data[2]);
            if (this.queueEmptyCallback && this.queuedTasks == 0) {
                this.queueEmptyCallback();
            }
        }

        this.queuedTasks = 0;
    }
    postMessage(data) {
        this.worker.postMessage([1, data]);
        this.queuedTasks += 1;
    }
    terminate() {
        this.worker.postMessage([2]);
        this.worker.terminate();
    }
    cancelQueue() {
        this.worker.postMessage([3]);
        this.queuedTasks = Math.min(this.maxThreads, this.queuedTasks);
    }
    restart() {
        this.terminate();
        this.worker = new Worker("scripts/workerManagerWorker.js");
        this.worker.postMessage([0, [this.maxThreads, this.workerScriptName]]);
        
        this.worker.onmessage = (e) => {
            this.queuedTasks = e.data[0] + (this.maxThreads - e.data[1]);
            this.messageCallback(e.data[2]);
            if (this.queueEmptyCallback && this.queuedTasks == 0) {
                this.queueEmptyCallback();
            }
        }

        this.queuedTasks = 0;
    }
}