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
	// DistributionPoints
	CreateDistributionPoint(ctx context.Context, req *CreateDistributionPointRequest, userID uuid.UUID) (*models.DistributionPoint, error)
	ListDistributionPoints(ctx context.Context, dpType string) ([]models.DistributionPoint, error)
	GetDistributionPoint(ctx context.Context, id uuid.UUID) (*models.DistributionPoint, error)
	UpdateDistributionPoint(ctx context.Context, id uuid.UUID, req *UpdateDistributionPointRequest, userID uuid.UUID) (*models.DistributionPoint, error)

	// Distributions
	CreateDistribution(ctx context.Context, req *CreateDistributionRequest, userID uuid.UUID) (*models.Distribution, error)
	ListDistributions(ctx context.Context, limit int) ([]models.Distribution, error)
	GetDistribution(ctx context.Context, id uuid.UUID) (*models.Distribution, error)
	UpdateDistributionStatus(ctx context.Context, id uuid.UUID, req *UpdateDistributionStatusRequest, userID uuid.UUID) (*models.Distribution, error)

	// BAST Document Generator
	PreviewBAST(ctx context.Context, dpID uuid.UUID, periodStartStr, periodEndStr string) (*BASTPreviewData, error)
	GenerateBAST(ctx context.Context, req *BASTGenerateRequest, userID uuid.UUID) (*BASTDocumentResponse, error)
	ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error)

	// Tracking
	RecordDriverLocation(ctx context.Context, distributionID uuid.UUID, req *DriverLocationRequest, userID uuid.UUID) error
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

func (s *service) CreateDistributionPoint(ctx context.Context, req *CreateDistributionPointRequest, userID uuid.UUID) (*models.DistributionPoint, error) {
	dp := &models.DistributionPoint{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		NPSN:            req.NPSN,
		Name:            req.Name,
		Type:            req.Type,
		EducationLevel:  req.EducationLevel,
		Address:         req.Address,
		District:        req.District,
		City:            req.City,
		ContactPerson:   req.ContactPerson,
		PhoneNumber:     req.PhoneNumber,
		TotalRecipients: req.TotalRecipients,
		DietaryNotes:    req.DietaryNotes,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		IsActive:        true,
	}

	if err := s.repo.CreateDistributionPoint(ctx, dp); err != nil {
		return nil, fmt.Errorf("failed to register distribution point: %w", err)
	}
	return dp, nil
}

func (s *service) ListDistributionPoints(ctx context.Context, dpType string) ([]models.DistributionPoint, error) {
	return s.repo.ListDistributionPoints(ctx, dpType)
}

func (s *service) GetDistributionPoint(ctx context.Context, id uuid.UUID) (*models.DistributionPoint, error) {
	return s.repo.GetDistributionPointByID(ctx, id)
}

func (s *service) UpdateDistributionPoint(ctx context.Context, id uuid.UUID, req *UpdateDistributionPointRequest, userID uuid.UUID) (*models.DistributionPoint, error) {
	dp, err := s.repo.GetDistributionPointByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("distribution point not found: %w", err)
	}

	if req.Name != "" {
		dp.Name = req.Name
	}
	if req.Type != "" {
		dp.Type = req.Type
	}
	if req.EducationLevel != nil {
		dp.EducationLevel = req.EducationLevel
	}
	if req.Address != "" {
		dp.Address = req.Address
	}
	if req.District != "" {
		dp.District = req.District
	}
	if req.City != "" {
		dp.City = req.City
	}
	if req.ContactPerson != "" {
		dp.ContactPerson = req.ContactPerson
	}
	if req.PhoneNumber != "" {
		dp.PhoneNumber = req.PhoneNumber
	}
	if req.TotalRecipients > 0 {
		dp.TotalRecipients = req.TotalRecipients
	}
	if req.DietaryNotes != "" {
		dp.DietaryNotes = req.DietaryNotes
	}
	if req.Latitude != nil {
		dp.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		dp.Longitude = req.Longitude
	}
	if req.IsActive != nil {
		dp.IsActive = *req.IsActive
	}

	dp.UpdatedBy = &userID

	if err := s.repo.UpdateDistributionPoint(ctx, dp); err != nil {
		return nil, fmt.Errorf("failed to update distribution point: %w", err)
	}

	return dp, nil
}

