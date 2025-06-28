const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const ENABLE_JOB_QUEUE = process.env.ENABLE_JOB_QUEUE === 'true';
const QUEUE_REDIS_URL = process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'ph-price-tracker';
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS) || 300000;

// Redis connection for BullMQ
let connection = null;
let jobQueue = null;
let worker = null;
let queueConnected = false;

if (ENABLE_JOB_QUEUE) {
  try {
    connection = new Redis(QUEUE_REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryDelayOnFailover: 100
    });

    connection.on('connect', () => {
      queueConnected = true;
      console.log('✅ Job queue Redis connected');
    });

    connection.on('error', err => {
      queueConnected = false;
      console.warn('⚠️ Job queue Redis error:', err.message);
    });

    connection.on('close', () => {
      queueConnected = false;
      console.warn('⚠️ Job queue Redis disconnected');
    });

    // Main queue
    jobQueue = new Queue(QUEUE_PREFIX, { connection });

    // Example: Scraper job processor
    worker = new Worker(
      QUEUE_PREFIX,
      async job => {
        console.log(`Processing job ${job.id}: ${job.name}`);
        
        if (job.name === 'scrape') {
          // Example: call your scraper logic here
          console.log('Scraping data for:', job.data);
          
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return { 
            status: 'completed', 
            data: job.data,
            processedAt: new Date().toISOString()
          };
        }
        
        if (job.name === 'parse-pdf') {
          console.log('Parsing PDF:', job.data);
          return { 
            status: 'completed', 
            data: job.data,
            processedAt: new Date().toISOString()
          };
        }
        
        // Unknown job type
        throw new Error(`Unknown job type: ${job.name}`);
      },
      {
        connection,
        concurrency: MAX_CONCURRENT_JOBS,
        removeOnComplete: 10,
        removeOnFail: 5
      }
    );

    worker.on('completed', job => {
      console.log(`✅ Job ${job.id} (${job.name}) completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
    });

    worker.on('error', err => {
      console.error('❌ Worker error:', err);
    });

  } catch (error) {
    console.warn('⚠️ Failed to initialize job queue:', error.message);
    queueConnected = false;
  }
}

// Helper to check if queue is available
const isQueueAvailable = () => ENABLE_JOB_QUEUE && jobQueue && queueConnected;

// Helper to add jobs
async function addJob(name, data, opts = {}) {
  if (!isQueueAvailable()) {
    console.warn('⚠️ Job queue not available, job will be skipped:', { name, data });
    return { id: 'skipped', name, data, status: 'skipped' };
  }

  try {
    return await jobQueue.add(name, data, {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...opts
    });
  } catch (error) {
    console.warn('⚠️ Failed to add job (queue unavailable):', error.message);
    return { id: 'failed', name, data, status: 'failed', error: error.message };
  }
}

// Helper to get queue stats
async function getQueueStats() {
  if (!ENABLE_JOB_QUEUE) {
    return { enabled: false, reason: 'Job queue disabled in config' };
  }

  if (!isQueueAvailable()) {
    return { 
      enabled: true, 
      connected: false, 
      reason: 'Redis connection not available' 
    };
  }

  try {
    const waiting = await jobQueue.getWaiting();
    const active = await jobQueue.getActive();
    const completed = await jobQueue.getCompleted();
    const failed = await jobQueue.getFailed();

    return {
      enabled: true,
      connected: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    console.warn('⚠️ Failed to get queue stats:', error.message);
    return { 
      enabled: true, 
      connected: false, 
      error: error.message 
    };
  }
}

// Graceful shutdown
async function closeQueue() {
  try {
    if (worker) {
      await worker.close();
      console.log('✅ Job worker closed');
    }
    if (jobQueue) {
      await jobQueue.close();
      console.log('✅ Job queue closed');
    }
    if (connection) {
      await connection.quit();
      console.log('✅ Job queue Redis connection closed');
    }
  } catch (error) {
    console.warn('⚠️ Error during queue cleanup:', error.message);
  }
}

module.exports = {
  jobQueue,
  addJob,
  getQueueStats,
  closeQueue,
  QUEUE_PREFIX,
  ENABLE_JOB_QUEUE,
  isQueueAvailable
}; 