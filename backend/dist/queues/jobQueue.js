"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.JobQueue = void 0;
const events_1 = require("events");
const ProcessingJob_js_1 = require("../models/ProcessingJob.js");
const socketService_js_1 = require("../services/socketService.js");
class JobQueue extends events_1.EventEmitter {
    handlers = new Map();
    runningJobs = new Set();
    cancelledJobs = new Set();
    constructor() {
        super();
    }
    registerWorker(jobType, handler) {
        this.handlers.set(jobType, handler);
    }
    async addJob(params) {
        const job = await ProcessingJob_js_1.ProcessingJob.create({
            projectId: params.projectId,
            userId: params.userId,
            type: params.type,
            status: 'pending',
            progress: 0,
            currentStep: 'Queued in background queue',
            metadata: params.metadata || {},
            logs: [`[${new Date().toISOString()}] Job added to queue`],
            startedAt: new Date(),
        });
        // Notify clients via websocket
        socketService_js_1.socketService.emitToProject(params.projectId.toString(), 'job:created', {
            jobId: job._id,
            type: job.type,
            status: job.status,
        });
        // Run asynchronously
        setImmediate(() => this.processNext(job._id.toString()));
        return job;
    }
    async cancelJob(jobId) {
        this.cancelledJobs.add(jobId);
        const job = await ProcessingJob_js_1.ProcessingJob.findById(jobId);
        if (!job)
            return false;
        job.status = 'cancelled';
        job.currentStep = 'Cancelled by user';
        job.logs.push(`[${new Date().toISOString()}] Job cancelled by user`);
        await job.save();
        socketService_js_1.socketService.emitToProject(job.projectId.toString(), 'job:cancelled', {
            jobId: job._id,
            status: 'cancelled',
        });
        return true;
    }
    async processNext(jobId) {
        const job = await ProcessingJob_js_1.ProcessingJob.findById(jobId);
        if (!job || job.status === 'cancelled')
            return;
        const handler = this.handlers.get(job.type);
        if (!handler) {
            job.status = 'failed';
            job.error = `No worker registered for job type: ${job.type}`;
            await job.save();
            return;
        }
        this.runningJobs.add(jobId);
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();
        const updateProgress = async (progress, step) => {
            if (this.cancelledJobs.has(jobId))
                return;
            job.progress = Math.min(100, Math.max(0, Math.round(progress)));
            job.currentStep = step;
            job.logs.push(`[${new Date().toISOString()}] [${job.progress}%] ${step}`);
            await job.save();
            socketService_js_1.socketService.emitToProject(job.projectId.toString(), 'job:progress', {
                jobId: job._id,
                progress: job.progress,
                currentStep: step,
            });
        };
        const isCancelled = () => this.cancelledJobs.has(jobId);
        try {
            const result = await handler(job, updateProgress, isCancelled);
            if (this.cancelledJobs.has(jobId)) {
                job.status = 'cancelled';
                job.currentStep = 'Cancelled';
            }
            else {
                job.status = 'completed';
                job.progress = 100;
                job.currentStep = 'Completed successfully';
                job.completedAt = new Date();
                job.metadata = { ...job.metadata, result };
            }
            await job.save();
            socketService_js_1.socketService.emitToProject(job.projectId.toString(), 'job:completed', {
                jobId: job._id,
                status: job.status,
                result,
            });
        }
        catch (err) {
            job.status = 'failed';
            job.error = err.message || 'Job execution failed';
            job.logs.push(`[${new Date().toISOString()}] Error: ${err.message}`);
            await job.save();
            socketService_js_1.socketService.emitToProject(job.projectId.toString(), 'job:failed', {
                jobId: job._id,
                error: job.error,
            });
        }
        finally {
            this.runningJobs.delete(jobId);
            this.cancelledJobs.delete(jobId);
        }
    }
}
exports.JobQueue = JobQueue;
exports.jobQueue = new JobQueue();
