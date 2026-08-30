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

	"github.com/daydev/mbg-system/backend/internal/app"
)

func main() {
	log.Println("=================================================================")
	log.Println("  Makan Bergizi Gratis (MBG) - SPPG Operational Management System")
	log.Println("  Production Backend Service v2.0.0 (Go/Gin/PostgreSQL)")
	log.Println("=================================================================")

	// Setup application container for local/persistent execution (isServerless = false)
	container := app.SetupApp(false)

	// Start Background Cron Scheduler
	if container.CronScheduler != nil {
		container.CronScheduler.Start()
		defer container.CronScheduler.Stop()
	}

	// Graceful Server Startup & Shutdown
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", container.Config.AppPort),
		Handler:      container.Router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("[HTTP] API Server listening on port :%s (env: %s)", container.Config.AppPort, container.Config.AppEnv)
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
