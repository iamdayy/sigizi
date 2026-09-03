package app

import (
	"log"
	"net/http"
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

// AppContainer holds the initialized dependencies
type AppContainer struct {
	Router        *gin.Engine
	CronScheduler *scheduler.CronScheduler
	Config        *config.Config
}

// SetupApp initializes all dependencies and returns the application container.
// It is designed to be called once per instance (or cold start in serverless).
func SetupApp(isServerless bool) *AppContainer {
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
	repHandler := reporting.NewHandler(repSvc, cfg.BankWebhookSecret)

	// 5. Setup HTTP Engine & Middlewares
	if cfg.AppEnv == "production" || isServerless {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.TraceID())
	router.Use(middleware.CORS(cfg.AllowedOrigins)) // Ensure CORS is correctly configured for Vercel

	// Rate Limiter: 100 requests/sec with burst of 200 per IP
	// For serverless, this will only rate limit per instance, which is fine.
	rateLimiter := middleware.NewRateLimiter(100.0, 200.0)
	router.Use(rateLimiter.Middleware())

	// Static route for local uploads fallback (may not work in serverless without S3)
	if !isServerless {
		router.Static("/uploads", cfg.LocalStoragePath)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		pkg.Success(c, http.StatusOK, "MBG SPPG System is healthy", gin.H{
			"status":      "UP",
			"timestamp":   time.Now().Format(time.RFC3339),
			"version":     "2.0.0",
			"serverless":  isServerless,
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

	container := &AppContainer{
		Router: router,
		Config: cfg,
	}

	// 8. Setup Background Cron Scheduler
	// Only instantiate if not in serverless mode (Vercel will use Vercel Cron instead)
	if !isServerless {
		sipgnSvc := reporting.NewSIPGNClient()
		container.CronScheduler = scheduler.NewCronScheduler(cfg, db.DB, finSvc, sipgnSvc)
		
		// Setup and start IoT Listener for QC Module
		iotListener := qc.NewIoTListener(qcSvc)
		iotListener.Start()
		// In a real application, you might want to add iotListener.Stop() to the shutdown sequence in main.go
	}

	return container
}