func (s *service) CreateDistribution(ctx context.Context, req *CreateDistributionRequest, userID uuid.UUID) (*models.Distribution, error) {
	deliveryDate, err := time.Parse("2006-01-02", req.DeliveryDate)
	if err != nil {
		return nil, fmt.Errorf("invalid delivery_date format: %w", err)
	}

	packageType := req.PackageType
	if packageType == "" {
		packageType = models.PackageFoodTray
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
			MenuItemID:       itemReq.MenuItemID,
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
		DeliveryNumber:      deliveryNumber,
		DistributionPointID: req.DistributionPointID,
		DeliveryDate:        deliveryDate,
		Status:              models.DistStatusScheduled,
		PackageType:         packageType,
		IsHolidayDelivery:   req.IsHolidayDelivery,
		DriverName:          req.DriverName,
		VehiclePlate:        req.VehiclePlate,
		TotalPortions:       totalPortions,
		TotalValue:          totalValue,
		Notes:               req.Notes,
		Items:               items,
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

func (s *service) GetDistribution(ctx context.Context, id uuid.UUID) (*models.Distribution, error) {
	return s.repo.GetDistributionByID(ctx, id)
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
		if len(req.Items) > 0 {
			var totalReceived int
			for _, itemInput := range req.Items {
				found := false
				for i, existingItem := range dist.Items {
					if existingItem.ID == itemInput.ItemID {
						dist.Items[i].PortionsReceived = itemInput.PortionsReceived
						totalReceived += itemInput.PortionsReceived
						found = true
						break
					}
				}
				if !found {
					return nil, fmt.Errorf("item_id %s not found in this distribution", itemInput.ItemID)
				}
			}
			dist.TotalPortions = totalReceived
		} else {
			// If no specific item received data provided, we could assume they received all sent.
			// But for strictness, we just keep the existing default if nothing provided.
		}
	}

	if err := s.repo.UpdateDistributionStatus(ctx, dist); err != nil {
		return nil, fmt.Errorf("failed to update distribution status: %w", err)
	}

	return dist, nil
}

func (s *service) PreviewBAST(ctx context.Context, dpID uuid.UUID, periodStartStr, periodEndStr string) (*BASTPreviewData, error) {
	dp, err := s.repo.GetDistributionPointByID(ctx, dpID)
	if err != nil {
		return nil, fmt.Errorf("distribution point not found: %w", err)
	}

	start, err := time.Parse("2006-01-02", periodStartStr)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start format: %w", err)
	}

	end, err := time.Parse("2006-01-02", periodEndStr)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end format: %w", err)
	}

	deliveries, err := s.repo.GetDistributionsByDistributionPointAndPeriod(ctx, dpID, start, end)
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
		DistributionPoint: dp,
		PeriodStart:       periodStartStr,
		PeriodEnd:         periodEndStr,
		TotalDeliveries:   len(deliveries),
		TotalPortions:     totalPortions,
		TotalAmount:       totalAmount,
		Deliveries:        deliveries,
	}, nil
}

