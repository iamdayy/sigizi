package distribution

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/storage"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// Schools
	CreateSchool(ctx context.Context, req *CreateSchoolRequest, userID uuid.UUID) (*models.School, error)
	ListSchools(ctx context.Context) ([]models.School, error)
	GetSchool(ctx context.Context, id uuid.UUID) (*models.School, error)

	// Distributions
	CreateDistribution(ctx context.Context, req *CreateDistributionRequest, userID uuid.UUID) (*models.Distribution, error)
	ListDistributions(ctx context.Context, limit int) ([]models.Distribution, error)
	UpdateDistributionStatus(ctx context.Context, id uuid.UUID, req *UpdateDistributionStatusRequest, userID uuid.UUID) (*models.Distribution, error)

	// BAST Document Generator
	PreviewBAST(ctx context.Context, schoolID uuid.UUID, periodStartStr, periodEndStr string) (*BASTPreviewData, error)
	GenerateBAST(ctx context.Context, req *BASTGenerateRequest, userID uuid.UUID) (*BASTDocumentResponse, error)
	ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error)
}

type service struct {
	repo         Repository
	storageSvc   storage.StorageService
	pdfGenerator *BASTPDFGenerator
}

func NewService(repo Repository, storageSvc storage.StorageService) Service {
	return &service{
		repo:         repo,
		storageSvc:   storageSvc,
		pdfGenerator: NewBASTPDFGenerator(),
	}
}

func (s *service) CreateSchool(ctx context.Context, req *CreateSchoolRequest, userID uuid.UUID) (*models.School, error) {
	school := &models.School{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		NPSN:          req.NPSN,
		Name:          req.Name,
		Address:       req.Address,
		District:      req.District,
		City:          req.City,
		ContactPerson: req.ContactPerson,
		PhoneNumber:   req.PhoneNumber,
		TotalStudents: req.TotalStudents,
		DietaryNotes:  req.DietaryNotes,
		IsActive:      true,
	}

	if err := s.repo.CreateSchool(ctx, school); err != nil {
		return nil, fmt.Errorf("failed to register school: %w", err)
	}
	return school, nil
}

func (s *service) ListSchools(ctx context.Context) ([]models.School, error) {
	return s.repo.ListSchools(ctx)
}

func (s *service) GetSchool(ctx context.Context, id uuid.UUID) (*models.School, error) {
	return s.repo.GetSchoolByID(ctx, id)
}

func (s *service) CreateDistribution(ctx context.Context, req *CreateDistributionRequest, userID uuid.UUID) (*models.Distribution, error) {
	deliveryDate, err := time.Parse("2006-01-02", req.DeliveryDate)
	if err != nil {
		return nil, fmt.Errorf("invalid delivery_date format: %w", err)
	}

	var totalPortions int
	var totalValue float64
	items := make([]models.DistributionItem, len(req.Items))

	for i, itemReq := range req.Items {
		unitPrice := itemReq.UnitPrice
		if unitPrice <= 0 {
			unitPrice = 15000.00 // standard MBG government unit price
		}
		subtotal := float64(itemReq.PortionsSent) * unitPrice
		totalPortions += itemReq.PortionsSent
		totalValue += subtotal

		items[i] = models.DistributionItem{
			AuditModel: models.AuditModel{
				CreatedBy: &userID,
			},
			MealName:         itemReq.MealName,
			PortionsSent:     itemReq.PortionsSent,
			PortionsReceived: itemReq.PortionsSent,
			UnitPrice:        unitPrice,
			Subtotal:         subtotal,
		}
	}

	deliveryNumber := fmt.Sprintf("SJ-MBG-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:6])

	dist := &models.Distribution{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		DeliveryNumber: deliveryNumber,
		SchoolID:       req.SchoolID,
		DeliveryDate:   deliveryDate,
		Status:         models.DistStatusScheduled,
		DriverName:     req.DriverName,
		VehiclePlate:   req.VehiclePlate,
		TotalPortions:  totalPortions,
		TotalValue:     totalValue,
		Notes:          req.Notes,
		Items:          items,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return s.repo.CreateDistribution(ctx, tx, dist)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to schedule distribution: %w", err)
	}

	return s.repo.GetDistributionByID(ctx, dist.ID)
}

func (s *service) ListDistributions(ctx context.Context, limit int) ([]models.Distribution, error) {
	return s.repo.ListDistributions(ctx, limit)
}

func (s *service) UpdateDistributionStatus(ctx context.Context, id uuid.UUID, req *UpdateDistributionStatusRequest, userID uuid.UUID) (*models.Distribution, error) {
	dist, err := s.repo.GetDistributionByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("distribution not found: %w", err)
	}

	dist.Status = req.Status
	dist.UpdatedBy = &userID
	if req.RecipientName != "" {
		dist.RecipientName = req.RecipientName
	}
	if req.RecipientTitle != "" {
		dist.RecipientTitle = req.RecipientTitle
	}
	if req.ProofOfDeliveryURL != "" {
		dist.ProofOfDeliveryURL = req.ProofOfDeliveryURL
	}
	if req.Notes != "" {
		dist.Notes = req.Notes
	}

	if req.Status == models.DistStatusDelivered {
		now := time.Now()
		dist.ReceivedAt = &now
		if req.PortionsReceived > 0 && len(dist.Items) > 0 {
			dist.Items[0].PortionsReceived = req.PortionsReceived
		}
	}

	if err := s.repo.UpdateDistributionStatus(ctx, dist); err != nil {
		return nil, fmt.Errorf("failed to update distribution status: %w", err)
	}

	return dist, nil
}

