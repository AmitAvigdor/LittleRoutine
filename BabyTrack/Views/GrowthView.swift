import SwiftUI
import SwiftData
import Charts

struct GrowthView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \GrowthEntry.date, order: .reverse) private var allEntries: [GrowthEntry]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false

    // Filter entries by selected baby
    var entries: [GrowthEntry] {
        guard let selectedId = appState.selectedBabyId else {
            return allEntries
        }
        return allEntries.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Latest measurements
                if let latest = entries.first {
                    LatestMeasurementsCard(entry: latest)
                }

                // Add button
                Button {
                    showingAddSheet = true
                } label: {
                    Label("Add Measurement", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(colors: [.purple, .pink], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Weight chart
                if entries.count > 1 {
                    GrowthChartSection(entries: entries)
                }

                // History
                GrowthHistorySection(
                    entries: entries,
                    onDelete: { entry in
                        modelContext.delete(entry)
                    }
                )
            }
            .padding()
        }
        .navigationTitle("Growth Tracking")
        .sheet(isPresented: $showingAddSheet) {
            AddGrowthEntrySheet(
                onSave: { weight, weightUnit, height, heightUnit, headCirc, headUnit, notes in
                    let entry = GrowthEntry(
                        weight: weight,
                        weightUnit: weightUnit,
                        height: height,
                        heightUnit: heightUnit,
                        headCircumference: headCirc,
                        headCircumferenceUnit: headUnit,
                        notes: notes,
                        baby: currentBaby
                    )
                    modelContext.insert(entry)
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
    }
}

struct LatestMeasurementsCard: View {
    let entry: GrowthEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Latest Measurements")
                    .font(.headline)
                Spacer()
                Text(entry.formattedDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 16) {
                if let weight = entry.formattedWeight {
                    MeasurementCard(
                        icon: "scalemass.fill",
                        title: "Weight",
                        value: weight,
                        color: .blue
                    )
                }

                if let height = entry.formattedHeight {
                    MeasurementCard(
                        icon: "ruler.fill",
                        title: "Height",
                        value: height,
                        color: .green
                    )
                }

                if let head = entry.formattedHeadCircumference {
                    MeasurementCard(
                        icon: "circle.dashed",
                        title: "Head",
                        value: head,
                        color: .orange
                    )
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct MeasurementCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)

            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct GrowthChartSection: View {
    let entries: [GrowthEntry]

    private var weightData: [(Date, Double)] {
        entries.compactMap { entry in
            guard let weight = entry.weight else { return nil }
            return (entry.date, weight)
        }.reversed()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weight Over Time")
                .font(.headline)

            if #available(iOS 17.0, *) {
                Chart {
                    ForEach(weightData, id: \.0) { date, weight in
                        LineMark(
                            x: .value("Date", date),
                            y: .value("Weight", weight)
                        )
                        .foregroundStyle(.purple)

                        PointMark(
                            x: .value("Date", date),
                            y: .value("Weight", weight)
                        )
                        .foregroundStyle(.purple)
                    }
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .automatic) { _ in
                        AxisGridLine()
                        AxisValueLabel(format: .dateTime.month().day())
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}

struct GrowthHistorySection: View {
    let entries: [GrowthEntry]
    let onDelete: (GrowthEntry) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)

            if entries.isEmpty {
                Text("No growth entries yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(entries) { entry in
                        GrowthEntryRow(entry: entry)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    onDelete(entry)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
    }
}

struct GrowthEntryRow: View {
    let entry: GrowthEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(entry.formattedDate)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
            }

            HStack(spacing: 16) {
                if let weight = entry.formattedWeight {
                    Label(weight, systemImage: "scalemass.fill")
                        .font(.caption)
                        .foregroundStyle(.blue)
                }

                if let height = entry.formattedHeight {
                    Label(height, systemImage: "ruler.fill")
                        .font(.caption)
                        .foregroundStyle(.green)
                }

                if let head = entry.formattedHeadCircumference {
                    Label(head, systemImage: "circle.dashed")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            if let notes = entry.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct AddGrowthEntrySheet: View {
    let onSave: (Double?, WeightUnit, Double?, LengthUnit, Double?, LengthUnit, String?) -> Void
    let onCancel: () -> Void

    @State private var weight: String = ""
    @State private var weightUnit: WeightUnit = .lbs
    @State private var height: String = ""
    @State private var heightUnit: LengthUnit = .inches
    @State private var headCirc: String = ""
    @State private var headUnit: LengthUnit = .inches
    @State private var notes: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Weight") {
                    HStack {
                        TextField("Optional", text: $weight)
                            .keyboardType(.decimalPad)

                        Picker("Unit", selection: $weightUnit) {
                            ForEach(WeightUnit.allCases, id: \.self) { unit in
                                Text(unit.rawValue).tag(unit)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }
                }

                Section("Height/Length") {
                    HStack {
                        TextField("Optional", text: $height)
                            .keyboardType(.decimalPad)

                        Picker("Unit", selection: $heightUnit) {
                            ForEach(LengthUnit.allCases, id: \.self) { unit in
                                Text(unit.rawValue).tag(unit)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }
                }

                Section("Head Circumference") {
                    HStack {
                        TextField("Optional", text: $headCirc)
                            .keyboardType(.decimalPad)

                        Picker("Unit", selection: $headUnit) {
                            ForEach(LengthUnit.allCases, id: \.self) { unit in
                                Text(unit.rawValue).tag(unit)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }
                }

                Section("Notes") {
                    TextField("Optional notes...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Add Measurement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: weight.isEmpty && height.isEmpty && headCirc.isEmpty,
                        action: {
                            let w = Double(weight)
                            let h = Double(height)
                            let hc = Double(headCirc)
                            onSave(w, weightUnit, h, heightUnit, hc, headUnit, notes.isEmpty ? nil : notes)
                        },
                        onComplete: onCancel
                    )
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    NavigationStack {
        GrowthView()
    }
    .modelContainer(for: GrowthEntry.self, inMemory: true)
}
