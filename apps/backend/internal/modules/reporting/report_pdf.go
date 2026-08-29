package reporting

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

type ReportPDFGenerator struct{}

func NewReportPDFGenerator() *ReportPDFGenerator {
	return &ReportPDFGenerator{}
}

func (g *ReportPDFGenerator) GenerateBGNReport(
	reportType models.ReportType,
	reportNumber string,
	periodStart, periodEnd time.Time,
	totalPortions int,
	totalAmount float64,
	entries []models.JournalEntry,
	headName string,
) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(15).
		WithLeftMargin(15).
		WithRightMargin(15).
		WithBottomMargin(15).
		Build()

	m := maroto.New(cfg)

	// Kop
	m.AddRows(
		row.New(10).Add(
			col.New(12).Add(
				text.New("BADAN GIZI NASIONAL - REPUBLIK INDONESIA", props.Text{
					Style: fontstyle.Bold,
					Size:  12,
					Align: align.Center,
				}),
			),
		),
		row.New(8).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("LAPORAN PERTANGGUNGJAWABAN DANA MBG: %s", reportType), props.Text{
					Style: fontstyle.Bold,
					Size:  10,
					Align: align.Center,
				}),
			),
		),
		row.New(6).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("No: %s | Periode: %s s/d %s", reportNumber, periodStart.Format("02/01/2006"), periodEnd.Format("02/01/2006")), props.Text{
					Size:  8,
					Align: align.Center,
				}),
			),
		),
		row.New(6).Add(
			col.New(12).Add(
				text.New("===================================================================================", props.Text{
					Size:  7,
					Align: align.Center,
				}),
			),
		),
	)

	// Summary Cards
	m.AddRows(
		row.New(6).Add(
			col.New(4).Add(text.New("Total Porsi Tersalurkan:", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(8).Add(text.New(fmt.Sprintf("%d Porsi", totalPortions), props.Text{Size: 8})),
		),
		row.New(6).Add(
			col.New(4).Add(text.New("Total Realisasi Anggaran:", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(8).Add(text.New(fmt.Sprintf("Rp %.2f", totalAmount), props.Text{Size: 8})),
		),
		row.New(4).Add(col.New(12).Add(text.New("", props.Text{}))),
	)

	// Table Header
	m.AddRows(
		row.New(7).Add(
			col.New(2).Add(text.New("Tanggal", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(3).Add(text.New("No. Bukti / Jurnal", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(4).Add(text.New("Uraian / Deskripsi", props.Text{Style: fontstyle.Bold, Size: 8})),
			col.New(3).Add(text.New("Jumlah (Rp)", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Right})),
		),
		row.New(4).Add(
			col.New(12).Add(text.New("---------------------------------------------------------------------------------------------------------------------------------------------", props.Text{Size: 6})),
		),
	)

	// Rows
	for _, entry := range entries {
		m.AddRows(
			row.New(6).Add(
				col.New(2).Add(text.New(entry.EntryDate.Format("02/01/2006"), props.Text{Size: 8})),
				col.New(3).Add(text.New(entry.EntryNumber, props.Text{Size: 8})),
				col.New(4).Add(text.New(entry.Description, props.Text{Size: 8})),
				col.New(3).Add(text.New(fmt.Sprintf("Rp %.2f", entry.TotalDebit), props.Text{Size: 8, Align: align.Right})),
			),
		)
	}

	// Signature
	m.AddRows(
		row.New(12).Add(col.New(12).Add(text.New("", props.Text{}))),
		row.New(6).Add(
			col.New(6).Add(text.New("", props.Text{})),
			col.New(6).Add(text.New("Disahkan Oleh:", props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
		),
		row.New(16).Add(col.New(12).Add(text.New("", props.Text{}))),
		row.New(6).Add(
			col.New(6).Add(text.New("", props.Text{})),
			col.New(6).Add(text.New(fmt.Sprintf("( %s )", headName), props.Text{Style: fontstyle.Bold, Size: 8, Align: align.Center})),
		),
		row.New(5).Add(
			col.New(6).Add(text.New("", props.Text{})),
			col.New(6).Add(text.New("Kepala Satuan Pelayanan MBG", props.Text{Size: 7, Align: align.Center})),
		),
	)

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to render report PDF: %w", err)
	}
	return doc.GetBytes(), nil
}

func GenerateSimpleReportBytes(
	reportType models.ReportType,
	reportNumber string,
	periodStart, periodEnd time.Time,
	totalPortions int,
	totalAmount float64,
	headName string,
) []byte {
	buf := new(bytes.Buffer)
	buf.WriteString("%PDF-1.4\n")
	buf.WriteString("1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n")
	buf.WriteString("2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n")
	buf.WriteString("3 0 obj <</Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R>> endobj\n")
	buf.WriteString("4 0 obj <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>> /F2 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>>>>> endobj\n")

	content := fmt.Sprintf(
		"BT\n/F1 14 Tf\n50 780 Td\n(LAPORAN PERTANGGUNGJAWABAN DANA MBG) Tj\n"+
			"/F2 10 Tf\n0 -20 Td\n(Tipe: %s - Nomor: %s) Tj\n"+
			"0 -20 Td\n(Periode: %s s/d %s) Tj\n"+
			"0 -15 Td\n(Total Porsi: %d | Total Realisasi: Rp %.2f) Tj\n"+
			"0 -30 Td\n(Penanggung Jawab: %s - Kepala SPPG) Tj\n"+
			"ET\n",
		reportType, reportNumber,
		periodStart.Format("2006-01-02"), periodEnd.Format("2006-01-02"),
		totalPortions, totalAmount, headName,
	)

	buf.WriteString(fmt.Sprintf("5 0 obj <</Length %d>> stream\n%sendstream\nendobj\n", len(content), content))
	buf.WriteString("xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000227 00000 n \n0000000344 00000 n \ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n500\n%%EOF\n")
	return buf.Bytes()
}
