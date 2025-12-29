import SwiftUI
import SwiftData

struct TeethingView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query private var allEvents: [TeethingEvent]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedEvent: TeethingEvent?
    @State private var showingToothSelector = false

    var events: [TeethingEvent] {
        guard let selectedId = appState.selectedBabyId else {
            return allEvents.sorted { $0.toothPosition.rawValue < $1.toothPosition.rawValue }
        }
        return allEvents
            .filter { $0.baby?.id == selectedId }
            .sorted { $0.toothPosition.rawValue < $1.toothPosition.rawValue }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var eruptedTeeth: [TeethingEvent] {
        events.filter { $0.isErupted }
    }

    var teethingNow: [TeethingEvent] {
        events.filter { $0.isTeething }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Tooth Chart
                    ToothChartView(events: events) { position in
                        if let existingEvent = events.first(where: { $0.toothPosition == position }) {
                            selectedEvent = existingEvent
                        } else {
                            showingToothSelector = true
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.05), radius: 5)

                    // Stats
                    HStack(spacing: 12) {
                        TeethStatCard(
                            title: "Erupted",
                            value: "\(eruptedTeeth.count)",
                            total: "/ 20",
                            icon: "checkmark.circle.fill",
                            color: .green
                        )

                        TeethStatCard(
                            title: "Teething",
                            value: "\(teethingNow.count)",
                            total: nil,
                            icon: "clock.fill",
                            color: .orange
                        )
                    }

                    // Currently Teething Section
                    if !teethingNow.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Currently Teething")
                                .font(.headline)

                            ForEach(teethingNow) { event in
                                TeethingEventRow(event: event)
                                    .onTapGesture {
                                        selectedEvent = event
                                    }
                            }
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Recent Eruptions
                    if !eruptedTeeth.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Erupted Teeth")
                                .font(.headline)

                            ForEach(eruptedTeeth.sorted { ($0.eruptionDate ?? Date()) > ($1.eruptionDate ?? Date()) }) { event in
                                TeethingEventRow(event: event)
                                    .onTapGesture {
                                        selectedEvent = event
                                    }
                            }
                        }
                    }

                    if events.isEmpty {
                        EmptyTeethingStateView()
                    }
                }
                .padding()
            }
            .navigationTitle("Teething")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingToothSelector = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingToothSelector) {
                ToothSelectorSheet(existingPositions: Set(events.map { $0.toothPosition })) { position in
                    let event = TeethingEvent(toothPosition: position)
                    event.baby = currentBaby
                    modelContext.insert(event)
                    showingToothSelector = false
                    // Find the newly created event and select it
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        if let newEvent = events.first(where: { $0.toothPosition == position }) {
                            selectedEvent = newEvent
                        }
                    }
                }
            }
            .sheet(item: $selectedEvent) { event in
                EditTeethingSheet(event: event)
            }
        }
    }
}

// MARK: - Tooth Chart View

struct ToothChartView: View {
    let events: [TeethingEvent]
    let onToothTap: (ToothPosition) -> Void

    var body: some View {
        VStack(spacing: 24) {
            Text("Tooth Chart")
                .font(.headline)

            // Upper teeth
            VStack(spacing: 4) {
                Text("Upper")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 4) {
                    ForEach([
                        ToothPosition.upperRightSecondMolar,
                        .upperRightFirstMolar,
                        .upperRightCanine,
                        .upperRightLateralIncisor,
                        .upperRightCentralIncisor,
                        .upperLeftCentralIncisor,
                        .upperLeftLateralIncisor,
                        .upperLeftCanine,
                        .upperLeftFirstMolar,
                        .upperLeftSecondMolar
                    ], id: \.rawValue) { position in
                        ToothButton(
                            position: position,
                            event: events.first { $0.toothPosition == position },
                            onTap: { onToothTap(position) }
                        )
                    }
                }
            }

            // Lower teeth
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    ForEach([
                        ToothPosition.lowerRightSecondMolar,
                        .lowerRightFirstMolar,
                        .lowerRightCanine,
                        .lowerRightLateralIncisor,
                        .lowerRightCentralIncisor,
                        .lowerLeftCentralIncisor,
                        .lowerLeftLateralIncisor,
                        .lowerLeftCanine,
                        .lowerLeftFirstMolar,
                        .lowerLeftSecondMolar
                    ], id: \.rawValue) { position in
                        ToothButton(
                            position: position,
                            event: events.first { $0.toothPosition == position },
                            onTap: { onToothTap(position) }
                        )
                    }
                }

                Text("Lower")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Legend
            HStack(spacing: 16) {
                LegendItem(color: .green, label: "Erupted")
                LegendItem(color: .orange, label: "Teething")
                LegendItem(color: .gray.opacity(0.3), label: "Not Started")
            }
            .font(.caption)
        }
    }
}

struct ToothButton: View {
    let position: ToothPosition
    let event: TeethingEvent?
    let onTap: () -> Void

    var toothColor: Color {
        if let event = event {
            if event.isErupted {
                return .green
            } else if event.isTeething {
                return .orange
            }
        }
        return .gray.opacity(0.3)
    }

    var body: some View {
        Button(action: onTap) {
            RoundedRectangle(cornerRadius: 4)
                .fill(toothColor)
                .frame(width: 28, height: position.name.contains("Molar") ? 32 : 28)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.gray.opacity(0.5), lineWidth: 1)
                )
        }
    }
}

struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
            Text(label)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Stat Card

