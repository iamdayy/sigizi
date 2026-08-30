package main

import (
"fmt"
"log"

"github.com/daydev/mbg-system/backend/internal/models"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=mbg_user password=mbg_pass dbname=mbg_db port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var infos []models.NutritionInfo
	db.Preload("Item").Find(&infos)
	
	fmt.Printf("Found %d nutrition records.\n", len(infos))
	for _, n := range infos {
		if n.Item != nil {
			fmt.Printf("- %s (ID: %s): %v kkal/100g, %v protein/100g\n", n.Item.Name, n.ItemID, n.CaloriesPer100g, n.ProteinPer100g)
		}
	}
}
