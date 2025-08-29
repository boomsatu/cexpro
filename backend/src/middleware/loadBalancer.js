const cluster = require('cluster');
const os = require('os');
const redis = require('../config/redis');
const performanceService = require('../services/performanceService');

class LoadBalancer {
  constructor() {
    this.servers = new Map();
    this.currentIndex = 0;
    this.healthCheckInterval = 30000; // 30 seconds
    this.requestCounts = new Map();
    this.responseTimes = new Map();
    
    this.initializeHealthChecks();
  }

  // Round Robin Load Balancing
  roundRobin(servers) {
    const availableServers = servers.filter(server => server.healthy);
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    const server = availableServers[this.currentIndex % availableServers.length];
    this.currentIndex++;
    return server;
  }

  // Weighted Round Robin
  weightedRoundRobin(servers) {
    const availableServers = servers.filter(server => server.healthy);
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    // Calculate total weight
    const totalWeight = availableServers.reduce((sum, server) => sum + server.weight, 0);
    
    // Generate weighted list
    const weightedList = [];
    availableServers.forEach(server => {
      const count = Math.round((server.weight / totalWeight) * 100);
      for (let i = 0; i < count; i++) {
        weightedList.push(server);
      }
    });
    
    const server = weightedList[this.currentIndex % weightedList.length];
    this.currentIndex++;
    return server;
  }

  // Least Connections Load Balancing
  leastConnections(servers) {
    const availableServers = servers.filter(server => server.healthy);
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    return availableServers.reduce((min, server) => 
      server.activeConnections < min.activeConnections ? server : min
    );
  }

  // Response Time Based Load Balancing
  responseTimeBased(servers) {
    const availableServers = servers.filter(server => server.healthy);
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    return availableServers.reduce((fastest, server) => 
      server.avgResponseTime < fastest.avgResponseTime ? server : fastest
    );
  }

  // Adaptive Load Balancing (combines multiple strategies)
  adaptiveLoadBalance(servers) {
    const availableServers = servers.filter(server => server.healthy);
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    // Calculate composite score for each server
    const scoredServers = availableServers.map(server => {
      const connectionScore = 1 / (server.activeConnections + 1);
      const responseTimeScore = 1 / (server.avgResponseTime + 1);
      const cpuScore = 1 / (server.cpuUsage + 0.1);
      const memoryScore = 1 / (server.memoryUsage + 0.1);
      
      const compositeScore = (
        connectionScore * 0.3 +
        responseTimeScore * 0.3 +
        cpuScore * 0.2 +
        memoryScore * 0.2
      );
      
      return { ...server, score: compositeScore };
    });
    
    // Return server with highest score
    return scoredServers.reduce((best, server) => 
      server.score > best.score ? server : best
    );
  }

  // Sticky Session Support
  getStickyServer(sessionId, servers) {
    const hash = this.hashString(sessionId);
    const availableServers = servers.filter(server => server.healthy);
    
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    const serverIndex = hash % availableServers.length;
    return availableServers[serverIndex];
  }