struct TeethStatCard: View {
    let title: String
    let value: String
    let total: String?
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title)
                    .fontWeight(.bold)

                if let total = total {
                    Text(total)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Teething Event Row

struct TeethingEventRow: View {
    let event: TeethingEvent

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(event.isErupted ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: event.isErupted ? "checkmark.circle.fill" : "clock.fill")
                    .font(.title3)
                    .foregroundStyle(event.isErupted ? .green : .orange)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(event.toothPosition.fullName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack(spacing: 8) {
                    if let date = event.isErupted ? event.formattedEruptionDate : event.formattedFirstSignsDate {
                        Text(date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if !event.symptoms.isEmpty {
                        Text("• \(event.symptoms.count) symptoms")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Empty State

struct EmptyTeethingStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "mouth.fill")
                .font(.system(size: 48))
                .foregroundStyle(.purple.opacity(0.6))

            Text("No Teeth Tracked")
                .font(.headline)

            Text("Tap on a tooth in the chart above or tap + to start tracking your baby's teeth.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tooth Selector Sheet

struct ToothSelectorSheet: View {
    @Environment(\.dismiss) private var dismiss

    let existingPositions: Set<ToothPosition>
    let onSelect: (ToothPosition) -> Void

    var availablePositions: [ToothPosition] {
        ToothPosition.allCases.filter { !existingPositions.contains($0) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Upper Teeth") {
                    ForEach(availablePositions.filter { $0.isUpper }, id: \.rawValue) { position in
                        Button {
                            onSelect(position)
                        } label: {
                            HStack {
                                Text(position.fullName)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Text("~\(position.typicalEruptionAge.lowerBound)-\(position.typicalEruptionAge.upperBound) mo")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section("Lower Teeth") {
                    ForEach(availablePositions.filter { $0.isLower }, id: \.rawValue) { position in
                        Button {
                            onSelect(position)
                        } label: {
                            HStack {
                                Text(position.fullName)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Text("~\(position.typicalEruptionAge.lowerBound)-\(position.typicalEruptionAge.upperBound) mo")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Tooth")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Edit Teething Sheet

struct EditTeethingSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var event: TeethingEvent

    @State private var firstSignsDate: Date?
    @State private var eruptionDate: Date?
    @State private var selectedSymptoms: Set<TeethingSymptom> = []
    @State private var remediesUsed = ""
    @State private var notes = ""
    @State private var hasFirstSigns = false
    @State private var hasErupted = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text("Tooth")
                        Spacer()
                        Text(event.toothPosition.fullName)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Typical Age")
                        Spacer()
                        Text("\(event.toothPosition.typicalEruptionAge.lowerBound)-\(event.toothPosition.typicalEruptionAge.upperBound) months")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Timeline") {
                    Toggle("First Signs Noticed", isOn: $hasFirstSigns)

                    if hasFirstSigns {
                        DatePicker(
                            "Date",
                            selection: Binding(
                                get: { firstSignsDate ?? Date() },
                                set: { firstSignsDate = $0 }
                            ),
                            displayedComponents: .date
                        )
                    }

                    Toggle("Tooth Erupted", isOn: $hasErupted)

                    if hasErupted {
                        DatePicker(
                            "Eruption Date",
                            selection: Binding(
                                get: { eruptionDate ?? Date() },
                                set: { eruptionDate = $0 }
                            ),
                            displayedComponents: .date
                        )
                    }
                }

                Section("Symptoms") {
                    ForEach(TeethingSymptom.allCases, id: \.self) { symptom in
                        Button {
                            if selectedSymptoms.contains(symptom) {
                                selectedSymptoms.remove(symptom)
                            } else {
                                selectedSymptoms.insert(symptom)
                            }
                        } label: {
                            HStack {
                                Image(systemName: symptom.icon)
                                    .foregroundStyle(symptom.color)
                                    .frame(width: 24)

                                Text(symptom.rawValue)
                                    .foregroundStyle(.primary)

                                Spacer()

                                if selectedSymptoms.contains(symptom) {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.purple)
                                }
                            }
                        }
                    }
                }

                Section("Remedies Used") {
                    TextField("What helped?", text: $remediesUsed, axis: .vertical)
                        .lineLimit(2...4)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(TeethingRemedies.suggestions, id: \.self) { remedy in
                                Button {
                                    if remediesUsed.isEmpty {
                                        remediesUsed = remedy
                                    } else {
                                        remediesUsed += ", \(remedy)"
                                    }
                                } label: {
                                    Text(remedy)
                                        .font(.caption)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.purple.opacity(0.1))
                                        .foregroundStyle(.purple)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section("Notes") {
                    TextField("Additional notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section {
                    Button(role: .destructive) {
                        modelContext.delete(event)
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Delete Tooth Record")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Edit Tooth")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveChanges()
                    }
                }
            }
            .onAppear {
                loadEventData()
            }
        }
    }

    private func loadEventData() {
        firstSignsDate = event.firstSignsDate
        eruptionDate = event.eruptionDate
        selectedSymptoms = Set(event.symptoms)
        remediesUsed = event.remediesUsed ?? ""
        notes = event.notes ?? ""
        hasFirstSigns = event.firstSignsDate != nil
        hasErupted = event.eruptionDate != nil
    }

    private func saveChanges() {
        event.firstSignsDate = hasFirstSigns ? (firstSignsDate ?? Date()) : nil
        event.eruptionDate = hasErupted ? (eruptionDate ?? Date()) : nil
        event.symptoms = Array(selectedSymptoms)
        event.remediesUsed = remediesUsed.isEmpty ? nil : remediesUsed
        event.notes = notes.isEmpty ? nil : notes
        dismiss()
    }
}

#Preview {
    TeethingView()
        .environmentObject(AppState())
        .modelContainer(for: TeethingEvent.self, inMemory: true)
}
