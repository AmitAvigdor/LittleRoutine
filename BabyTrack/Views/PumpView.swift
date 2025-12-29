import SwiftUI
import SwiftData

struct PumpView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \PumpSession.startTime, order: .reverse) private var allSessions: [PumpSession]
    @Query private var babies: [Baby]
    @StateObject private var viewModel = PumpViewModel()

    @State private var showingVolumeEntry = false
    @State private var showingStorageOptions = false
    @State private var pendingMilkVolume: Double = 0
    @State private var pendingMilkUnit: VolumeUnit = .oz
    @State private var showingNoBabyAlert = false
    @State private var showingUseNowConfirmation = false

    // Filter sessions by selected baby
    var sessions: [PumpSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allSessions
        }
        return allSessions.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var hasBabySelected: Bool {
        currentBaby != nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Timer display
                PumpTimerCard(
                    formattedTime: viewModel.formattedTime,
                    isRunning: viewModel.isTimerRunning,
                    selectedSide: viewModel.selectedSide
                )

                // Side selection
                if !viewModel.isTimerRunning {
                    PumpSideSelector(selectedSide: $viewModel.selectedSide)
                }

                // Timer controls
                PumpTimerControls(
                    isRunning: viewModel.isTimerRunning,
                    isPaused: viewModel.isPaused,
                    onStart: {
                        if hasBabySelected {
                            viewModel.startTimer()
                        } else {
                            showingNoBabyAlert = true
                        }
                    },
                    onPause: { viewModel.pauseTimer() },
                    onResume: { viewModel.resumeTimer() },
                    onStop: { showingVolumeEntry = true },
                    onReset: { viewModel.resetTimer() }
                )

                // Today's stats
                PumpStatsRow(sessions: sessions.filter { $0.isToday })

                // History
                PumpHistorySection(
                    sessions: sessions,
                    onDelete: { session in
                        viewModel.deleteSession(session, modelContext: modelContext)
                    }
                )
            }
            .padding()
        }
        .sheet(isPresented: $showingVolumeEntry) {
            PumpVolumeEntrySheet(
                duration: viewModel.elapsedTime,
                side: viewModel.selectedSide,
                onSave: { volume, unit, notes, mood in
                    viewModel.saveSession(
                        volume: volume,
                        volumeUnit: unit,
                        notes: notes,
                        momMood: mood,
                        modelContext: modelContext,
                        baby: currentBaby
                    )
                    pendingMilkVolume = volume
                    pendingMilkUnit = unit
                    showingVolumeEntry = false
                    // Show storage options after a brief delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        showingStorageOptions = true
                    }
                },
                onCancel: {
                    showingVolumeEntry = false
                    viewModel.resetTimer()
                }
            )
        }
        .sheet(isPresented: $showingStorageOptions) {
            MilkStorageOptionsSheet(
                volume: pendingMilkVolume,
                volumeUnit: pendingMilkUnit,
                onSelect: { option in
                    if option == .useNow {
                        showingStorageOptions = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            showingUseNowConfirmation = true
                        }
                    } else {
                        handleStorageOption(option, logBottle: false)
                        showingStorageOptions = false
                    }
                },
                onSkip: {
                    showingStorageOptions = false
                }
            )
        }
        .alert("No Baby Selected", isPresented: $showingNoBabyAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Please add or select a baby profile before starting a timer.")
        }
        .confirmationDialog(
            "Use Milk Now",
            isPresented: $showingUseNowConfirmation
        ) {
            Button("Use Now & Log Bottle Feeding") {
                handleStorageOption(.useNow, logBottle: true)
            }
            Button("Use Now Only (Start Timer)") {
                handleStorageOption(.useNow, logBottle: false)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Would you like to log this \(String(format: "%.1f %@", pendingMilkVolume, pendingMilkUnit.rawValue)) as a bottle feeding? A 4-hour room temperature timer will start.")
        }
    }

    private func handleStorageOption(_ option: MilkStorageOption, logBottle: Bool) {
        let stash = MilkStash(
            volume: pendingMilkVolume,
            volumeUnit: pendingMilkUnit,
            location: option == .freezer ? .freezer : .fridge,
            pumpedDate: Date(),
            baby: currentBaby,
            isInUse: option == .useNow
        )
        if option == .useNow {
            stash.startUsing()
            if logBottle {
                let bottleSession = BottleSession(
                    volume: pendingMilkVolume,
                    volumeUnit: pendingMilkUnit,
                    contentType: .breastMilk,
                    notes: "From freshly pumped milk",
                    baby: currentBaby
                )
                modelContext.insert(bottleSession)
            }
        }
        modelContext.insert(stash)
    }
}

enum MilkStorageOption {
    case useNow
    case fridge
    case freezer
}

