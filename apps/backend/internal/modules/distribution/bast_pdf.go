package distribution

import (
	"bytes"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

type BASTPDFGenerator struct{}

func NewBASTPDFGenerator() *BASTPDFGenerator {
	return &BASTPDFGenerator{}
}

func (g *BASTPDFGenerator) GenerateBAST(
	docNumber string,
	dp *models.DistributionPoint,
	periodStart, periodEnd time.Time,
	deliveries []models.Distribution,
	totalPortions int,
	totalAmount float64,
	sppgHeadName, recipientRepName string,
) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(15).
		WithLeftMargin(15).
		WithRightMargin(15).
		WithBottomMargin(15).
		Build()

	m := maroto.New(cfg)

	// 1. Header KOP
	m.AddRows(
		row.New(10).Add(
			col.New(12).Add(
				text.New("PEMERINTAH REPUBLIK INDONESIA - BADAN GIZI NASIONAL", props.Text{
					Style: fontstyle.Bold,
					Size:  12,
					Align: align.Center,
				}),
			),
		),
		row.New(8).Add(
			col.New(12).Add(
				text.New("SATUAN PELAYANAN PROGRAM GIZI (SPPG) WILAYAH JAKARTA SELATAN", props.Text{
					Style: fontstyle.Bold,
					Size:  10,
					Align: align.Center,
				}),
			),
		),
		row.New(6).Add(
			col.New(12).Add(
				text.New("Jl. Margasatwa Raya No. 40, Ragunan, Jakarta Selatan | Telp: (021) 7889-0123", props.Text{
					Size:  8,
					Align: align.Center,
				}),
			),
		),
		row.New(8).Add(
			col.New(12).Add(
				text.New("===================================================================================", props.Text{
					Size:  7,
					Align: align.Center,
				}),
			),
		),
	)

	// 2. Title
	m.AddRows(
		row.New(9).Add(
			col.New(12).Add(
				text.New("BERITA ACARA SERAH TERIMA (BAST)", props.Text{
					Style: fontstyle.Bold,
					Size:  13,
					Align: align.Center,
				}),
			),
		),
		row.New(6).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("Nomor: %s", docNumber), props.Text{
					Style: fontstyle.Bold,
					Size:  9,
					Align: align.Center,
				}),
			),
		),
		row.New(4).Add(
			col.New(12).Add(text.New("", props.Text{})),
		),
	)

	// 3. Opening
	opening := fmt.Sprintf("Pada hari ini, %s, kami yang bertanda tangan di bawah ini telah melaksanakan serah terima makanan bergizi program MBG untuk periode %s s/d %s:",
		time.Now().Format("02 January 2006"),
		periodStart.Format("02/01/2006"),
		periodEnd.Format("02/01/2006"),
	)
	m.AddRows(
		row.New(8).Add(
			col.New(12).Add(text.New(opening, props.Text{Size: 9})),
		),
		row.New(3).Add(col.New(12).Add(text.New("", props.Text{}))),
	)

	// 4. Parties
	idOrNPSN := dp.NPSN
	if idOrNPSN == "" {
		idOrNPSN = string(dp.Type)
	}

	m.AddRows(
		row.New(6).Add(
			col.New(3).Add(text.New("Pihak Pertama (Penyalur):", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(9).Add(text.New(sppgHeadName+" (Kepala SPPG)", props.Text{Size: 8})),
		),
		row.New(6).Add(
			col.New(3).Add(text.New("Pihak Kedua (Penerima):", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(9).Add(text.New(fmt.Sprintf("%s (Perwakilan - %s)", recipientRepName, dp.Name), props.Text{Size: 8})),
		),
		row.New(6).Add(
			col.New(3).Add(text.New("Titik Distribusi / Tipe:", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(9).Add(text.New(fmt.Sprintf("%s (%s) - %s, %s", dp.Name, dp.Type, dp.Address, dp.City), props.Text{Size: 8})),
		),
		row.New(4).Add(col.New(12).Add(text.New("", props.Text{}))),
	)

	// 5. Table Header
	m.AddRows(
		row.New(7).Add(
			col.New(2).Add(text.New("Tgl Kirim", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(3).Add(text.New("No. Surat Jalan", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(3).Add(text.New("Menu Makanan", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(2).Add(text.New("Porsi", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Right})),
			col.New(2).Add(text.New("Status", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
		),
		row.New(4).Add(
			col.New(12).Add(text.New("---------------------------------------------------------------------------------------------------------------------------------------------", props.Text{Size: 6})),
		),
	)

	// 6. Deliveries Rows
	for _, d := range deliveries {
		mealName := "Menu Gizi Seimbang MBG"
		if len(d.Items) > 0 {
			mealName = d.Items[0].MealName
		}
		m.AddRows(
			row.New(6).Add(
				col.New(2).Add(text.New(d.DeliveryDate.Format("02/01/2006"), props.Text{Size: 8})),
				col.New(3).Add(text.New(d.DeliveryNumber, props.Text{Size: 8})),
				col.New(3).Add(text.New(mealName, props.Text{Size: 8})),
				col.New(2).Add(text.New(fmt.Sprintf("%d", d.TotalPortions), props.Text{Size: 8, Align: align.Right})),
				col.New(2).Add(text.New(string(d.Status), props.Text{Size: 7, Align: align.Center})),
			),
		)
	}

	// 7. Totals
	m.AddRows(
		row.New(4).Add(
			col.New(12).Add(text.New("---------------------------------------------------------------------------------------------------------------------------------------------", props.Text{Size: 6})),
		),
		row.New(7).Add(
			col.New(8).Add(text.New("TOTAL PORSI TERSALURKAN & DITERIMA:", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(2).Add(text.New(fmt.Sprintf("%d Porsi", totalPortions), props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Right})),
			col.New(2).Add(text.New("", props.Text{})),
		),
		row.New(7).Add(
			col.New(8).Add(text.New("TOTAL NILAI ALOKASI PROGRAM (Rp):", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(4).Add(text.New(fmt.Sprintf("Rp %.2f", totalAmount), props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Right})),
		),
		row.New(6).Add(col.New(12).Add(text.New("", props.Text{}))),
	)

	// 8. Signatures
	m.AddRows(
		row.New(6).Add(
			col.New(6).Add(text.New("Yang Menyerahkan (Pihak Pertama):", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
			col.New(6).Add(text.New("Yang Menerima (Pihak Kedua):", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
		),
		row.New(18).Add(col.New(12).Add(text.New("", props.Text{}))),
		row.New(6).Add(
			col.New(6).Add(text.New(fmt.Sprintf("( %s )", sppgHeadName), props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
			col.New(6).Add(text.New(fmt.Sprintf("( %s )", recipientRepName), props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
		),
		row.New(5).Add(
			col.New(6).Add(text.New("Kepala Satuan Pelayanan MBG", props.Text{Size: 7, Align: align.Center})),
			col.New(6).Add(text.New(fmt.Sprintf("Perwakilan %s", dp.Name), props.Text{Size: 7, Align: align.Center})),
		),
	)

	document, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to render BAST PDF: %w", err)
	}

	return document.GetBytes(), nil
}

func GenerateSimpleBASTBytes(
	docNumber string,
	dp *models.DistributionPoint,
	periodStart, periodEnd time.Time,
	totalPortions int,
	totalAmount float64,
	sppgHeadName, recipientRepName string,
) []byte {
	buf := new(bytes.Buffer)
	buf.WriteString("%PDF-1.4\n")
	buf.WriteString("1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n")
	buf.WriteString("2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n")
	buf.WriteString("3 0 obj <</Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R>> endobj\n")
	buf.WriteString("4 0 obj <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>> /F2 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>>>>> endobj\n")

	content := fmt.Sprintf(
		"BT\n/F1 14 Tf\n50 780 Td\n(BERITA ACARA SERAH TERIMA - PROGRAM MBG) Tj\n"+
			"/F2 10 Tf\n0 -20 Td\n(Nomor: %s) Tj\n"+
			"0 -25 Td\n(Titik Distribusi: %s - Tipe: %s) Tj\n"+
			"0 -15 Td\n(Periode: %s s/d %s) Tj\n"+
			"0 -15 Td\n(Total Porsi Tersalurkan: %d Porsi) Tj\n"+
			"0 -15 Td\n(Total Nilai Alokasi: Rp %.2f) Tj\n"+
			"0 -30 Td\n(Pihak Pertama: %s | Pihak Kedua: %s) Tj\n"+
			"ET\n",
		docNumber, dp.Name, dp.Type,
		periodStart.Format("2006-01-02"), periodEnd.Format("2006-01-02"),
		totalPortions, totalAmount, sppgHeadName, recipientRepName,
	)

	buf.WriteString(fmt.Sprintf("5 0 obj <</Length %d>> stream\n%sendstream\nendobj\n", len(content), content))
	buf.WriteString("xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000227 00000 n \n0000000344 00000 n \ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n500\n%%EOF\n")
	return buf.Bytes()
}
