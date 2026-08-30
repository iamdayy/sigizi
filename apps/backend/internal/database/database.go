package database

import (
	"fmt"
	"log"
	"time"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB *gorm.DB
}

func NewDatabase(cfg *config.Config) (*Database, error) {
	var gormDB *gorm.DB
	var err error

	gormLogger := logger.Default.LogMode(logger.Info)
	if cfg.AppEnv == "production" {
		gormLogger = logger.Default.LogMode(logger.Warn)
	}

	dsn := cfg.GetDSN()
	log.Printf("[DATABASE] Connecting to PostgreSQL at %s:%s (db: %s)...", cfg.DBHost, cfg.DBPort, cfg.DBName)

	gormDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			loc, err := time.LoadLocation(cfg.Timezone)
			if err != nil {
				return time.Now().UTC()
			}
			return time.Now().In(loc)
		},
	})

	if err != nil {
		log.Printf("[DATABASE] WARNING: PostgreSQL connection failed: %v. Falling back to local SQLite for development/testing...", err)
		gormDB, err = gorm.Open(sqlite.Open("mbg_dev.db"), &gorm.Config{
			Logger: gormLogger,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to open database: %w", err)
		}
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Enterprise Connection Pool Settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Ensure schema exists and is accessible if connecting to PostgreSQL with custom user
	if cfg.DBUser != "" && cfg.DBUser != "postgres" {
		_ = gormDB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s;", cfg.DBUser)).Error
		_ = gormDB.Exec(fmt.Sprintf("SET search_path TO %s, public;", cfg.DBUser)).Error
	}

	dbInstance := &Database{DB: gormDB}

	// Run pre-migrations to safely handle legacy schema evolutions
	dbInstance.runPreMigrations()

	if err := dbInstance.AutoMigrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	if err := dbInstance.SeedInitialData(); err != nil {
		log.Printf("[DATABASE] Note on seed data: %v", err)
	}

	log.Println("[DATABASE] Database initialization and migration completed successfully.")
	return dbInstance, nil
}

func (d *Database) runPreMigrations() {
	// 1. Rename table 'schools' to 'distribution_points' if old table exists
	if d.DB.Migrator().HasTable("schools") && !d.DB.Migrator().HasTable("distribution_points") {
		log.Println("[DATABASE] Migrating legacy 'schools' table to 'distribution_points'...")
		_ = d.DB.Migrator().RenameTable("schools", "distribution_points")
	}

	// 2. Rename column 'total_students' to 'total_recipients' in 'distribution_points' if needed
	if d.DB.Migrator().HasTable("distribution_points") {
		if d.DB.Migrator().HasColumn("distribution_points", "total_students") &&
			!d.DB.Migrator().HasColumn("distribution_points", "total_recipients") {
			_ = d.DB.Migrator().RenameColumn("distribution_points", "total_students", "total_recipients")
		}
	}

	// 3. Handle distributions table column migration from school_id -> distribution_point_id
	if d.DB.Migrator().HasTable("distributions") {
		hasSchoolID := d.DB.Migrator().HasColumn("distributions", "school_id")
		hasDistPointID := d.DB.Migrator().HasColumn("distributions", "distribution_point_id")

		if hasSchoolID && !hasDistPointID {
			log.Println("[DATABASE] Renaming 'distributions.school_id' to 'distribution_point_id'...")
			_ = d.DB.Migrator().RenameColumn("distributions", "school_id", "distribution_point_id")
		} else if hasSchoolID && hasDistPointID {
			log.Println("[DATABASE] Syncing 'distributions.school_id' to 'distribution_point_id'...")
			_ = d.DB.Exec("UPDATE distributions SET distribution_point_id = school_id WHERE distribution_point_id IS NULL AND school_id IS NOT NULL").Error
		}
	}

	// 4. Handle bast_documents table column migrations
	if d.DB.Migrator().HasTable("bast_documents") {
		// Migration for school_id -> distribution_point_id
		hasSchoolID := d.DB.Migrator().HasColumn("bast_documents", "school_id")
		hasDistPointID := d.DB.Migrator().HasColumn("bast_documents", "distribution_point_id")

		if hasSchoolID && !hasDistPointID {
			log.Println("[DATABASE] Renaming 'bast_documents.school_id' to 'distribution_point_id'...")
			_ = d.DB.Migrator().RenameColumn("bast_documents", "school_id", "distribution_point_id")
		} else if hasSchoolID && hasDistPointID {
			log.Println("[DATABASE] Syncing 'bast_documents.school_id' to 'distribution_point_id'...")
			_ = d.DB.Exec("UPDATE bast_documents SET distribution_point_id = school_id WHERE distribution_point_id IS NULL AND school_id IS NOT NULL").Error
		}

		// Migration for school_principal_name -> recipient_representative_name
		hasOldPrincipalName := d.DB.Migrator().HasColumn("bast_documents", "school_principal_name")
		hasNewRecipientName := d.DB.Migrator().HasColumn("bast_documents", "recipient_representative_name")

		if hasOldPrincipalName && !hasNewRecipientName {
			log.Println("[DATABASE] Renaming 'bast_documents.school_principal_name' to 'recipient_representative_name'...")
			_ = d.DB.Migrator().RenameColumn("bast_documents", "school_principal_name", "recipient_representative_name")
		} else if hasOldPrincipalName && hasNewRecipientName {
			log.Println("[DATABASE] Syncing 'bast_documents.school_principal_name' to 'recipient_representative_name'...")
			_ = d.DB.Exec("UPDATE bast_documents SET recipient_representative_name = school_principal_name WHERE recipient_representative_name IS NULL AND school_principal_name IS NOT NULL").Error
		}
	}

	// 5. Clean up any orphaned records that would violate foreign key constraints on distribution_points
	if d.DB.Migrator().HasTable("distribution_points") {
		if d.DB.Migrator().HasTable("bast_documents") && d.DB.Migrator().HasColumn("bast_documents", "distribution_point_id") {
			_ = d.DB.Exec("DELETE FROM bast_documents WHERE distribution_point_id IS NULL OR distribution_point_id NOT IN (SELECT id FROM distribution_points)").Error
		}

		if d.DB.Migrator().HasTable("distributions") && d.DB.Migrator().HasColumn("distributions", "distribution_point_id") {
			if d.DB.Migrator().HasTable("distribution_items") {
				_ = d.DB.Exec("DELETE FROM distribution_items WHERE distribution_id IN (SELECT id FROM distributions WHERE distribution_point_id IS NULL OR distribution_point_id NOT IN (SELECT id FROM distribution_points))").Error
			}
			_ = d.DB.Exec("DELETE FROM distributions WHERE distribution_point_id IS NULL OR distribution_point_id NOT IN (SELECT id FROM distribution_points)").Error
		}
	}
}

func (d *Database) AutoMigrate() error {
	return d.DB.AutoMigrate(
		// IAM & Staff
		&models.User{},
		&models.RefreshToken{},
		&models.Attendance{},

		// Inventory
		&models.Item{},
		&models.ItemBatch{},
		&models.StockMovement{},

		// Finance
		&models.Account{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.ProductionBatch{},
		&models.ProductionIngredient{},

		// Distribution
		&models.DistributionPoint{},
		&models.Distribution{},
		&models.DistributionItem{},
		&models.BASTDocument{},

		// Quality Control & Food Safety
		&models.HygieneChecklist{},
		&models.TemperatureLog{},
		&models.OrganolepticTest{},
		&models.FoodSample{},

		// Menu Planning & Nutrition AKG
		&models.NutritionInfo{},
		&models.MenuCycle{},
		&models.MenuItem{},
		&models.MenuRecipeItem{},

		// Reporting & Virtual Account
		&models.VirtualAccount{},
		&models.VATransaction{},
		&models.GeneratedReport{},
	)
}

func (d *Database) SeedInitialData() error {
	// We don't return early entirely if users exist, because we might need to seed new tables like NutritionInfo
	// in existing databases. Each block will use FirstOrCreate to avoid duplicates.
	log.Println("[DATABASE] Seeding initial SPPG data based on BGN standard...")

	// Hash password "Password123!"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)

	headUUID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	financeUUID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	warehouseUUID := uuid.MustParse("00000000-0000-0000-0000-000000000003")
	nutriUUID := uuid.MustParse("00000000-0000-0000-0000-000000000004")
	qcUUID := uuid.MustParse("00000000-0000-0000-0000-000000000005")
	driverUUID := uuid.MustParse("00000000-0000-0000-0000-000000000006")
	volunteerUUID := uuid.MustParse("00000000-0000-0000-0000-000000000007")

	users := []models.User{
		{
			AuditModel:   models.AuditModel{ID: headUUID},
			Email:        "admin@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Dr. Siti Nurhaliza (Kepala SPPG)",
			Role:         models.RoleAdmin,
			Position:     "Kepala SPPG Pelaksana",
			NIK:          "3174012345670001",
			IsActive:     true,
			PhoneNumber:  "081199887766",
		},
		{
			AuditModel:   models.AuditModel{ID: financeUUID},
			Email:        "finance@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Budi Santoso, SE (Finance Officer)",
			Role:         models.RoleFinance,
			Position:     "Pengawas Keuangan & Akuntan",
			NIK:          "3174012345670002",
			IsActive:     true,
			PhoneNumber:  "081233445566",
		},
		{
			AuditModel:   models.AuditModel{ID: warehouseUUID},
			Email:        "gudang@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Ahmad Dani (Kepala Logistik & Gudang)",
			Role:         models.RoleWarehouse,
			Position:     "Pengawas Logistik Gudang",
			NIK:          "3174012345670003",
			IsActive:     true,
			PhoneNumber:  "081377889900",
		},
		{
			AuditModel:   models.AuditModel{ID: nutriUUID},
			Email:        "gizi@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Nurlaila, S.Gz (Ahli Gizi SPPG)",
			Role:         models.RoleNutritionist,
			Position:     "Pengawas Gizi & Menu MBG",
			NIK:          "3174012345670004",
			IsActive:     true,
			PhoneNumber:  "081512345678",
		},
		{
			AuditModel:   models.AuditModel{ID: qcUUID},
			Email:        "qc@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Rahmat Hidayat, S.Si (Pengawas Sanitasi & QC)",
			Role:         models.RoleQC,
			Position:     "Pengawas Sanitasi, SLHS & Keamanan Pangan",
			NIK:          "3174012345670005",
			IsActive:     true,
			PhoneNumber:  "081798765432",
		},
		{
			AuditModel:   models.AuditModel{ID: driverUUID},
			Email:        "driver@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Joko Susilo (Driver Distribusi)",
			Role:         models.RoleDriver,
			Position:     "Driver Armada Distribusi MBG",
			NIK:          "3174012345670006",
			IsActive:     true,
			PhoneNumber:  "081822334455",
		},
		{
			AuditModel:   models.AuditModel{ID: volunteerUUID},
			Email:        "relawan@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Ibu Maryani (Relawan Juru Masak)",
			Role:         models.RoleVolunteer,
			Position:     "Relawan Juru Masak Dapur",
			NIK:          "3174012345670007",
			IsActive:     true,
			PhoneNumber:  "081933445566",
		},
	}
	for _, u := range users {
		d.DB.FirstOrCreate(&u, models.User{Email: u.Email})
	}

	// Seed Accounts
	accounts := []models.Account{
		{Code: "1-1001", Name: "Kas & Virtual Account Giro SPPG (BGN)", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Rekening VA Giro Operasional MBG (Auto Top-Up)"},
		{Code: "1-1002", Name: "Kas Kecil (Petty Cash Dapur)", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Dana Kas Kecil Operasional Harian"},
		{Code: "1-1301", Name: "Persediaan Bahan Makanan Basah (Protein, Sayur, Susu)", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Stok Daging, Telur, Sayuran, Susu"},
		{Code: "1-1302", Name: "Persediaan Bahan Kering & Karbohidrat", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Stok Beras, Minyak, Bumbu"},
		{Code: "2-1001", Name: "Utang Usaha Supplier Bahan Pangan", Type: models.AccountLiability, NormalBalance: models.BalanceCredit, Description: "Kewajiban kepada Vendor Bahan Baku"},
		{Code: "3-1001", Name: "Modal Alokasi APBN MBG (BGN)", Type: models.AccountEquity, NormalBalance: models.BalanceCredit, Description: "Alokasi Dana APBN Program MBG"},
		{Code: "4-1001", Name: "Pendapatan Alokasi MBG Porsi Tersalurkan", Type: models.AccountRevenue, NormalBalance: models.BalanceCredit, Description: "Klaim Porsi Tersalurkan"},
		{Code: "5-1001", Name: "Beban Pokok Produksi (HPP Bahan Baku Langsung)", Type: models.AccountCOGS, NormalBalance: models.BalanceDebit, Description: "Beban Bahan Langsung FEFO"},
		{Code: "5-1002", Name: "Beban Kemasan, Tray & Distribusi", Type: models.AccountCOGS, NormalBalance: models.BalanceDebit, Description: "Biaya logistik, food tray & totebag"},
		{Code: "6-1001", Name: "Beban Operasional Dapur & Sanitasi", Type: models.AccountExpense, NormalBalance: models.BalanceDebit, Description: "Gas LPG, Listrik, Air, QC Sanitasi"},
	}
	for _, acc := range accounts {
		d.DB.FirstOrCreate(&acc, models.Account{Code: acc.Code})
	}

	// Seed DistributionPoints (Schools, Posyandu for 3B, Pesantren)
	eduSD := models.EduSD
	eduSMP := models.EduSMP
	distPoints := []models.DistributionPoint{
		{
			AuditModel:      models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000001")},
			NPSN:            "20104101",
			Name:            "SD Negeri 01 Pagi Pasar Minggu",
			Type:            models.DPTypeSchool,
			EducationLevel:  &eduSD,
			Address:         "Jl. Raya Ragunan No. 12",
			District:        "Pasar Minggu",
			City:            "Jakarta Selatan",
			ContactPerson:   "Drs. H. Mulyono (Kepala Sekolah)",
			PhoneNumber:     "081288991122",
			TotalRecipients: 420,
			IsActive:        true,
		},
		{
			AuditModel:      models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000002")},
			NPSN:            "20104102",
			Name:            "SMP Negeri 41 Jakarta",
			Type:            models.DPTypeSchool,
			EducationLevel:  &eduSMP,
			Address:         "Jl. Salihara No. 88",
			District:        "Pasar Minggu",
			City:            "Jakarta Selatan",
			ContactPerson:   "Hj. Endang Suryani, M.Pd",
			PhoneNumber:     "081399887766",
			TotalRecipients: 550,
			IsActive:        true,
		},
		{
			AuditModel:      models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000003")},
			Name:            "Posyandu Melati Indah (Kelompok 3B)",
			Type:            models.DPTypePosyandu,
			Address:         "Balai Warga RW 05 Pejaten Barat",
			District:        "Pasar Minggu",
			City:            "Jakarta Selatan",
			ContactPerson:   "Bidan Ratna Sari, A.Md.Keb",
			PhoneNumber:     "081277665544",
			TotalRecipients: 125, // Ibu Hamil, Ibu Menyusui, Balita
			DietaryNotes:    "Menu Kemasan Totebag + Susu UHT Tinggi Kalsium",
			IsActive:        true,
		},
		{
			AuditModel:      models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000004")},
			Name:            "Pondok Pesantren Al-Hikmah",
			Type:            models.DPTypePesantren,
			Address:         "Jl. Jeruk Purut No. 3",
			District:        "Cilandak",
			City:            "Jakarta Selatan",
			ContactPerson:   "Ust. Abdul Qodir",
			PhoneNumber:     "081311223344",
			TotalRecipients: 300,
			IsActive:        true,
		},
	}
	for _, dp := range distPoints {
		d.DB.FirstOrCreate(&dp, models.DistributionPoint{Name: dp.Name})
	}

	// Seed Items & Batches
	now := time.Now()
	beefID := uuid.MustParse("b0000000-0000-0000-0000-000000000001")
	chickID := uuid.MustParse("b0000000-0000-0000-0000-000000000002")
	eggID := uuid.MustParse("b0000000-0000-0000-0000-000000000003")
	riceID := uuid.MustParse("b0000000-0000-0000-0000-000000000004")
	spinachID := uuid.MustParse("b0000000-0000-0000-0000-000000000005")
	milkID := uuid.MustParse("b0000000-0000-0000-0000-000000000006")

	items := []models.Item{
		{AuditModel: models.AuditModel{ID: beefID}, SKU: "ING-BEEF-01", Name: "Daging Sapi Segar Giling", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 20, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: chickID}, SKU: "ING-CHICK-01", Name: "Daging Ayam Fillet Dada", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 50, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: eggID}, SKU: "ING-EGG-01", Name: "Telur Ayam Ras Segar", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 40, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: riceID}, SKU: "ING-RICE-01", Name: "Beras Organik Ramos", Category: models.CategoryCarbohydrate, Unit: "kg", MinStockThreshold: 200, IsPerishable: false},
		{AuditModel: models.AuditModel{ID: spinachID}, SKU: "ING-VEG-SPINACH", Name: "Bayam Hijau Hidroponik", Category: models.CategoryVegetable, Unit: "kg", MinStockThreshold: 15, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: milkID}, SKU: "ING-MILK-UHT-200", Name: "Susu Sapi Murni UHT 200ml", Category: models.CategoryBeverage, Unit: "pcs", MinStockThreshold: 500, IsPerishable: false},
	}
	for _, it := range items {
		d.DB.FirstOrCreate(&it, models.Item{SKU: it.SKU})
	}

	// Seed Nutrition Values (TKPI Kemenkes RI Standard per 100g)
	nutritionData := []models.NutritionInfo{
		{ItemID: beefID, CaloriesPer100g: 250.0, ProteinPer100g: 26.0, FatPer100g: 15.0, CarbsPer100g: 0.0, IronMg100g: 2.6, Source: "TKPI Kemenkes"},
		{ItemID: chickID, CaloriesPer100g: 165.0, ProteinPer100g: 31.0, FatPer100g: 3.6, CarbsPer100g: 0.0, IronMg100g: 1.0, Source: "TKPI Kemenkes"},
		{ItemID: eggID, CaloriesPer100g: 155.0, ProteinPer100g: 13.0, FatPer100g: 11.0, CarbsPer100g: 1.1, IronMg100g: 1.8, Source: "TKPI Kemenkes"},
		{ItemID: riceID, CaloriesPer100g: 130.0, ProteinPer100g: 2.7, FatPer100g: 0.3, CarbsPer100g: 28.0, FiberPer100g: 0.4, Source: "TKPI Kemenkes"},
		{ItemID: spinachID, CaloriesPer100g: 23.0, ProteinPer100g: 2.9, FatPer100g: 0.4, CarbsPer100g: 3.6, FiberPer100g: 2.2, CalciumMg100g: 99.0, Source: "TKPI Kemenkes"},
		{ItemID: milkID, CaloriesPer100g: 65.0, ProteinPer100g: 3.4, FatPer100g: 3.6, CarbsPer100g: 4.8, CalciumMg100g: 120.0, Source: "Juknis Susu BGN"},
	}
	for _, n := range nutritionData {
		d.DB.FirstOrCreate(&n, models.NutritionInfo{ItemID: n.ItemID})
	}

	// Seed Sample Batches
	batches := []models.ItemBatch{
		{
			ItemID:       chickID,
			BatchCode:    "BATCH-CHICK-202608-01",
			ExpiryDate:   now.AddDate(0, 0, 3),
			UnitCost:     42000,
			InitialQty:   100,
			CurrentQty:   100,
			ReceivedDate: now.AddDate(0, 0, -2),
			SupplierName: "PT Unggas Sejahtera Mandiri",
		},
		{
			ItemID:       riceID,
			BatchCode:    "BATCH-RICE-202608-01",
			ExpiryDate:   now.AddDate(0, 6, 0),
			UnitCost:     14500,
			InitialQty:   500,
			CurrentQty:   500,
			ReceivedDate: now.AddDate(0, 0, -5),
			SupplierName: "Koperasi Tani Makmur",
		},
		{
			ItemID:       milkID,
			BatchCode:    "BATCH-MILK-202608-01",
			ExpiryDate:   now.AddDate(0, 9, 0),
			UnitCost:     4500,
			InitialQty:   3000,
			CurrentQty:   3000,
			ReceivedDate: now.AddDate(0, 0, -1),
			SupplierName: "PT Industri Susu Nasional",
		},
	}
	for _, b := range batches {
		d.DB.FirstOrCreate(&b, models.ItemBatch{BatchCode: b.BatchCode})
	}

	// Seed Virtual Account
	vaID := uuid.MustParse("c0000000-0000-0000-0000-000000000001")
	va := models.VirtualAccount{
		AuditModel:            models.AuditModel{ID: vaID},
		AccountNumber:         "8888019928374650",
		BankCode:              models.BankBRI,
		BankName:              "Bank Rakyat Indonesia (Giro BGN)",
		AccountHolder:         "SPPG Kemang - Badan Gizi Nasional",
		CurrentBalance:        150000000.00, // Rp 150 Juta Pagu Awal
		APIIntegrationEnabled: true,
		APIClientID:           "SIPGN-BGN-JKTSEL-01",
		IsActive:              true,
	}
	d.DB.FirstOrCreate(&va, models.VirtualAccount{AccountNumber: va.AccountNumber})

	// Seed Menu Cycle (20 Days BGN Standard)
	headUUIDStr := "00000000-0000-0000-0000-000000000001"
	headID := uuid.MustParse(headUUIDStr)
	cycleID := uuid.MustParse("d0000000-0000-0000-0000-000000000001")
	menuCycle := models.MenuCycle{
		AuditModel:   models.AuditModel{ID: cycleID, CreatedBy: &headID},
		Name:         "Siklus Menu Utama SPPG Agustus 2026",
		TotalDays:    20,
		StartDate:    time.Now().AddDate(0, 0, -2),
		EndDate:      time.Now().AddDate(0, 0, 18),
		IsActive:     true,
		ApprovedByID: &headID,
		Notes:        "Siklus disetujui BGN",
	}
	d.DB.FirstOrCreate(&menuCycle, models.MenuCycle{Name: menuCycle.Name})
    d.DB.Model(&menuCycle).Update("is_active", true)

	// Seed Menu Items for Day 1
	menuItem1 := models.MenuItem{
		AuditModel:    models.AuditModel{ID: uuid.MustParse("d1000000-0000-0000-0000-000000000001")},
		MenuCycleID:   cycleID,
		DayNumber:     1,
		MealName:      "Nasi Putih + Ayam Goreng Lengkuas + Sayur Bening Bayam",
		Description:   "Menu Gizi Seimbang MBG Hari 1 - Tinggi Protein & Serat",
		IncludesMilk:  true,
		MilkType:      "UHT",
		TotalCalories: 585.5,
		TotalProtein:  24.5,
		TotalFat:      18.2,
		TotalCarbs:    62.0,
		AKGPercentage: 29.3,
		IsAKGCompliant: true,
	}
	d.DB.FirstOrCreate(&menuItem1, models.MenuItem{MenuCycleID: cycleID, DayNumber: 1})

	// Recipes for Day 1
	recipes1 := []models.MenuRecipeItem{
		{AuditModel: models.AuditModel{ID: uuid.MustParse("d1100000-0000-0000-0000-000000000001")}, MenuItemID: menuItem1.ID, ItemID: riceID, QtyPerPortionGram: 100},
		{AuditModel: models.AuditModel{ID: uuid.MustParse("d1100000-0000-0000-0000-000000000002")}, MenuItemID: menuItem1.ID, ItemID: chickID, QtyPerPortionGram: 75},
		{AuditModel: models.AuditModel{ID: uuid.MustParse("d1100000-0000-0000-0000-000000000003")}, MenuItemID: menuItem1.ID, ItemID: spinachID, QtyPerPortionGram: 50},
	}
	for _, r := range recipes1 {
		d.DB.FirstOrCreate(&r, models.MenuRecipeItem{MenuItemID: r.MenuItemID, ItemID: r.ItemID})
	}


	return nil
}