struct MilkStorageOptionsSheet: View {
    let volume: Double
    let volumeUnit: VolumeUnit
    let onSelect: (MilkStorageOption) -> Void
    let onSkip: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.blue)

                    Text("What would you like to do with")
                        .font(.headline)
                    Text(String(format: "%.1f %@", volume, volumeUnit.rawValue))
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.blue)
                    Text("of pumped milk?")
                        .font(.headline)
                }
                .padding(.top, 20)

                VStack(spacing: 12) {
                    // Use Now option
                    Button {
                        onSelect(.useNow)
                    } label: {
                        HStack {
                            Image(systemName: "clock.fill")
                                .font(.title2)
                                .frame(width: 40)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Use Now")
                                    .font(.headline)
                                Text("Start 4-hour room temp timer")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .foregroundStyle(.primary)

                    // Fridge option
                    Button {
                        onSelect(.fridge)
                    } label: {
                        HStack {
                            Image(systemName: "refrigerator.fill")
                                .font(.title2)
                                .frame(width: 40)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Store in Fridge")
                                    .font(.headline)
                                Text("Good for 4 days")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .foregroundStyle(.primary)

                    // Freezer option
                    Button {
                        onSelect(.freezer)
                    } label: {
                        HStack {
                            Image(systemName: "snowflake")
                                .font(.title2)
                                .frame(width: 40)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Store in Freezer")
                                    .font(.headline)
                                Text("Good for 6 months")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(Color.cyan.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .foregroundStyle(.primary)
                }
                .padding(.horizontal)

                Spacer()

                Button("Don't Track Milk") {
                    onSkip()
                }
                .foregroundStyle(.secondary)
                .padding(.bottom)
            }
            .navigationTitle("Store Milk")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Skip", action: onSkip)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct PumpTimerCard: View {
    let formattedTime: String
    let isRunning: Bool
    let selectedSide: PumpSide

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.blue, .cyan],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 6
                    )
                    .frame(width: 160, height: 160)

                VStack(spacing: 8) {
                    Text(formattedTime)
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .monospacedDigit()

                    if isRunning {
                        Text(selectedSide.rawValue)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical)
    }
}

struct PumpSideSelector: View {
    @Binding var selectedSide: PumpSide

    var body: some View {
        HStack(spacing: 12) {
            ForEach(PumpSide.allCases, id: \.self) { side in
                Button {
                    selectedSide = side
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: side.icon)
                            .font(.title2)
                        Text(side.rawValue)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(selectedSide == side ? Color.blue : Color(.systemBackground))
                    )
                    .foregroundStyle(selectedSide == side ? .white : .blue)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.blue, lineWidth: 1)
                    )
                }
            }
        }
    }
}

struct PumpTimerControls: View {
    let isRunning: Bool
    let isPaused: Bool
    let onStart: () -> Void
    let onPause: () -> Void
    let onResume: () -> Void
    let onStop: () -> Void
    let onReset: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            if !isRunning {
                Button(action: onStart) {
                    Label("Start", systemImage: "play.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(colors: [.blue, .cyan], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            } else {
                if isPaused {
                    Button(action: onResume) {
                        Label("Resume", systemImage: "play.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.green)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                } else {
                    Button(action: onPause) {
                        Label("Pause", systemImage: "pause.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.orange)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }

                Button(action: onStop) {
                    Label("Done", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                Button(action: onReset) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .padding(16)
                        .background(Color.red.opacity(0.1))
                        .foregroundStyle(.red)
                        .clipShape(Circle())
                }
            }
        }
    }
}

struct PumpStatsRow: View {
    let sessions: [PumpSession]

    private var totalVolume: Double {
        sessions.reduce(0) { $0 + $1.volume }
    }

    private var totalDuration: TimeInterval {
        sessions.reduce(0) { $0 + $1.duration }
    }

    var body: some View {
        HStack(spacing: 16) {
            StatCard(
                icon: "number.circle.fill",
                title: "Sessions Today",
                value: "\(sessions.count)",
                color: .blue
            )

            StatCard(
                icon: "drop.fill",
                title: "Total Volume",
                value: String(format: "%.1f oz", totalVolume),
                color: .cyan
            )
        }
    }
}

struct PumpHistorySection: View {
    let sessions: [PumpSession]
    let onDelete: (PumpSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            if sessions.isEmpty {
                Text("No pump sessions yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(sessions) { session in
                        PumpSessionRow(session: session)
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

struct PumpSessionRow: View {
    let session: PumpSession

    var body: some View {
        HStack {
            Image(systemName: session.side.icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(session.side.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text(session.formattedVolume)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .foregroundStyle(.blue)
                        .clipShape(Capsule())
                }

                Text(session.isToday ? session.formattedTime : "\(session.formattedDate) at \(session.formattedTime)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(session.formattedDuration)
                .font(.headline)
                .monospacedDigit()
                .foregroundStyle(.blue)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct PumpVolumeEntrySheet: View {
    let duration: TimeInterval
    let side: PumpSide
    let onSave: (Double, VolumeUnit, String?, MomMood?) -> Void
    let onCancel: () -> Void

    @State private var volume: String = ""
    @State private var volumeUnit: VolumeUnit = .oz
    @State private var notes: String = ""
    @State private var selectedMood: MomMood?

    var body: some View {
        NavigationStack {
            Form {
                Section("Session Details") {
                    LabeledContent("Duration", value: formatDuration(duration))
                    LabeledContent("Side", value: side.rawValue)
                }

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

                Section("How are you feeling?") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(MomMood.allCases, id: \.self) { mood in
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
            .navigationTitle("Log Pump Session")
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
                            onSave(vol, volumeUnit, notes.isEmpty ? nil : notes, selectedMood)
                        },
                        onComplete: onCancel
                    )
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

#Preview {
    PumpView()
        .modelContainer(for: PumpSession.self, inMemory: true)
}