func (s *service) PreviewBAST(ctx context.Context, schoolID uuid.UUID, periodStartStr, periodEndStr string) (*BASTPreviewData, error) {
	school, err := s.repo.GetSchoolByID(ctx, schoolID)
	if err != nil {
		return nil, fmt.Errorf("school not found: %w", err)
	}

	start, err := time.Parse("2006-01-02", periodStartStr)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start format: %w", err)
	}

	end, err := time.Parse("2006-01-02", periodEndStr)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end format: %w", err)
	}

	deliveries, err := s.repo.GetDistributionsBySchoolAndPeriod(ctx, schoolID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch distributions: %w", err)
	}

	var totalPortions int
	var totalAmount float64
	for _, d := range deliveries {
		totalPortions += d.TotalPortions
		totalAmount += d.TotalValue
	}

	return &BASTPreviewData{
		School:          school,
		PeriodStart:     periodStartStr,
		PeriodEnd:       periodEndStr,
		TotalDeliveries: len(deliveries),
		TotalPortions:   totalPortions,
		TotalAmount:     totalAmount,
		Deliveries:      deliveries,
	}, nil
}

func (s *service) GenerateBAST(ctx context.Context, req *BASTGenerateRequest, userID uuid.UUID) (*BASTDocumentResponse, error) {
	preview, err := s.PreviewBAST(ctx, req.SchoolID, req.PeriodStart, req.PeriodEnd)
	if err != nil {
		return nil, err
	}

	if preview.TotalDeliveries == 0 {
		return nil, fmt.Errorf("no deliveries found for school '%s' in period %s to %s", preview.School.Name, req.PeriodStart, req.PeriodEnd)
	}

	sppgHead := req.SPPGHeadName
	if sppgHead == "" {
		sppgHead = "Dr. Siti Nurhaliza (Kepala SPPG)"
	}

	principal := req.SchoolPrincipalName
	if principal == "" {
		principal = preview.School.ContactPerson
	}

	docNumber := fmt.Sprintf("BAST/MBG-SPPG/%s/%s", time.Now().Format("2006/01"), uuid.New().String()[:6])

	start, _ := time.Parse("2006-01-02", req.PeriodStart)
	end, _ := time.Parse("2006-01-02", req.PeriodEnd)

	// Generate PDF
	pdfBytes, err := s.pdfGenerator.GenerateBAST(
		docNumber,
		preview.School,
		start, end,
		preview.Deliveries,
		preview.TotalPortions,
		preview.TotalAmount,
		sppgHead, principal,
	)

	if err != nil {
		// Fallback to simple PDF if maroto layout engine hits edge cases
		pdfBytes = GenerateSimpleBASTBytes(docNumber, preview.School, start, end, preview.TotalPortions, preview.TotalAmount, sppgHead, principal)
	}

	// Upload to R2 / Local Disk Storage
	filename := fmt.Sprintf("bast/BAST_%s_%s.pdf", preview.School.NPSN, time.Now().Format("20060102_150405"))
	fileURL, err := s.storageSvc.UploadFile(ctx, filename, pdfBytes, "application/pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to upload BAST PDF to storage: %w", err)
	}

	now := time.Now()
	bastDoc := &models.BASTDocument{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		DocumentNumber:      docNumber,
		SchoolID:            req.SchoolID,
		PeriodStart:         start,
		PeriodEnd:           end,
		TotalPortions:       preview.TotalPortions,
		TotalAmount:         preview.TotalAmount,
		FileURL:             fileURL,
		FileSizeBytes:       int64(len(pdfBytes)),
		GeneratedAt:         now,
		SPPGHeadName:        sppgHead,
		SchoolPrincipalName: principal,
		Status:              models.BASTStatusGenerated,
	}

	if err := s.repo.CreateBASTDocument(ctx, bastDoc); err != nil {
		return nil, fmt.Errorf("failed to save BAST document record: %w", err)
	}

	return &BASTDocumentResponse{
		ID:                  bastDoc.ID,
		DocumentNumber:      bastDoc.DocumentNumber,
		SchoolID:            bastDoc.SchoolID,
		SchoolName:          preview.School.Name,
		PeriodStart:         req.PeriodStart,
		PeriodEnd:           req.PeriodEnd,
		TotalPortions:       bastDoc.TotalPortions,
		TotalAmount:         bastDoc.TotalAmount,
		FileURL:             bastDoc.FileURL,
		FileSizeBytes:       bastDoc.FileSizeBytes,
		GeneratedAt:         bastDoc.GeneratedAt,
		SPPGHeadName:        bastDoc.SPPGHeadName,
		SchoolPrincipalName: bastDoc.SchoolPrincipalName,
		Status:              bastDoc.Status,
	}, nil
}

func (s *service) ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error) {
	return s.repo.ListBASTDocuments(ctx, limit)
}
