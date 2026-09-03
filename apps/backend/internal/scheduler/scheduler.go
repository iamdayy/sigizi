package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/modules/finance"
	"github.com/daydev/mbg-system/backend/internal/modules/reporting"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

type CronScheduler struct {
	cron       *cron.Cron
	db         *gorm.DB
	financeSvc finance.Service
	sipgnSvc   reporting.SIPGNClient
	timezone   string
}

func NewCronScheduler(cfg *config.Config, db *gorm.DB, financeSvc finance.Service, sipgnSvc reporting.SIPGNClient) *CronScheduler {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		log.Printf("[SCHEDULER] Warning: Failed to load timezone '%s': %v. Defaulting to Asia/Jakarta (+07:00)", cfg.Timezone, err)
		loc = time.FixedZone("Asia/Jakarta", 7*3600)
	}

	c := cron.New(cron.WithLocation(loc))
	return &CronScheduler{
		cron:       c,
		db:         db,
		financeSvc: financeSvc,
		sipgnSvc:   sipgnSvc,
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

	// Schedule SIPGN Sync at 02:00 WIB
	_, err = s.cron.AddFunc("0 2 * * *", func() {
		log.Println("[SCHEDULER] Triggering SIPGN Sync for Daily Report and BAST (02:00 WIB)...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		payload := reporting.DailyReportPayload{
			ReportNumber:  "SYNC-" + time.Now().Format("20060102"),
			PeriodStart:   time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			PeriodEnd:     time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			TotalPortions: 0,
			TotalAmount:   0,
			FileURL:       "https://example.com/report.pdf",
		}
		
		if s.sipgnSvc != nil {
			err := s.sipgnSvc.SendDailyReport(ctx, payload)
			if err != nil {
				log.Printf("[SCHEDULER] ERROR: SIPGN Sync failed: %v", err)
			} else {
				log.Println("[SCHEDULER] SIPGN Sync completed successfully.")
			}
		}
	})

	if err != nil {
		log.Fatalf("[SCHEDULER] Failed to register SIPGN sync job: %v", err)
	}

	// Schedule Holiday Sync at 00:30 WIB
	_, err = s.cron.AddFunc("30 0 * * *", func() {
		log.Println("[SCHEDULER] Triggering Holiday Sync (00:30 WIB)...")
		
		// In a real system, you would check against a holiday calendar API.
		// For now, we simulate a condition. Let's say if tomorrow is Sunday.
		tomorrow := time.Now().Add(24 * time.Hour)
		isHoliday := tomorrow.Weekday() == time.Sunday

		if isHoliday {
			log.Println("[SCHEDULER] Tomorrow is a holiday. Converting scheduled SCHOOL distributions to TOTEBAG...")
			
			// Find distributions scheduled for tomorrow that are for SCHOOLs
			result := s.db.Model(&models.Distribution{}).
				Joins("JOIN distribution_points ON distribution_points.id = distributions.distribution_point_id").
				Where("DATE(distributions.delivery_date) = ? AND distributions.status = ? AND distribution_points.type = ?", 
					tomorrow.Format("2006-01-02"), models.DistStatusScheduled, models.DPTypeSchool).
				Updates(map[string]interface{}{
					"package_type":        models.PackageTotebag,
					"is_holiday_delivery": true,
				})

			if result.Error != nil {
				log.Printf("[SCHEDULER] ERROR: Failed to update holiday distributions: %v", result.Error)
			} else if result.RowsAffected > 0 {
				log.Printf("[SCHEDULER] Successfully updated %d school distributions to TOTEBAG for holiday.", result.RowsAffected)
			} else {
				log.Println("[SCHEDULER] No school distributions found for tomorrow.")
			}
		} else {
			log.Println("[SCHEDULER] Tomorrow is a regular school day.")
		}
	})

	if err != nil {
		log.Fatalf("[SCHEDULER] Failed to register holiday sync job: %v", err)
	}

	// Schedule Food Sample Retention Check at 06:00 WIB
	_, err = s.cron.AddFunc("0 6 * * *", func() {
		log.Println("[SCHEDULER] Triggering Food Sample Retention Check (06:00 WIB)...")
		
		var expiredSamples []models.FoodSample
		err := s.db.Where("retention_until <= ? AND disposed_at IS NULL", time.Now()).Find(&expiredSamples).Error
		
		if err != nil {
			log.Printf("[SCHEDULER] ERROR: Failed to query food samples: %v", err)
			return
		}

		if len(expiredSamples) > 0 {
			log.Printf("[SCHEDULER] 🚨 QC ALERT: Found %d food samples that have exceeded the 3x24h retention period and MUST be disposed!", len(expiredSamples))
			for _, s := range expiredSamples {
				log.Printf("[SCHEDULER] - Sample: %s (Stored: %s, Expired: %s)", s.MealName, s.StorageLocation, s.RetentionUntil.Format("2006-01-02"))
			}
			// In a real system, you might send an email or push notification to the QC team here.
		} else {
			log.Println("[SCHEDULER] All food samples are within retention period. No pending disposals.")
		}
	})

	if err != nil {
		log.Fatalf("[SCHEDULER] Failed to register food sample retention check job: %v", err)
	}

	s.cron.Start()
	log.Println("[SCHEDULER] Background Cron Scheduler started successfully.")
}

func (s *CronScheduler) Stop() {
	log.Println("[SCHEDULER] Stopping Cron Scheduler...")
	s.cron.Stop()
}
