import SwiftUI
import SwiftData

struct BottleView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \BottleSession.timestamp, order: .reverse) private var allSessions: [BottleSession]
    @Query private var babies: [Baby]
    @StateObject private var viewModel = BottleViewModel()

    @State private var showingAddSheet = false

    // Filter sessions by selected baby
    var sessions: [BottleSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allSessions
        }
        return allSessions.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Quick add button
                Button {
                    showingAddSheet = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                        Text("Log Bottle Feeding")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(
                        LinearGradient(colors: [.purple, .pink], startPoint: .leading, endPoint: .trailing)
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                // Today's stats
                BottleStatsRow(sessions: sessions.filter { $0.isToday })

                // History
                BottleHistorySection(
                    sessions: sessions,
                    onDelete: { session in
                        viewModel.deleteSession(session, modelContext: modelContext)
                    }
                )
            }
            .padding()
        }
        .sheet(isPresented: $showingAddSheet) {
            BottleEntrySheet(
                onSave: { volume, unit, contentType, notes, mood in
                    viewModel.logBottleFeeding(
                        volume: volume,
                        volumeUnit: unit,
                        contentType: contentType,
                        notes: notes,
                        babyMood: mood,
                        modelContext: modelContext,
                        baby: currentBaby
                    )
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
    }
}

struct BottleStatsRow: View {
    let sessions: [BottleSession]

    private var totalVolume: Double {
        sessions.reduce(0) { $0 + $1.volume }
    }

    var body: some View {
        HStack(spacing: 16) {
            StatCard(
                icon: "waterbottle.fill",
                title: "Bottles Today",
                value: "\(sessions.count)",
                color: .purple
            )

            StatCard(
                icon: "drop.fill",
                title: "Total Volume",
                value: String(format: "%.1f oz", totalVolume),
                color: .pink
            )
        }
    }
}

struct BottleHistorySection: View {
    let sessions: [BottleSession]
    let onDelete: (BottleSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            if sessions.isEmpty {
                Text("No bottle feedings yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(sessions) { session in
                        BottleSessionRow(session: session)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    onDelete(session)
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

struct BottleSessionRow: View {
    let session: BottleSession

    var body: some View {
        HStack {
            Image(systemName: session.contentType.icon)
                .font(.title3)
                .foregroundStyle(.purple)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(session.contentType.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text(session.formattedVolume)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.purple.opacity(0.1))
                        .foregroundStyle(.purple)
                        .clipShape(Capsule())

                    if session.isToday {
                        Text("Today")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.pink.opacity(0.1))
                            .foregroundStyle(.pink)
                            .clipShape(Capsule())
                    }
                }

                Text(session.isToday ? session.formattedTime : "\(session.formattedDate) at \(session.formattedTime)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let mood = session.babyMood {
                Image(systemName: mood.icon)
                    .foregroundStyle(mood.color)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct BottleEntrySheet: View {
    let onSave: (Double, VolumeUnit, BottleContentType, String?, BabyMood?) -> Void
    let onCancel: () -> Void

    @State private var volume: String = ""
    @State private var volumeUnit: VolumeUnit = .oz
    @State private var contentType: BottleContentType = .breastMilk
    @State private var notes: String = ""
    @State private var selectedMood: BabyMood?

    var body: some View {
        NavigationStack {
            Form {
                Section("Volume") {
                    HStack {
                        TextField("0.0", text: $volume)
                            .keyboardType(.decimalPad)

                        Picker("Unit", selection: $volumeUnit) {
                            ForEach(VolumeUnit.allCases, id: \.self) { unit in
                                Text(unit.rawValue).tag(unit)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }
                }

                Section("Content Type") {
                    Picker("Type", selection: $contentType) {
                        ForEach(BottleContentType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Baby's Mood") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(BabyMood.allCases, id: \.self) { mood in
                                Button {
                                    selectedMood = selectedMood == mood ? nil : mood
                                } label: {
                                    VStack(spacing: 4) {
                                        Image(systemName: mood.icon)
                                            .font(.title2)
                                        Text(mood.rawValue)
                                            .font(.caption2)
                                    }
                                    .padding(8)
                                    .background(selectedMood == mood ? mood.color.opacity(0.2) : Color.clear)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                .foregroundStyle(selectedMood == mood ? mood.color : .secondary)
                            }
                        }
                    }
                }

                Section("Notes") {
                    TextField("Add notes...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Log Bottle Feeding")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: volume.isEmpty,
                        action: {
                            let vol = Double(volume) ?? 0
                            onSave(vol, volumeUnit, contentType, notes.isEmpty ? nil : notes, selectedMood)
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
    BottleView()
        .modelContainer(for: BottleSession.self, inMemory: true)
}
