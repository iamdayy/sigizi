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

	if err := dbInstance.AutoMigrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	if err := dbInstance.SeedInitialData(); err != nil {
		log.Printf("[DATABASE] Note on seed data: %v", err)
	}

	log.Println("[DATABASE] Database initialization and migration completed successfully.")
	return dbInstance, nil
}

func (d *Database) AutoMigrate() error {
	return d.DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Item{},
		&models.ItemBatch{},
		&models.StockMovement{},
		&models.Account{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.ProductionBatch{},
		&models.ProductionIngredient{},
		&models.School{},
		&models.Distribution{},
		&models.DistributionItem{},
		&models.BASTDocument{},
	)
}

func (d *Database) SeedInitialData() error {
	var userCount int64
	d.DB.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		return nil // Already seeded
	}

	log.Println("[DATABASE] Seeding initial SPPG data...")

	// Hash password "Password123!"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)

	adminUUID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	financeUUID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	warehouseUUID := uuid.MustParse("00000000-0000-0000-0000-000000000003")

	users := []models.User{
		{
			AuditModel:   models.AuditModel{ID: adminUUID},
			Email:        "admin@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Dr. Siti Nurhaliza (Kepala SPPG)",
			Role:         models.RoleAdmin,
			IsActive:     true,
			PhoneNumber:  "081199887766",
		},
		{
			AuditModel:   models.AuditModel{ID: financeUUID},
			Email:        "finance@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Budi Santoso, SE (Finance Officer)",
			Role:         models.RoleFinance,
			IsActive:     true,
			PhoneNumber:  "081233445566",
		},
		{
			AuditModel:   models.AuditModel{ID: warehouseUUID},
			Email:        "gudang@sppg.kemang.id",
			PasswordHash: string(hashedPassword),
			FullName:     "Ahmad Dani (Kepala Logistik & Gudang)",
			Role:         models.RoleWarehouse,
			IsActive:     true,
			PhoneNumber:  "081377889900",
		},
	}
	for _, u := range users {
		d.DB.FirstOrCreate(&u, models.User{Email: u.Email})
	}

	// Seed Accounts
	accounts := []models.Account{
		{Code: "1-1001", Name: "Kas & Bank Operasional SPPG", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Rekening Giro Operasional MBG"},
		{Code: "1-1002", Name: "Kas Kecil (Petty Cash)", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Dana Kas Kecil Dapur & Logistik"},
		{Code: "1-1301", Name: "Persediaan Bahan Makanan Basah (Protein & Sayur)", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Stok Daging, Telur, Sayuran"},
		{Code: "1-1302", Name: "Persediaan Bahan Kering & Karbohidrat", Type: models.AccountAsset, NormalBalance: models.BalanceDebit, Description: "Stok Beras, Minyak, Bumbu"},
		{Code: "2-1001", Name: "Utang Usaha Supplier Bahan Baku", Type: models.AccountLiability, NormalBalance: models.BalanceCredit, Description: "Kewajiban kepada Vendor"},
		{Code: "3-1001", Name: "Modal Alokasi APBN MBG", Type: models.AccountEquity, NormalBalance: models.BalanceCredit, Description: "Alokasi Dana APBN Program MBG"},
		{Code: "4-1001", Name: "Pendapatan Alokasi Program MBG", Type: models.AccountRevenue, NormalBalance: models.BalanceCredit, Description: "Klaim Porsi Tersalurkan"},
		{Code: "5-1001", Name: "Beban Pokok Produksi (HPP / COGS Bahan Baku)", Type: models.AccountCOGS, NormalBalance: models.BalanceDebit, Description: "Beban Bahan Langsung FEFO"},
		{Code: "5-1002", Name: "Beban Kemasan & Distribusi", Type: models.AccountCOGS, NormalBalance: models.BalanceDebit, Description: "Biaya logistik & box"},
		{Code: "6-1001", Name: "Beban Operasional Dapur & Utilitas", Type: models.AccountExpense, NormalBalance: models.BalanceDebit, Description: "Gas LPG, Listrik, Air"},
	}
	for _, acc := range accounts {
		d.DB.FirstOrCreate(&acc, models.Account{Code: acc.Code})
	}

	// Seed Schools
	schools := []models.School{
		{
			AuditModel:    models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000001")},
			NPSN:          "20104101",
			Name:          "SD Negeri 01 Pagi Pasar Minggu",
			Address:       "Jl. Raya Ragunan No. 12",
			District:      "Pasar Minggu",
			City:          "Jakarta Selatan",
			ContactPerson: "Drs. H. Mulyono",
			PhoneNumber:   "081288991122",
			TotalStudents: 420,
		},
		{
			AuditModel:    models.AuditModel{ID: uuid.MustParse("a0000000-0000-0000-0000-000000000002")},
			NPSN:          "20104102",
			Name:          "SD Negeri 03 Cilandak Timur",
			Address:       "Jl. Ampera Raya No. 45",
			District:      "Cilandak",
			City:          "Jakarta Selatan",
			ContactPerson: "Hj. Endang Suryani, M.Pd",
			PhoneNumber:   "081399887766",
			TotalStudents: 380,
		},
	}
	for _, s := range schools {
		d.DB.FirstOrCreate(&s, models.School{NPSN: s.NPSN})
	}

	// Seed Items & Batches
	now := time.Now()
	beefID := uuid.MustParse("b0000000-0000-0000-0000-000000000001")
	chickID := uuid.MustParse("b0000000-0000-0000-0000-000000000002")
	eggID := uuid.MustParse("b0000000-0000-0000-0000-000000000003")
	riceID := uuid.MustParse("b0000000-0000-0000-0000-000000000004")
	spinachID := uuid.MustParse("b0000000-0000-0000-0000-000000000005")

	items := []models.Item{
		{AuditModel: models.AuditModel{ID: beefID}, SKU: "ING-BEEF-01", Name: "Daging Sapi Segar Giling", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 20, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: chickID}, SKU: "ING-CHICK-01", Name: "Daging Ayam Fillet Dada", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 50, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: eggID}, SKU: "ING-EGG-01", Name: "Telur Ayam Ras Segar", Category: models.CategoryProtein, Unit: "kg", MinStockThreshold: 40, IsPerishable: true},
		{AuditModel: models.AuditModel{ID: riceID}, SKU: "ING-RICE-01", Name: "Beras Organik Ramos", Category: models.CategoryCarbohydrate, Unit: "kg", MinStockThreshold: 200, IsPerishable: false},
		{AuditModel: models.AuditModel{ID: spinachID}, SKU: "ING-VEG-SPINACH", Name: "Bayam Hijau Hidroponik", Category: models.CategoryVegetable, Unit: "kg", MinStockThreshold: 15, IsPerishable: true},
	}
	for _, it := range items {
		d.DB.FirstOrCreate(&it, models.Item{SKU: it.SKU})
	}

	// Seed Sample Batches with distinct expiry dates to test FEFO immediately
	batches := []models.ItemBatch{
		// Chicken batch 1: Expiring in 3 days, unit cost 42,000
		{
			ItemID:       chickID,
			BatchCode:    "BATCH-CHICK-202608-01",
			ExpiryDate:   now.AddDate(0, 0, 3),
			UnitCost:     42000,
			InitialQty:   50,
			CurrentQty:   50,
			ReceivedDate: now.AddDate(0, 0, -2),
			SupplierName: "PT Unggas Sejahtera Mandiri",
		},
		// Chicken batch 2: Expiring in 7 days, unit cost 44,000
		{
			ItemID:       chickID,
			BatchCode:    "BATCH-CHICK-202608-02",
			ExpiryDate:   now.AddDate(0, 0, 7),
			UnitCost:     44000,
			InitialQty:   100,
			CurrentQty:   100,
			ReceivedDate: now.AddDate(0, 0, -1),
			SupplierName: "PT Unggas Sejahtera Mandiri",
		},
		// Rice batch 1: Expiring in 180 days, unit cost 14,500
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
		// Spinach batch 1: Expiring in 2 days, unit cost 12,000
		{
			ItemID:       spinachID,
			BatchCode:    "BATCH-SPIN-202608-01",
			ExpiryDate:   now.AddDate(0, 0, 2),
			UnitCost:     12000,
			InitialQty:   30,
			CurrentQty:   30,
			ReceivedDate: now,
			SupplierName: "Kebun Hijau Lestari",
		},
		// Egg batch 1: Expiring in 14 days, unit cost 28,000
		{
			ItemID:       eggID,
			BatchCode:    "BATCH-EGG-202608-01",
			ExpiryDate:   now.AddDate(0, 0, 14),
			UnitCost:     28000,
			InitialQty:   120,
			CurrentQty:   120,
			ReceivedDate: now.AddDate(0, 0, -1),
			SupplierName: "Peternakan Berkah Sejati",
		},
	}
	for _, b := range batches {
		d.DB.FirstOrCreate(&b, models.ItemBatch{BatchCode: b.BatchCode})
	}

	return nil
}