func (s *service) GenerateBAST(ctx context.Context, req *BASTGenerateRequest, userID uuid.UUID) (*BASTDocumentResponse, error) {
	preview, err := s.PreviewBAST(ctx, req.DistributionPointID, req.PeriodStart, req.PeriodEnd)
	if err != nil {
		return nil, err
	}

	if preview.TotalDeliveries == 0 {
		return nil, fmt.Errorf("no deliveries found for '%s' in period %s to %s", preview.DistributionPoint.Name, req.PeriodStart, req.PeriodEnd)
	}

	sppgHead := req.SPPGHeadName
	if sppgHead == "" {
		var user models.User
		if err := s.repo.GetDB().WithContext(ctx).Where("role = ? AND is_active = ?", models.RoleHeadSPPG, true).First(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to find active HEAD_SPPG for default head name: %w", err)
		}
		sppgHead = user.FullName
	}

	repName := req.RecipientRepresentativeName
	if repName == "" {
		repName = preview.DistributionPoint.ContactPerson
	}

	docNumber := fmt.Sprintf("BAST/MBG-SPPG/%s/%s", time.Now().Format("2006/01"), uuid.New().String()[:6])

	start, _ := time.Parse("2006-01-02", req.PeriodStart)
	end, _ := time.Parse("2006-01-02", req.PeriodEnd)

	// Generate PDF
	pdfBytes, err := s.pdfGenerator.GenerateBAST(
		docNumber,
		preview.DistributionPoint,
		start, end,
		preview.Deliveries,
		preview.TotalPortions,
		preview.TotalAmount,
		sppgHead, repName,
	)

	if err != nil {
		// Fallback to simple PDF
		pdfBytes = GenerateSimpleBASTBytes(docNumber, preview.DistributionPoint, start, end, preview.TotalPortions, preview.TotalAmount, sppgHead, repName)
	}

	// Upload to Storage
	identifier := preview.DistributionPoint.NPSN
	if identifier == "" {
		identifier = preview.DistributionPoint.ID.String()[:8]
	}
	filename := fmt.Sprintf("bast/BAST_%s_%s.pdf", identifier, time.Now().Format("20060102_150405"))
	fileURL, err := s.storageSvc.UploadFile(ctx, filename, pdfBytes, "application/pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to upload BAST PDF to storage: %w", err)
	}

	now := time.Now()
	bastDoc := &models.BASTDocument{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		DocumentNumber:              docNumber,
		DistributionPointID:         req.DistributionPointID,
		PeriodStart:                 start,
		PeriodEnd:                   end,
		TotalPortions:               preview.TotalPortions,
		TotalAmount:                 preview.TotalAmount,
		FileURL:                     fileURL,
		FileSizeBytes:               int64(len(pdfBytes)),
		GeneratedAt:                 now,
		SPPGHeadName:                sppgHead,
		RecipientRepresentativeName: repName,
		Status:                      models.BASTStatusGenerated,
	}

	if err := s.repo.CreateBASTDocument(ctx, bastDoc); err != nil {
		return nil, fmt.Errorf("failed to save BAST document record: %w", err)
	}

	return &BASTDocumentResponse{
		ID:                          bastDoc.ID,
		DocumentNumber:              bastDoc.DocumentNumber,
		DistributionPointID:         bastDoc.DistributionPointID,
		DistributionPointName:       preview.DistributionPoint.Name,
		PeriodStart:                 req.PeriodStart,
		PeriodEnd:                   req.PeriodEnd,
		TotalPortions:               bastDoc.TotalPortions,
		TotalAmount:                 bastDoc.TotalAmount,
		FileURL:                     bastDoc.FileURL,
		FileSizeBytes:               bastDoc.FileSizeBytes,
		GeneratedAt:                 bastDoc.GeneratedAt,
		SPPGHeadName:                bastDoc.SPPGHeadName,
		RecipientRepresentativeName: bastDoc.RecipientRepresentativeName,
		Status:                      bastDoc.Status,
	}, nil
}

func (s *service) ListBASTDocuments(ctx context.Context, limit int) ([]models.BASTDocument, error) {
	return s.repo.ListBASTDocuments(ctx, limit)
}

func (s *service) RecordDriverLocation(ctx context.Context, distributionID uuid.UUID, req *DriverLocationRequest, userID uuid.UUID) error {
	dist, err := s.repo.GetDistributionByID(ctx, distributionID)
	if err != nil {
		return fmt.Errorf("distribution not found: %w", err)
	}

	if dist.Status != models.DistStatusInTransit {
		return fmt.Errorf("cannot record location for distribution not in IN_TRANSIT status (current: %s)", dist.Status)
	}

	loc := &models.DriverLocationLog{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		DistributionID: distributionID,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		RecordedAt:     time.Now(),
	}

	if err := s.repo.SaveDriverLocation(ctx, loc); err != nil {
		return fmt.Errorf("failed to save driver location: %w", err)
	}

	return nil
}
