const os = require('os');
const mongoose = require('mongoose');
const redis = require('redis');
const { Client } = require('@elastic/elasticsearch');

/**
 * Enhanced health check middleware for microservices
 * Provides detailed health status including dependencies
 */
class HealthCheckMiddleware {
  constructor(config = {}) {
    this.serviceName = config.serviceName || 'unknown-service';
    this.version = config.version || process.env.SERVICE_VERSION || '1.0.0';
    this.dependencies = config.dependencies || {};
    this.checks = new Map();
    
    // Register default checks
    this.registerCheck('system', this.checkSystem.bind(this));
    
    // Register dependency checks based on config
    if (this.dependencies.mongodb) {
      this.registerCheck('mongodb', this.checkMongoDB.bind(this));
    }
    if (this.dependencies.redis) {
      this.registerCheck('redis', this.checkRedis.bind(this));
    }
    if (this.dependencies.elasticsearch) {
      this.registerCheck('elasticsearch', this.checkElasticsearch.bind(this));
    }
  }

  /**
   * Register a custom health check
   */
  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  /**
   * System health check
   */
  async checkSystem() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      status: 'healthy',
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000000),
        system: Math.round(cpuUsage.system / 1000000)
      },
      load: os.loadavg(),
      hostname: os.hostname()
    };
  }

  /**
   * MongoDB health check
   */
  async checkMongoDB() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          message: 'MongoDB connection not ready',
          readyState: mongoose.connection.readyState
        };
      }

      // Ping the database
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        connections: mongoose.connections.length,
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  /**
   * Redis health check
   */
  async checkRedis() {
    const client = this.dependencies.redis;
    
    try {
      const start = Date.now();
      await client.ping();
      const responseTime = Date.now() - start;

      const info = await client.info();
      const memoryInfo = this.parseRedisInfo(info, 'used_memory_human');
      
      return {
        status: 'healthy',
        responseTime,
        memory: memoryInfo,
        connected: client.isOpen
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  /**
   * Elasticsearch health check
   */
  async checkElasticsearch() {
    const client = this.dependencies.elasticsearch;
    
    try {
      const start = Date.now();
      const health = await client.cluster.health();
      const responseTime = Date.now() - start;

      return {
        status: health.status === 'red' ? 'unhealthy' : 'healthy',
        clusterStatus: health.status,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards,
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  /**
   * Parse Redis INFO output
   */
  parseRedisInfo(info, key) {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(key + ':')) {
        return line.split(':')[1];
      }
    }
    return null;
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      checks: {},
      status: 'healthy',
      totalDuration: 0
    };

    const start = Date.now();

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const checkStart = Date.now();
        const result = await checkFn();
        result.duration = Date.now() - checkStart;
        return { name, result };
      } catch (error) {
        return {
          name,
          result: {
            status: 'unhealthy',
            error: error.message,
            duration: Date.now() - checkStart
          }
        };
      }
    });

    const checkResults = await Promise.all(checkPromises);

    // Aggregate results
    for (const { name, result } of checkResults) {
      results.checks[name] = result;
      if (result.status === 'unhealthy') {
        results.status = 'unhealthy';
      } else if (result.status === 'degraded' && results.status === 'healthy') {
        results.status = 'degraded';
      }
    }

    results.totalDuration = Date.now() - start;

    return results;
  }

  /**
   * Express middleware for basic health check
   */
  basic() {
    return async (req, res) => {
      const health = {
        status: 'ok',
        service: this.serviceName,
        version: this.version,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(health);
    };
  }

  /**
   * Express middleware for detailed health check
   */
  detailed() {
    return async (req, res) => {
      try {
        const results = await this.runAllChecks();
        const statusCode = results.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(results);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          service: this.serviceName,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Express middleware for liveness probe (Kubernetes)
   */
  liveness() {
    return async (req, res) => {
      // Simple check - is the service running?
      res.status(200).json({
        status: 'alive',
        service: this.serviceName,
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * Express middleware for readiness probe (Kubernetes)
   */
  readiness() {
    return async (req, res) => {
      try {
        const results = await this.runAllChecks();
        
        // Service is ready only if all critical dependencies are healthy
        const criticalChecks = ['mongodb', 'redis', 'elasticsearch'];
        const isReady = criticalChecks
          .filter(check => results.checks[check])
          .every(check => results.checks[check].status === 'healthy');

        if (isReady) {
          res.status(200).json({
            status: 'ready',
            service: this.serviceName,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(503).json({
            status: 'not ready',
            service: this.serviceName,
            reason: 'Dependencies not healthy',
            checks: results.checks,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          service: this.serviceName,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Prometheus metrics endpoint
   */
  metrics() {
    return async (req, res) => {
      try {
        const results = await this.runAllChecks();
        const metrics = [];

        // Service up metric
        metrics.push(`# HELP service_up Service health status (1 = healthy, 0 = unhealthy)`);
        metrics.push(`# TYPE service_up gauge`);
        metrics.push(`service_up{service="${this.serviceName}"} ${results.status === 'healthy' ? 1 : 0}`);

        // Response time metrics for each check
        for (const [name, check] of Object.entries(results.checks)) {
          if (check.duration) {
            metrics.push(`# HELP health_check_duration_ms Health check duration in milliseconds`);
            metrics.push(`# TYPE health_check_duration_ms gauge`);
            metrics.push(`health_check_duration_ms{service="${this.serviceName}",check="${name}"} ${check.duration}`);
          }
        }

        // System metrics
        if (results.checks.system) {
          const system = results.checks.system;
          metrics.push(`# HELP service_memory_usage_mb Service memory usage in MB`);
          metrics.push(`# TYPE service_memory_usage_mb gauge`);
          metrics.push(`service_memory_usage_mb{service="${this.serviceName}"} ${system.memory.used}`);
          
          metrics.push(`# HELP service_uptime_seconds Service uptime in seconds`);
          metrics.push(`# TYPE service_uptime_seconds counter`);
          metrics.push(`service_uptime_seconds{service="${this.serviceName}"} ${system.uptime}`);
        }

        res.set('Content-Type', 'text/plain');
        res.send(metrics.join('\n'));
      } catch (error) {
        res.status(500).send(`# Error generating metrics: ${error.message}`);
      }
    };
  }
}

module.exports = HealthCheckMiddleware;