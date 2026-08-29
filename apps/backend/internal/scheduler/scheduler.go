package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/modules/finance"
	"github.com/robfig/cron/v3"
)

type CronScheduler struct {
	cron       *cron.Cron
	financeSvc finance.Service
	timezone   string
}

func NewCronScheduler(cfg *config.Config, financeSvc finance.Service) *CronScheduler {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		log.Printf("[SCHEDULER] Warning: Failed to load timezone '%s': %v. Defaulting to Asia/Jakarta (+07:00)", cfg.Timezone, err)
		loc = time.FixedZone("Asia/Jakarta", 7*3600)
	}

	c := cron.New(cron.WithLocation(loc))
	return &CronScheduler{
		cron:       c,
		financeSvc: financeSvc,
		timezone:   cfg.Timezone,
	}
}

func (s *CronScheduler) Start() {
	log.Printf("[SCHEDULER] Initializing Cron Jobs in Timezone: %s", s.timezone)

	// Schedule Daily Financial Reconciliation at 23:59 WIB
	// Format: "59 23 * * *" -> Every day at 23:59
	_, err := s.cron.AddFunc("59 23 * * *", func() {
		log.Println("[SCHEDULER] Triggering Automated Daily Financial Reconciliation (23:59 WIB)...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		today := time.Now()
		report, err := s.financeSvc.PerformDailyReconciliation(ctx, today, nil)
		if err != nil {
			log.Printf("[SCHEDULER] ERROR: Daily reconciliation failed: %v", err)
			return
		}
		log.Printf("[SCHEDULER] Daily reconciliation completed: status=%s, total_cost=Rp %.2f", report.Status, report.TotalStockOutCost)
	})

	if err != nil {
		log.Fatalf("[SCHEDULER] Failed to register daily reconciliation job: %v", err)
	}

	s.cron.Start()
	log.Println("[SCHEDULER] Background Cron Scheduler started successfully. Daily reconciliation active at 23:59 WIB.")
}

func (s *CronScheduler) Stop() {
	log.Println("[SCHEDULER] Stopping Cron Scheduler...")
	s.cron.Stop()
}
