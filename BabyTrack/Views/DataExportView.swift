import SwiftUI
import SwiftData

struct DataExportView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState

    @Query private var babies: [Baby]
    @Query(sort: \FeedingSession.date, order: .reverse) private var allFeedingSessions: [FeedingSession]
    @Query(sort: \BottleSession.date, order: .reverse) private var allBottleSessions: [BottleSession]
    @Query(sort: \PumpSession.date, order: .reverse) private var allPumpSessions: [PumpSession]
    @Query(sort: \SleepSession.startTime, order: .reverse) private var allSleepSessions: [SleepSession]
    @Query(sort: \DiaperChange.date, order: .reverse) private var allDiaperChanges: [DiaperChange]
    @Query(sort: \GrowthEntry.date, order: .reverse) private var allGrowthEntries: [GrowthEntry]
    @Query(sort: \Vaccination.scheduledDate, order: .reverse) private var allVaccinations: [Vaccination]
    @Query(sort: \SolidFood.date, order: .reverse) private var allSolidFoods: [SolidFood]
    @Query private var allTeethingEvents: [TeethingEvent]

    @State private var selectedFormat: ExportFormat = .json
    @State private var dateRange: DateRangeOption = .all
    @State private var customStartDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @State private var customEndDate = Date()
    @State private var isExporting = false
    @State private var showingShareSheet = false
    @State private var exportURL: URL?
    @State private var showingError = false
    @State private var errorMessage = ""

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    // Filtered data based on selected baby
    var feedingSessions: [FeedingSession] {
        filterByBabyAndDate(allFeedingSessions) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var bottleSessions: [BottleSession] {
        filterByBabyAndDate(allBottleSessions) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var pumpSessions: [PumpSession] {
        filterByBabyAndDate(allPumpSessions) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var sleepSessions: [SleepSession] {
        filterByBabyAndDate(allSleepSessions) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.startTime) }
    }

    var diaperChanges: [DiaperChange] {
        filterByBabyAndDate(allDiaperChanges) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var growthEntries: [GrowthEntry] {
        filterByBabyAndDate(allGrowthEntries) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var vaccinations: [Vaccination] {
        filterByBabyAndDate(allVaccinations) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.scheduledDate) }
    }

    var solidFoods: [SolidFood] {
        filterByBabyAndDate(allSolidFoods) { $0.baby?.id == appState.selectedBabyId && isInDateRange($0.date) }
    }

    var teethingEvents: [TeethingEvent] {
        guard let selectedId = appState.selectedBabyId else { return [] }
        return allTeethingEvents.filter { $0.baby?.id == selectedId }
    }

    var totalRecords: Int {
        feedingSessions.count +
        bottleSessions.count +
        pumpSessions.count +
        sleepSessions.count +
        diaperChanges.count +
        growthEntries.count +
        vaccinations.count +
        solidFoods.count +
        teethingEvents.count
    }

    var body: some View {
        Form {
            Section {
                if let baby = currentBaby {
                    HStack {
                        Circle()
                            .fill(baby.displayColor)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Text(baby.initials)
                                    .font(.caption)
                                    .foregroundStyle(.white)
                            )

                        Text(baby.name)
                            .font(.headline)
                    }
                } else {
                    Text("No baby selected")
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Exporting Data For")
            }

            Section("Export Format") {
                Picker("Format", selection: $selectedFormat) {
                    ForEach(ExportFormat.allCases, id: \.self) { format in
                        Text(format.rawValue).tag(format)
                    }
                }
                .pickerStyle(.segmented)

                HStack {
                    Image(systemName: selectedFormat == .json ? "doc.text" : "tablecells")
                        .foregroundStyle(.purple)
                    VStack(alignment: .leading) {
                        Text(selectedFormat == .json ? "JSON Format" : "CSV Format")
                            .font(.subheadline)
                        Text(selectedFormat == .json
                             ? "Best for backup and restoration"
                             : "Best for spreadsheets and analysis")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Date Range") {
                Picker("Range", selection: $dateRange) {
                    ForEach(DateRangeOption.allCases, id: \.self) { option in
                        Text(option.displayName).tag(option)
                    }
                }

                if dateRange == .custom {
                    DatePicker("From", selection: $customStartDate, displayedComponents: .date)
                    DatePicker("To", selection: $customEndDate, displayedComponents: .date)
                }
            }

            Section("Data Summary") {
                DataCountRow(label: "Breastfeeding Sessions", count: feedingSessions.count)
                DataCountRow(label: "Bottle Sessions", count: bottleSessions.count)
                DataCountRow(label: "Pump Sessions", count: pumpSessions.count)
                DataCountRow(label: "Sleep Sessions", count: sleepSessions.count)
                DataCountRow(label: "Diaper Changes", count: diaperChanges.count)
                DataCountRow(label: "Growth Entries", count: growthEntries.count)
                DataCountRow(label: "Vaccinations", count: vaccinations.count)
                DataCountRow(label: "Solid Foods", count: solidFoods.count)
                DataCountRow(label: "Teething Events", count: teethingEvents.count)

                HStack {
                    Text("Total Records")
                        .fontWeight(.semibold)
                    Spacer()
                    Text("\(totalRecords)")
                        .fontWeight(.semibold)
                        .foregroundStyle(.purple)
                }
            }

            Section {
                Button {
                    exportData()
                } label: {
                    HStack {
                        Spacer()
                        if isExporting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else {
                            Label("Export Data", systemImage: "square.and.arrow.up")
                        }
                        Spacer()
                    }
                }
                .disabled(isExporting || totalRecords == 0)
            }
        }
        .navigationTitle("Export Data")
        .sheet(isPresented: $showingShareSheet) {
            if let url = exportURL {
                ShareSheet(items: [url])
            }
        }
        .alert("Export Error", isPresented: $showingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private func filterByBabyAndDate<T>(_ items: [T], predicate: (T) -> Bool) -> [T] {
        guard appState.selectedBabyId != nil else { return [] }
        return items.filter(predicate)
    }

    private func isInDateRange(_ date: Date) -> Bool {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)

        switch dateRange {
        case .all:
            return true
        case .lastWeek:
            let weekAgo = calendar.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return startOfDay >= calendar.startOfDay(for: weekAgo)
        case .lastMonth:
            let monthAgo = calendar.date(byAdding: .month, value: -1, to: Date()) ?? Date()
            return startOfDay >= calendar.startOfDay(for: monthAgo)
        case .last3Months:
            let threeMonthsAgo = calendar.date(byAdding: .month, value: -3, to: Date()) ?? Date()
            return startOfDay >= calendar.startOfDay(for: threeMonthsAgo)
        case .custom:
            return startOfDay >= calendar.startOfDay(for: customStartDate) &&
                   startOfDay <= calendar.startOfDay(for: customEndDate)
        }
    }

    private func exportData() {
        isExporting = true

        Task {
            do {
                let data: Data

                switch selectedFormat {
                case .json:
                    data = try DataExporter.shared.exportToJSON(
                        baby: currentBaby,
                        feedingSessions: feedingSessions,
                        bottleSessions: bottleSessions,
                        pumpSessions: pumpSessions,
                        sleepSessions: sleepSessions,
                        diaperChanges: diaperChanges,
                        growthEntries: growthEntries,
                        vaccinations: vaccinations,
                        solidFoods: solidFoods,
                        teethingEvents: teethingEvents
                    )

                case .csv:
                    let csvString = DataExporter.shared.exportToCSV(
                        baby: currentBaby,
                        feedingSessions: feedingSessions,
                        bottleSessions: bottleSessions,
                        pumpSessions: pumpSessions,
                        sleepSessions: sleepSessions,
                        diaperChanges: diaperChanges,
                        growthEntries: growthEntries,
                        vaccinations: vaccinations,
                        solidFoods: solidFoods,
                        teethingEvents: teethingEvents
                    )
                    data = csvString.data(using: .utf8) ?? Data()
                }

                let url = try DataExporter.shared.createExportFile(
                    data: data,
                    format: selectedFormat,
                    babyName: currentBaby?.name
                )

                await MainActor.run {
                    exportURL = url
                    isExporting = false
                    showingShareSheet = true
                }
            } catch {
                await MainActor.run {
                    isExporting = false
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }
        }
    }
}

// MARK: - Supporting Types

enum DateRangeOption: String, CaseIterable {
    case all = "all"
    case lastWeek = "lastWeek"
    case lastMonth = "lastMonth"
    case last3Months = "last3Months"
    case custom = "custom"

    var displayName: String {
        switch self {
        case .all: return "All Time"
        case .lastWeek: return "Last 7 Days"
        case .lastMonth: return "Last Month"
        case .last3Months: return "Last 3 Months"
        case .custom: return "Custom Range"
        }
    }
}

struct DataCountRow: View {
    let label: String
    let count: Int

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text("\(count)")
                .foregroundStyle(count > 0 ? .primary : .tertiary)
        }
    }
}

#Preview {
    NavigationStack {
        DataExportView()
            .environmentObject(AppState())
            .modelContainer(for: Baby.self, inMemory: true)
    }
}