  // Circuit Breaker Pattern
  async circuitBreaker(server, request) {
    const circuitKey = `circuit:${server.id}`;
    const circuit = await redis.cache.get(circuitKey) || {
      state: 'CLOSED',
      failures: 0,
      lastFailure: null,
      nextAttempt: null
    };
    
    const now = Date.now();
    
    // Check circuit state
    if (circuit.state === 'OPEN') {
      if (now < circuit.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for server ${server.id}`);
      }
      // Try to half-open the circuit
      circuit.state = 'HALF_OPEN';
    }
    
    try {
      const result = await this.executeRequest(server, request);
      
      // Success - reset circuit
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        circuit.lastFailure = null;
        circuit.nextAttempt = null;
      }
      
      await redis.cache.set(circuitKey, circuit, 300);
      return result;
      
    } catch (error) {
      circuit.failures++;
      circuit.lastFailure = now;
      
      // Open circuit if failure threshold reached
      if (circuit.failures >= 5) {
        circuit.state = 'OPEN';
        circuit.nextAttempt = now + 60000; // 1 minute
      }
      
      await redis.cache.set(circuitKey, circuit, 300);
      throw error;
    }
  }

  // Request Rate Limiting per Server
  async checkServerRateLimit(serverId, limit = 1000) {
    const key = `server_rate:${serverId}`;
    const current = await redis.client.incr(key);
    
    if (current === 1) {
      await redis.client.expire(key, 60); // 1 minute window
    }
    
    return current <= limit;
  }

  // Health Check Implementation
  async healthCheck(server) {
    const startTime = Date.now();
    
    try {
      // Perform health check (HTTP request, database ping, etc.)
      const response = await this.pingServer(server);
      const responseTime = Date.now() - startTime;
      
      // Update server metrics
      server.healthy = response.status === 'ok';
      server.lastHealthCheck = new Date();
      server.avgResponseTime = this.updateAverage(server.avgResponseTime, responseTime);
      
      // Update server load metrics
      if (response.metrics) {
        server.cpuUsage = response.metrics.cpu || 0;
        server.memoryUsage = response.metrics.memory || 0;
        server.activeConnections = response.metrics.connections || 0;
      }
      
      return server.healthy;
      
    } catch (error) {
      console.error(`Health check failed for server ${server.id}:`, error.message);
      server.healthy = false;
      server.lastHealthCheck = new Date();
      return false;
    }
  }

  // Auto-scaling based on load
  async autoScale() {
    const metrics = await performanceService.monitorPerformance();
    const totalConnections = Array.from(this.servers.values())
      .reduce((sum, server) => sum + server.activeConnections, 0);
    
    const avgCpuUsage = Array.from(this.servers.values())
      .reduce((sum, server) => sum + server.cpuUsage, 0) / this.servers.size;
    
    const avgMemoryUsage = Array.from(this.servers.values())
      .reduce((sum, server) => sum + server.memoryUsage, 0) / this.servers.size;
    
    // Scale up conditions
    if (avgCpuUsage > 80 || avgMemoryUsage > 85 || totalConnections > 8000) {
      console.log('High load detected, considering scale up');
      await this.scaleUp();
    }
    
    // Scale down conditions
    if (avgCpuUsage < 30 && avgMemoryUsage < 50 && totalConnections < 2000) {
      console.log('Low load detected, considering scale down');
      await this.scaleDown();
    }
  }

  // Cluster Management
  initializeCluster() {
    const numCPUs = os.cpus().length;
    
    if (cluster.isMaster) {
      console.log(`Master ${process.pid} is running`);
      
      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork();
        this.servers.set(worker.id, {
          id: worker.id,
          pid: worker.process.pid,
          healthy: true,
          weight: 1,
          activeConnections: 0,
          avgResponseTime: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          lastHealthCheck: new Date()
        });
      }
      
      // Handle worker exit
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        this.servers.delete(worker.id);
        
        // Restart worker
        const newWorker = cluster.fork();
        this.servers.set(newWorker.id, {
          id: newWorker.id,
          pid: newWorker.process.pid,
          healthy: true,
          weight: 1,
          activeConnections: 0,
          avgResponseTime: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          lastHealthCheck: new Date()
        });
      });
      
    } else {
      console.log(`Worker ${process.pid} started`);
    }
  }

  // Middleware for Express
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Add load balancing headers
      res.setHeader('X-Load-Balancer', 'CEX-LB-v1.0');
      res.setHeader('X-Server-ID', process.pid);
      
      // Track request
      const serverId = process.pid;
      this.incrementRequestCount(serverId);
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(serverId, responseTime);
        
        // Add performance headers
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  // Helper Methods
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  updateAverage(currentAvg, newValue, weight = 0.1) {
    return currentAvg === 0 ? newValue : (currentAvg * (1 - weight)) + (newValue * weight);
  }

  incrementRequestCount(serverId) {
    const current = this.requestCounts.get(serverId) || 0;
    this.requestCounts.set(serverId, current + 1);
  }

  recordResponseTime(serverId, responseTime) {
    const times = this.responseTimes.get(serverId) || [];
    times.push(responseTime);
    
    // Keep only last 100 response times
    if (times.length > 100) {
      times.shift();
    }
    
    this.responseTimes.set(serverId, times);
  }

  async pingServer(server) {
    // Simulate server ping - in real implementation, this would be HTTP request
    return {
      status: 'ok',
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 1000)
      }
    };
  }

  async executeRequest(server, request) {
    // Simulate request execution - in real implementation, this would forward request
    return { success: true, data: 'Request processed' };
  }

  async scaleUp() {
    console.log('Scaling up - adding new worker');
    if (cluster.isMaster) {
      const worker = cluster.fork();
      this.servers.set(worker.id, {
        id: worker.id,
        pid: worker.process.pid,
        healthy: true,
        weight: 1,
        activeConnections: 0,
        avgResponseTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        lastHealthCheck: new Date()
      });
    }
  }

  async scaleDown() {
    if (this.servers.size <= 2) return; // Keep minimum 2 workers
    
    console.log('Scaling down - removing worker');
    if (cluster.isMaster) {
      const workers = Array.from(this.servers.keys());
      const workerToRemove = workers[workers.length - 1];
      
      const worker = cluster.workers[workerToRemove];
      if (worker) {
        worker.kill();
        this.servers.delete(workerToRemove);
      }
    }
  }

  initializeHealthChecks() {
    setInterval(async () => {
      try {
        for (const server of this.servers.values()) {
          await this.healthCheck(server);
        }
      } catch (error) {
        console.error('Error in health check interval:', error);
        // Continue without crashing to prevent unhandled rejection
      }
    }, this.healthCheckInterval);
    
    // Auto-scaling check every 2 minutes
    setInterval(async () => {
      try {
        await this.autoScale();
      } catch (error) {
        console.error('Error in auto-scaling interval:', error);
        // Continue without crashing to prevent unhandled rejection
      }
    }, 120000);
  }

  // Get load balancer statistics
  getStats() {
    const servers = Array.from(this.servers.values());
    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    return {
      totalServers: servers.length,
      healthyServers: servers.filter(s => s.healthy).length,
      totalRequests,
      avgResponseTime: this.calculateOverallAvgResponseTime(),
      servers: servers.map(server => ({
        id: server.id,
        pid: server.pid,
        healthy: server.healthy,
        activeConnections: server.activeConnections,
        avgResponseTime: server.avgResponseTime,
        cpuUsage: server.cpuUsage,
        memoryUsage: server.memoryUsage,
        requestCount: this.requestCounts.get(server.id) || 0
      }))
    };
  }

  calculateOverallAvgResponseTime() {
    const allTimes = [];
    for (const times of this.responseTimes.values()) {
      allTimes.push(...times);
    }
    
    if (allTimes.length === 0) return 0;
    return allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
  }
}

module.exports = new LoadBalancer();