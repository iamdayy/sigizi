package distribution

import (
	"context"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetDB() *gorm.DB

	// DistributionPoints
	CreateDistributionPoint(ctx context.Context, dp *models.DistributionPoint) error
	GetDistributionPointByID(ctx context.Context, id uuid.UUID) (*models.DistributionPoint, error)
	ListDistributionPoints(ctx context.Context, dpType string) ([]models.DistributionPoint, error)
	UpdateDistributionPoint(ctx context.Context, dp *models.DistributionPoint) error

	// Distributions
	CreateDistribution(ctx context.Context, tx *gorm.DB, dist *models.Distribution) error
	GetDistributionByID(ctx context.Context, id uuid.UUID) (*models.Distribution, error)
	ListDistributions(ctx context.Context, limit int) ([]models.Distribution, error)
	UpdateDistributionStatus(ctx context.Context, dist *models.Distribution) error
	GetDistributionsByDistributionPointAndPeriod(ctx context.Context, dpID uuid.UUID, startDate, endDate time.Time) ([]models.Distribution, error)

	// BAST Documents
	CreateBASTDocument(ctx context.Context, doc *models.BASTDocument) error
	ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error)
	GetBASTDocumentByID(ctx context.Context, id uuid.UUID) (*models.BASTDocument, error)

	// Tracking
	SaveDriverLocation(ctx context.Context, loc *models.DriverLocationLog) error
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

func (r *repository) CreateDistributionPoint(ctx context.Context, dp *models.DistributionPoint) error {
	return r.db.WithContext(ctx).Create(dp).Error
}

func (r *repository) GetDistributionPointByID(ctx context.Context, id uuid.UUID) (*models.DistributionPoint, error) {
	var dp models.DistributionPoint
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&dp).Error
	if err != nil {
		return nil, err
	}
	return &dp, nil
}

func (r *repository) ListDistributionPoints(ctx context.Context, dpType string) ([]models.DistributionPoint, error) {
	var points []models.DistributionPoint
	query := r.db.WithContext(ctx)
	if dpType != "" {
		query = query.Where("type = ?", dpType)
	}
	err := query.Order("name ASC").Find(&points).Error
	return points, err
}

func (r *repository) UpdateDistributionPoint(ctx context.Context, dp *models.DistributionPoint) error {
	return r.db.WithContext(ctx).Save(dp).Error
}

func (r *repository) CreateDistribution(ctx context.Context, tx *gorm.DB, dist *models.Distribution) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(dist).Error
}

func (r *repository) GetDistributionByID(ctx context.Context, id uuid.UUID) (*models.Distribution, error) {
	var dist models.Distribution
	err := r.db.WithContext(ctx).Preload("DistributionPoint").Preload("Items").Where("id = ?", id).First(&dist).Error
	if err != nil {
		return nil, err
	}
	return &dist, nil
}

func (r *repository) ListDistributions(ctx context.Context, limit int) ([]models.Distribution, error) {
	var dists []models.Distribution
	query := r.db.WithContext(ctx).Preload("DistributionPoint").Preload("Items").Order("delivery_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&dists).Error
	return dists, err
}

func (r *repository) UpdateDistributionStatus(ctx context.Context, dist *models.Distribution) error {
	return r.db.WithContext(ctx).Save(dist).Error
}

func (r *repository) GetDistributionsByDistributionPointAndPeriod(ctx context.Context, dpID uuid.UUID, startDate, endDate time.Time) ([]models.Distribution, error) {
	var dists []models.Distribution
	start := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	end := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	err := r.db.WithContext(ctx).
		Preload("Items").
		Where("distribution_point_id = ? AND delivery_date BETWEEN ? AND ?", dpID, start, end).
		Order("delivery_date ASC").
		Find(&dists).Error

	return dists, err
}

func (r *repository) CreateBASTDocument(ctx context.Context, doc *models.BASTDocument) error {
	return r.db.WithContext(ctx).Create(doc).Error
}

func (r *repository) ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error) {
	var docs []models.BASTDocument
	query := r.db.WithContext(ctx).Preload("DistributionPoint").Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&docs).Error
	return docs, err
}

func (r *repository) GetBASTDocumentByID(ctx context.Context, id uuid.UUID) (*models.BASTDocument, error) {
	var doc models.BASTDocument
	err := r.db.WithContext(ctx).Preload("DistributionPoint").Where("id = ?", id).First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *repository) SaveDriverLocation(ctx context.Context, loc *models.DriverLocationLog) error {
	return r.db.WithContext(ctx).Create(loc).Error
}
