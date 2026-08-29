package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/daydev/mbg-system/backend/internal/pkg"
	"github.com/gin-gonic/gin"
)

type clientBucket struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	clients  map[string]*clientBucket
	rate     float64 // tokens per second
	capacity float64 // burst capacity
}

func NewRateLimiter(rps float64, burst float64) *RateLimiter {
	limiter := &RateLimiter{
		clients:  make(map[string]*clientBucket),
		rate:     rps,
		capacity: burst,
	}

	// Periodic cleanup of stale clients
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			limiter.mu.Lock()
			now := time.Now()
			for ip, bucket := range limiter.clients {
				if now.Sub(bucket.lastRefill) > 15*time.Minute {
					delete(limiter.clients, ip)
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		bucket, exists := rl.clients[ip]
		now := time.Now()

		if !exists {
			bucket = &clientBucket{
				tokens:     rl.capacity,
				lastRefill: now,
			}
			rl.clients[ip] = bucket
		} else {
			// Refill tokens based on elapsed time
			elapsed := now.Sub(bucket.lastRefill).Seconds()
			bucket.tokens += elapsed * rl.rate
			if bucket.tokens > rl.capacity {
				bucket.tokens = rl.capacity
			}
			bucket.lastRefill = now
		}

		if bucket.tokens >= 1.0 {
			bucket.tokens -= 1.0
			rl.mu.Unlock()
			c.Next()
			return
		}

		rl.mu.Unlock()
		pkg.Error(c, http.StatusTooManyRequests, "Rate limit exceeded. Please throttle requests.", nil)
		c.Abort()
	}
}
