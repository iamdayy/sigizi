package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/database"
	"github.com/daydev/mbg-system/backend/internal/middleware"
	"github.com/daydev/mbg-system/backend/internal/modules/distribution"
	"github.com/daydev/mbg-system/backend/internal/modules/finance"
	"github.com/daydev/mbg-system/backend/internal/modules/iam"
	"github.com/daydev/mbg-system/backend/internal/modules/inventory"
	"github.com/daydev/mbg-system/backend/internal/modules/menu"
	"github.com/daydev/mbg-system/backend/internal/modules/qc"
	"github.com/daydev/mbg-system/backend/internal/modules/reporting"
	"github.com/daydev/mbg-system/backend/internal/pkg"
	"github.com/daydev/mbg-system/backend/internal/scheduler"
	"github.com/daydev/mbg-system/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("=================================================================")
	log.Println("  Makan Bergizi Gratis (MBG) - SPPG Operational Management System")
	log.Println("  Production Backend Service v2.0.0 (Go/Gin/PostgreSQL)")
	log.Println("=================================================================")

	// 1. Load Configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	// 2. Initialize Database & Run AutoMigrate
	db, err := database.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Failed to connect to database: %v", err)
	}

	// 3. Initialize Storage Provider (R2 / S3 / Local fallback)
	storageSvc := storage.NewStorageService(cfg)

	// 4. Wire Modules & Repositories (Layered Architecture Composition Root)
	// IAM
	iamRepo := iam.NewRepository(db.DB)
	iamSvc := iam.NewService(iamRepo, cfg)
	iamHandler := iam.NewHandler(iamSvc)

	// Inventory
	invRepo := inventory.NewRepository(db.DB)
	invSvc := inventory.NewService(invRepo)
	invHandler := inventory.NewHandler(invSvc)

	// Finance
	finRepo := finance.NewRepository(db.DB)
	finSvc := finance.NewService(finRepo, invSvc)
	finHandler := finance.NewHandler(finSvc)

	// Distribution
	distRepo := distribution.NewRepository(db.DB)
	distSvc := distribution.NewService(distRepo, storageSvc)
	distHandler := distribution.NewHandler(distSvc)

	// Quality Control & Food Safety
	qcRepo := qc.NewRepository(db.DB)
	qcSvc := qc.NewService(qcRepo)
	qcHandler := qc.NewHandler(qcSvc)

	// Menu Planning & Nutrition AKG
	menuRepo := menu.NewRepository(db.DB)
	menuSvc := menu.NewService(menuRepo)
	menuHandler := menu.NewHandler(menuSvc)

	// Reporting & Virtual Account
	repRepo := reporting.NewRepository(db.DB)
	repSvc := reporting.NewService(repRepo, storageSvc)
	repHandler := reporting.NewHandler(repSvc)

	// 5. Start Background Cron Scheduler (23:59 WIB Daily Reconciliation)
	cronScheduler := scheduler.NewCronScheduler(cfg, finSvc)
	cronScheduler.Start()
	defer cronScheduler.Stop()

	// 6. Setup HTTP Engine & Middlewares
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.TraceID())
	router.Use(middleware.CORS())

	// Rate Limiter: 100 requests/sec with burst of 200 per IP
	rateLimiter := middleware.NewRateLimiter(100.0, 200.0)
	router.Use(rateLimiter.Middleware())

	// Static route for local uploads fallback
	router.Static("/uploads", cfg.LocalStoragePath)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		pkg.Success(c, http.StatusOK, "MBG SPPG System is healthy", gin.H{
			"status":    "UP",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "2.0.0",
		})
	})

	// 7. Register API Routes
	v1 := router.Group("/api/v1")
	authMW := middleware.AuthMiddleware(cfg)

	iamHandler.RegisterRoutes(v1, authMW)
	invHandler.RegisterRoutes(v1, authMW)
	finHandler.RegisterRoutes(v1, authMW)
	distHandler.RegisterRoutes(v1, authMW)
	qcHandler.RegisterRoutes(v1, authMW)
	menuHandler.RegisterRoutes(v1, authMW)
	repHandler.RegisterRoutes(v1, authMW)

	// 8. Graceful Server Startup & Shutdown
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.AppPort),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("[HTTP] API Server listening on port :%s (env: %s)", cfg.AppPort, cfg.AppEnv)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] Server HTTP error: %v", err)
		}
	}()

	// Wait for OS interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[SHUTDOWN] Shutting down MBG server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[SHUTDOWN] Server forced to shutdown: %v", err)
	}

	log.Println("[SHUTDOWN] Server exited cleanly.")
}
