import SwiftUI
import SwiftData
import PDFKit

struct PDFExportView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var feedingSessions: [FeedingSession]
    @Query private var diaperChanges: [DiaperChange]
    @Query private var sleepSessions: [SleepSession]
    @Query private var growthEntries: [GrowthEntry]
    @Query private var settings: [AppSettings]

    @State private var startDate: Date = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var endDate: Date = Date()
    @State private var includeFeeding = true
    @State private var includeDiaper = true
    @State private var includeSleep = true
    @State private var includeGrowth = true
    @State private var isGenerating = false
    @State private var generatedPDF: Data?
    @State private var showingShareSheet = false

    var body: some View {
        Form {
            Section("Date Range") {
                DatePicker("From", selection: $startDate, displayedComponents: .date)
                DatePicker("To", selection: $endDate, displayedComponents: .date)
            }

            Section("Include") {
                Toggle("Feeding Sessions", isOn: $includeFeeding)
                Toggle("Diaper Changes", isOn: $includeDiaper)
                Toggle("Sleep Sessions", isOn: $includeSleep)
                Toggle("Growth Data", isOn: $includeGrowth)
            }

            Section("Preview") {
                VStack(alignment: .leading, spacing: 8) {
                    ReportPreviewRow(
                        title: "Feeding",
                        count: filteredFeedings.count,
                        included: includeFeeding
                    )
                    ReportPreviewRow(
                        title: "Diapers",
                        count: filteredDiapers.count,
                        included: includeDiaper
                    )
                    ReportPreviewRow(
                        title: "Sleep",
                        count: filteredSleep.count,
                        included: includeSleep
                    )
                    ReportPreviewRow(
                        title: "Growth",
                        count: filteredGrowth.count,
                        included: includeGrowth
                    )
                }
            }

            Section {
                Button {
                    generatePDF()
                } label: {
                    HStack {
                        if isGenerating {
                            ProgressView()
                                .padding(.trailing, 8)
                        }
                        Text(isGenerating ? "Generating..." : "Generate PDF Report")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(isGenerating)
            }

            if generatedPDF != nil {
                Section {
                    Button {
                        showingShareSheet = true
                    } label: {
                        Label("Share Report", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .navigationTitle("Export Report")
        .sheet(isPresented: $showingShareSheet) {
            if let pdfData = generatedPDF {
                ShareSheet(items: [pdfData])
            }
        }
    }

    private var filteredFeedings: [FeedingSession] {
        feedingSessions.filter { $0.date >= startDate && $0.date <= endDate }
    }

    private var filteredDiapers: [DiaperChange] {
        diaperChanges.filter { $0.date >= startDate && $0.date <= endDate }
    }

    private var filteredSleep: [SleepSession] {
        sleepSessions.filter { $0.date >= startDate && $0.date <= endDate }
    }

    private var filteredGrowth: [GrowthEntry] {
        growthEntries.filter { $0.date >= startDate && $0.date <= endDate }
    }

    private func generatePDF() {
        isGenerating = true

        DispatchQueue.global(qos: .userInitiated).async {
            let pdfData = PDFGenerator.generate(
                babyName: settings.first?.babyName ?? "Baby",
                startDate: startDate,
                endDate: endDate,
                feedings: includeFeeding ? filteredFeedings : [],
                diapers: includeDiaper ? filteredDiapers : [],
                sleeps: includeSleep ? filteredSleep : [],
                growth: includeGrowth ? filteredGrowth : []
            )

            DispatchQueue.main.async {
                self.generatedPDF = pdfData
                self.isGenerating = false
            }
        }
    }
}

struct ReportPreviewRow: View {
    let title: String
    let count: Int
    let included: Bool

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Text("\(count) entries")
                .foregroundStyle(included ? .primary : .secondary)
            Image(systemName: included ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(included ? .green : .gray)
        }
    }
}

// MARK: - PDF Generator

class PDFGenerator {
    static func generate(
        babyName: String,
        startDate: Date,
        endDate: Date,
        feedings: [FeedingSession],
        diapers: [DiaperChange],
        sleeps: [SleepSession],
        growth: [GrowthEntry]
    ) -> Data {
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 50

        let pdfMetaData = [
            kCGPDFContextCreator: "LittleRoutine",
            kCGPDFContextTitle: "\(babyName) - Care Report"
        ]

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]

        let renderer = UIGraphicsPDFRenderer(
            bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight),
            format: format
        )

        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium

        let data = renderer.pdfData { context in
            context.beginPage()

            var yPosition: CGFloat = margin

            // Title
            let titleFont = UIFont.boldSystemFont(ofSize: 24)
            let title = "\(babyName)'s Care Report"
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: titleFont,
                .foregroundColor: UIColor.purple
            ]
            title.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: titleAttributes)
            yPosition += 40

            // Date range
            let subtitleFont = UIFont.systemFont(ofSize: 14)
            let subtitle = "\(dateFormatter.string(from: startDate)) - \(dateFormatter.string(from: endDate))"
            let subtitleAttributes: [NSAttributedString.Key: Any] = [
                .font: subtitleFont,
                .foregroundColor: UIColor.gray
            ]
            subtitle.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: subtitleAttributes)
            yPosition += 40

            // Feeding Summary
            if !feedings.isEmpty {
                yPosition = drawSection(
                    context: context,
                    title: "Feeding Summary",
                    yPosition: yPosition,
                    pageWidth: pageWidth,
                    margin: margin
                )

                let totalFeedings = feedings.count
                let totalDuration = feedings.reduce(0) { $0 + $1.duration }
                let avgDuration = totalDuration / Double(totalFeedings)
                let leftCount = feedings.filter { $0.breastSide == .left }.count
                let rightCount = feedings.filter { $0.breastSide == .right }.count

                let summaryText = """
                Total Sessions: \(totalFeedings)
                Total Time: \(formatDuration(totalDuration))
                Average Session: \(formatDuration(avgDuration))
                Left Breast: \(leftCount) | Right Breast: \(rightCount)
                """

                yPosition = drawText(summaryText, at: yPosition, margin: margin, pageWidth: pageWidth)
                yPosition += 20
            }

            // Diaper Summary
            if !diapers.isEmpty {
                yPosition = drawSection(
                    context: context,
                    title: "Diaper Summary",
                    yPosition: yPosition,
                    pageWidth: pageWidth,
                    margin: margin
                )

                let wetCount = diapers.filter { $0.type == .wet || $0.type == .both }.count
                let dirtyCount = diapers.filter { $0.type == .dirty || $0.type == .both }.count

                let summaryText = """
                Total Changes: \(diapers.count)
                Wet: \(wetCount) | Dirty: \(dirtyCount)
                """

                yPosition = drawText(summaryText, at: yPosition, margin: margin, pageWidth: pageWidth)
                yPosition += 20
            }

            // Sleep Summary
            if !sleeps.isEmpty {
                yPosition = drawSection(
                    context: context,
                    title: "Sleep Summary",
                    yPosition: yPosition,
                    pageWidth: pageWidth,
                    margin: margin
                )

                let totalSleep = sleeps.reduce(0) { $0 + $1.duration }
                let napCount = sleeps.filter { $0.type == .nap }.count
                let nightCount = sleeps.filter { $0.type == .night }.count

                let summaryText = """
                Total Sleep: \(formatDuration(totalSleep))
                Naps: \(napCount) | Night Sleep: \(nightCount)
                """

                yPosition = drawText(summaryText, at: yPosition, margin: margin, pageWidth: pageWidth)
                yPosition += 20
            }

            // Growth Summary
            if !growth.isEmpty {
                yPosition = drawSection(
                    context: context,
                    title: "Growth Data",
                    yPosition: yPosition,
                    pageWidth: pageWidth,
                    margin: margin
                )

                for entry in growth.prefix(5) {
                    var entryText = dateFormatter.string(from: entry.date) + ": "
                    if let weight = entry.formattedWeight {
                        entryText += "Weight: \(weight) "
                    }
                    if let height = entry.formattedHeight {
                        entryText += "Height: \(height) "
                    }
                    yPosition = drawText(entryText, at: yPosition, margin: margin, pageWidth: pageWidth)
                }
            }

            // Footer
            let footerFont = UIFont.systemFont(ofSize: 10)
            let footer = "Generated by LittleRoutine on \(dateFormatter.string(from: Date()))"
            let footerAttributes: [NSAttributedString.Key: Any] = [
                .font: footerFont,
                .foregroundColor: UIColor.gray
            ]
            footer.draw(at: CGPoint(x: margin, y: pageHeight - margin), withAttributes: footerAttributes)
        }

        return data
    }

    private static func drawSection(
        context: UIGraphicsPDFRendererContext,
        title: String,
        yPosition: CGFloat,
        pageWidth: CGFloat,
        margin: CGFloat
    ) -> CGFloat {
        let sectionFont = UIFont.boldSystemFont(ofSize: 16)
        let sectionAttributes: [NSAttributedString.Key: Any] = [
            .font: sectionFont,
            .foregroundColor: UIColor.purple
        ]
        title.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: sectionAttributes)

        let lineY = yPosition + 25
        context.cgContext.setStrokeColor(UIColor.purple.cgColor)
        context.cgContext.setLineWidth(1)
        context.cgContext.move(to: CGPoint(x: margin, y: lineY))
        context.cgContext.addLine(to: CGPoint(x: pageWidth - margin, y: lineY))
        context.cgContext.strokePath()

        return yPosition + 35
    }

    private static func drawText(_ text: String, at yPosition: CGFloat, margin: CGFloat, pageWidth: CGFloat) -> CGFloat {
        let textFont = UIFont.systemFont(ofSize: 12)
        let textAttributes: [NSAttributedString.Key: Any] = [
            .font: textFont,
            .foregroundColor: UIColor.black
        ]

        let lines = text.components(separatedBy: "\n")
        var currentY = yPosition

        for line in lines {
            line.draw(at: CGPoint(x: margin, y: currentY), withAttributes: textAttributes)
            currentY += 18
        }

        return currentY
    }

    private static func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationStack {
        PDFExportView()
    }
    .modelContainer(for: [FeedingSession.self, DiaperChange.self, SleepSession.self, GrowthEntry.self], inMemory: true)
}
