package qc

import (
	"context"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetDB() *gorm.DB

	// Hygiene
	CreateHygieneChecklist(ctx context.Context, item *models.HygieneChecklist) error
	ListHygieneChecklists(ctx context.Context, limit int) ([]models.HygieneChecklist, error)
	ListHygieneChecklistsInPeriod(ctx context.Context, start time.Time, end time.Time) ([]models.HygieneChecklist, error)
	GetHygieneChecklistByID(ctx context.Context, id uuid.UUID) (*models.HygieneChecklist, error)

	// Temperature Logs
	CreateTemperatureLog(ctx context.Context, item *models.TemperatureLog) error
	ListTemperatureLogs(ctx context.Context, storageArea string, isAlertOnly bool, limit int) ([]models.TemperatureLog, error)

	// Organoleptic Tests
	CreateOrganolepticTest(ctx context.Context, item *models.OrganolepticTest) error
	ListOrganolepticTests(ctx context.Context, limit int) ([]models.OrganolepticTest, error)
	GetOrganolepticTestByID(ctx context.Context, id uuid.UUID) (*models.OrganolepticTest, error)

	// Food Samples
	CreateFoodSample(ctx context.Context, item *models.FoodSample) error
	ListFoodSamples(ctx context.Context, onlyActive bool, limit int) ([]models.FoodSample, error)
	GetFoodSampleByID(ctx context.Context, id uuid.UUID) (*models.FoodSample, error)
	UpdateFoodSample(ctx context.Context, item *models.FoodSample) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetDB() *gorm.DB {
	return r.db
}

func (r *repository) CreateHygieneChecklist(ctx context.Context, item *models.HygieneChecklist) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) ListHygieneChecklists(ctx context.Context, limit int) ([]models.HygieneChecklist, error) {
	var list []models.HygieneChecklist
	query := r.db.WithContext(ctx).Preload("Inspector").Order("inspection_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) ListHygieneChecklistsInPeriod(ctx context.Context, start time.Time, end time.Time) ([]models.HygieneChecklist, error) {
	var list []models.HygieneChecklist
	err := r.db.WithContext(ctx).
		Preload("Inspector").
		Where("inspection_date BETWEEN ? AND ?", start, end).
		Order("inspection_date DESC, created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *repository) GetHygieneChecklistByID(ctx context.Context, id uuid.UUID) (*models.HygieneChecklist, error) {
	var item models.HygieneChecklist
	err := r.db.WithContext(ctx).Preload("Inspector").Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) CreateTemperatureLog(ctx context.Context, item *models.TemperatureLog) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) ListTemperatureLogs(ctx context.Context, storageArea string, isAlertOnly bool, limit int) ([]models.TemperatureLog, error) {
	var list []models.TemperatureLog
	query := r.db.WithContext(ctx).Preload("RecordedBy")
	if storageArea != "" {
		query = query.Where("storage_area = ?", storageArea)
	}
	if isAlertOnly {
		query = query.Where("is_alert = true")
	}
	query = query.Order("recorded_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) CreateOrganolepticTest(ctx context.Context, item *models.OrganolepticTest) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) ListOrganolepticTests(ctx context.Context, limit int) ([]models.OrganolepticTest, error) {
	var list []models.OrganolepticTest
	query := r.db.WithContext(ctx).Preload("Tester").Order("test_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) GetOrganolepticTestByID(ctx context.Context, id uuid.UUID) (*models.OrganolepticTest, error) {
	var item models.OrganolepticTest
	err := r.db.WithContext(ctx).Preload("Tester").Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) CreateFoodSample(ctx context.Context, item *models.FoodSample) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) ListFoodSamples(ctx context.Context, onlyActive bool, limit int) ([]models.FoodSample, error) {
	var list []models.FoodSample
	query := r.db.WithContext(ctx).Preload("CollectedBy")
	if onlyActive {
		query = query.Where("disposed_at IS NULL")
	}
	query = query.Order("sample_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) GetFoodSampleByID(ctx context.Context, id uuid.UUID) (*models.FoodSample, error) {
	var item models.FoodSample
	err := r.db.WithContext(ctx).Preload("CollectedBy").Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) UpdateFoodSample(ctx context.Context, item *models.FoodSample) error {
	return r.db.WithContext(ctx).Save(item).Error
}
