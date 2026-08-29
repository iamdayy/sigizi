package qc

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type Service interface {
	// Hygiene
	CreateHygieneChecklist(ctx context.Context, req *CreateHygieneChecklistRequest, userID uuid.UUID) (*models.HygieneChecklist, error)
	ListHygieneChecklists(ctx context.Context, limit int) ([]models.HygieneChecklist, error)
	GetHygieneChecklist(ctx context.Context, id uuid.UUID) (*models.HygieneChecklist, error)

	// Temperature Logs
	CreateTemperatureLog(ctx context.Context, req *CreateTemperatureLogRequest, userID *uuid.UUID) (*models.TemperatureLog, error)
	ListTemperatureLogs(ctx context.Context, storageArea string, isAlertOnly bool, limit int) ([]models.TemperatureLog, error)

	// Organoleptic Tests
	CreateOrganolepticTest(ctx context.Context, req *CreateOrganolepticTestRequest, userID uuid.UUID) (*models.OrganolepticTest, error)
	ListOrganolepticTests(ctx context.Context, limit int) ([]models.OrganolepticTest, error)
	GetOrganolepticTest(ctx context.Context, id uuid.UUID) (*models.OrganolepticTest, error)

	// Food Samples
	CreateFoodSample(ctx context.Context, req *CreateFoodSampleRequest, userID uuid.UUID) (*models.FoodSample, error)
	ListFoodSamples(ctx context.Context, onlyActive bool, limit int) ([]models.FoodSample, error)
	DisposeFoodSample(ctx context.Context, id uuid.UUID, req *DisposeFoodSampleRequest, userID uuid.UUID) (*models.FoodSample, error)

	// Dashboard
	GetDashboardSummary(ctx context.Context) (*QCDashboardSummary, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateHygieneChecklist(ctx context.Context, req *CreateHygieneChecklistRequest, userID uuid.UUID) (*models.HygieneChecklist, error) {
	inspDate, err := time.Parse("2006-01-02", req.InspectionDate)
	if err != nil {
		return nil, fmt.Errorf("invalid inspection_date format: %w", err)
	}

	overallStatus := req.OverallStatus
	if overallStatus == "" {
		allPass := req.BuildingSanitation && req.WaterQuality && req.WasteManagement &&
			req.PestControl && req.PersonalHygiene && req.FoodStorageCheck && req.EquipmentClean
		if allPass {
			overallStatus = models.HygienePass
		} else {
			overallStatus = models.HygienePartial
		}
	}

	var corrDeadline *time.Time
	if req.CorrectionDeadline != "" {
		if d, err := time.Parse("2006-01-02", req.CorrectionDeadline); err == nil {
			corrDeadline = &d
		}
	}

	item := &models.HygieneChecklist{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		InspectionDate:     inspDate,
		InspectorID:        userID,
		OverallStatus:      overallStatus,
		BuildingSanitation: req.BuildingSanitation,
		WaterQuality:       req.WaterQuality,
		WasteManagement:    req.WasteManagement,
		PestControl:        req.PestControl,
		PersonalHygiene:    req.PersonalHygiene,
		FoodStorageCheck:   req.FoodStorageCheck,
		EquipmentClean:     req.EquipmentClean,
		Notes:              req.Notes,
		CorrectionDeadline: corrDeadline,
	}

	if err := s.repo.CreateHygieneChecklist(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to save hygiene checklist: %w", err)
	}

	return s.repo.GetHygieneChecklistByID(ctx, item.ID)
}

func (s *service) ListHygieneChecklists(ctx context.Context, limit int) ([]models.HygieneChecklist, error) {
	return s.repo.ListHygieneChecklists(ctx, limit)
}

func (s *service) GetHygieneChecklist(ctx context.Context, id uuid.UUID) (*models.HygieneChecklist, error) {
	return s.repo.GetHygieneChecklistByID(ctx, id)
}

func (s *service) CreateTemperatureLog(ctx context.Context, req *CreateTemperatureLogRequest, userID *uuid.UUID) (*models.TemperatureLog, error) {
	source := models.TempSourceManual
	if req.Source != nil {
		source = *req.Source
	}

	threshold := 4.0 // Default maximum standard for milk/meat chillers
	if req.AlertThreshold != nil {
		threshold = *req.AlertThreshold
	}

	isAlert := req.TemperatureCel > threshold

	item := &models.TemperatureLog{
		AuditModel: models.AuditModel{
			CreatedBy: userID,
		},
		StorageArea:     req.StorageArea,
		Source:          source,
		DeviceID:        req.DeviceID,
		RecordedAt:      time.Now(),
		TemperatureCel:  req.TemperatureCel,
		HumidityPercent: req.HumidityPercent,
		RecordedByID:    userID,
		IsAlert:         isAlert,
		AlertThreshold:  threshold,
		Notes:           req.Notes,
	}

	if err := s.repo.CreateTemperatureLog(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to save temperature log: %w", err)
	}

	return item, nil
}

func (s *service) ListTemperatureLogs(ctx context.Context, storageArea string, isAlertOnly bool, limit int) ([]models.TemperatureLog, error) {
	return s.repo.ListTemperatureLogs(ctx, storageArea, isAlertOnly, limit)
}

func (s *service) CreateOrganolepticTest(ctx context.Context, req *CreateOrganolepticTestRequest, userID uuid.UUID) (*models.OrganolepticTest, error) {
	testDate, err := time.Parse("2006-01-02", req.TestDate)
	if err != nil {
		return nil, fmt.Errorf("invalid test_date format: %w", err)
	}

	overallScore := float64(req.AppearanceScore+req.AromaScore+req.TasteScore+req.TextureScore) / 4.0
	isPassed := overallScore >= 3.0 &&
		req.AppearanceScore >= 2 &&
		req.AromaScore >= 2 &&
		req.TasteScore >= 2 &&
		req.TextureScore >= 2

	item := &models.OrganolepticTest{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		TestDate:          testDate,
		TestType:          req.TestType,
		ProductionBatchID: req.ProductionBatchID,
		MealName:          req.MealName,
		TesterID:          userID,
		AppearanceScore:   req.AppearanceScore,
		AromaScore:        req.AromaScore,
		TasteScore:        req.TasteScore,
		TextureScore:      req.TextureScore,
		OverallScore:      overallScore,
		IsPassed:          isPassed,
		Notes:             req.Notes,
		PhotoURL:          req.PhotoURL,
	}

	if err := s.repo.CreateOrganolepticTest(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to save organoleptic test: %w", err)
	}

	return s.repo.GetOrganolepticTestByID(ctx, item.ID)
}

func (s *service) ListOrganolepticTests(ctx context.Context, limit int) ([]models.OrganolepticTest, error) {
	return s.repo.ListOrganolepticTests(ctx, limit)
}

func (s *service) GetOrganolepticTest(ctx context.Context, id uuid.UUID) (*models.OrganolepticTest, error) {
	return s.repo.GetOrganolepticTestByID(ctx, id)
}

func (s *service) CreateFoodSample(ctx context.Context, req *CreateFoodSampleRequest, userID uuid.UUID) (*models.FoodSample, error) {
	sampleDate, err := time.Parse("2006-01-02", req.SampleDate)
	if err != nil {
		return nil, fmt.Errorf("invalid sample_date format: %w", err)
	}

	// Retention is 3 days (72 hours) according to BGN guidelines
	retentionUntil := sampleDate.AddDate(0, 0, 3)

	item := &models.FoodSample{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		SampleDate:        sampleDate,
		MealName:          req.MealName,
		ProductionBatchID: req.ProductionBatchID,
		StorageLocation:   req.StorageLocation,
		RetentionUntil:    retentionUntil,
		CollectedByID:     userID,
		Notes:             req.Notes,
	}

	if err := s.repo.CreateFoodSample(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to save food sample: %w", err)
	}

	return s.repo.GetFoodSampleByID(ctx, item.ID)
}

func (s *service) ListFoodSamples(ctx context.Context, onlyActive bool, limit int) ([]models.FoodSample, error) {
	return s.repo.ListFoodSamples(ctx, onlyActive, limit)
}

func (s *service) DisposeFoodSample(ctx context.Context, id uuid.UUID, req *DisposeFoodSampleRequest, userID uuid.UUID) (*models.FoodSample, error) {
	item, err := s.repo.GetFoodSampleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("food sample not found: %w", err)
	}

	now := time.Now()
	item.DisposedAt = &now
	if req.Notes != "" {
		if item.Notes != "" {
			item.Notes += " | Pembuangan: " + req.Notes
		} else {
			item.Notes = "Pembuangan: " + req.Notes
		}
	}
	item.UpdatedBy = &userID

	if err := s.repo.UpdateFoodSample(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to update food sample disposal: %w", err)
	}

	return item, nil
}

func (s *service) GetDashboardSummary(ctx context.Context) (*QCDashboardSummary, error) {
	hygieneList, _ := s.repo.ListHygieneChecklists(ctx, 100)
	tempLogs, _ := s.repo.ListTemperatureLogs(ctx, "", false, 10)
	alertLogs, _ := s.repo.ListTemperatureLogs(ctx, "", true, 100)
	orgTests, _ := s.repo.ListOrganolepticTests(ctx, 10)
	activeSamples, _ := s.repo.ListFoodSamples(ctx, true, 50)

	var avgScore float64
	if len(orgTests) > 0 {
		var total float64
		for _, ot := range orgTests {
			total += ot.OverallScore
		}
		avgScore = total / float64(len(orgTests))
	}

	now := time.Now()
	var pendingDisposal []models.FoodSample
	for _, sample := range activeSamples {
		if sample.RetentionUntil.Before(now) {
			pendingDisposal = append(pendingDisposal, sample)
		}
	}

	return &QCDashboardSummary{
		TotalInspectionsThisMonth: len(hygieneList),
		ActiveTempAlertsCount:     len(alertLogs),
		AverageOrganolepticScore:  avgScore,
		ActiveRetainedSamples:     len(activeSamples),
		RecentTempLogs:            tempLogs,
		RecentOrganolepticTests:   orgTests,
		PendingDisposalSamples:    pendingDisposal,
	}, nil
}
