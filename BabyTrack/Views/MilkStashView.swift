import SwiftUI
import SwiftData

struct MilkStashView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \MilkStash.pumpedDate, order: .reverse) private var allStashData: [MilkStash]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedLocation: MilkStorageLocation = .fridge
    @State private var showingUseNowAlert = false
    @State private var selectedMilkForUse: MilkStash?

    // Filter stash by selected baby
    var allStash: [MilkStash] {
        guard let selectedId = appState.selectedBabyId else {
            return allStashData
        }
        return allStashData.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var activeStash: [MilkStash] {
        allStash.filter { !$0.isUsed && !$0.isExpired && !$0.isInUse }
    }

    private var inUseStash: [MilkStash] {
        allStash.filter { $0.isInUse && !$0.isUsed }
    }

    private var fridgeStash: [MilkStash] {
        activeStash.filter { $0.location == .fridge }
    }

    private var freezerStash: [MilkStash] {
        activeStash.filter { $0.location == .freezer }
    }

    private var totalFridgeVolume: Double {
        fridgeStash.reduce(0) { $0 + $1.volume }
    }

    private var totalFreezerVolume: Double {
        freezerStash.reduce(0) { $0 + $1.volume }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // In Use section with countdown
                if !inUseStash.isEmpty {
                    InUseMilkSection(
                        items: inUseStash,
                        onMarkUsed: { item in
                            // Just mark as used - bottle was already logged when "Use Now" was clicked
                            item.markAsUsed()
                        },
                        onDiscard: { item in
                            item.markAsUsed()
                        }
                    )
                }

                // Summary cards
                HStack(spacing: 16) {
                    StashSummaryCard(
                        icon: "refrigerator.fill",
                        title: "Fridge",
                        count: fridgeStash.count,
                        volume: totalFridgeVolume,
                        color: .blue
                    )

                    StashSummaryCard(
                        icon: "snowflake",
                        title: "Freezer",
                        count: freezerStash.count,
                        volume: totalFreezerVolume,
                        color: .cyan
                    )
                }

                // Add button
                Button {
                    showingAddSheet = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                        Text("Add to Stash")
                            .font(.title2)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(
                        LinearGradient(
                            colors: [.blue, .cyan],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)
                }

                // Location picker
                Picker("Location", selection: $selectedLocation) {
                    ForEach(MilkStorageLocation.allCases, id: \.self) { loc in
                        Label(loc.rawValue, systemImage: loc.icon).tag(loc)
                    }
                }
                .pickerStyle(.segmented)

                // Stash list
                let stash = selectedLocation == .fridge ? fridgeStash : freezerStash

                if stash.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: selectedLocation.icon)
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No milk in \(selectedLocation.rawValue.lowercased())")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 48)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(stash.sorted { $0.expirationDate < $1.expirationDate }) { item in
                            MilkStashRow(
                                item: item,
                                onUseNow: {
                                    selectedMilkForUse = item
                                    showingUseNowAlert = true
                                },
                                onMarkUsed: { item.markAsUsed() },
                                onDelete: { modelContext.delete(item) }
                            )
                        }
                    }
                }

                // Expiring soon warning
                let expiringSoon = activeStash.filter { $0.isExpiringSoon }
                if !expiringSoon.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Expiring Soon", systemImage: "exclamationmark.triangle.fill")
                            .font(.headline)
                            .foregroundStyle(.orange)

                        ForEach(expiringSoon) { item in
                            HStack {
                                Text(item.formattedVolume)
                                Spacer()
                                Text("Expires \(item.formattedExpirationDate)")
                                    .font(.caption)
                                    .foregroundStyle(.orange)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
        .navigationTitle("Milk Stash")
        .sheet(isPresented: $showingAddSheet) {
            AddMilkStashSheet(
                onSave: { volume, unit, location, pumpedDate, notes in
                    let stash = MilkStash(
                        volume: volume,
                        volumeUnit: unit,
                        location: location,
                        pumpedDate: pumpedDate,
                        notes: notes,
                        baby: currentBaby
                    )
                    modelContext.insert(stash)
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
        .confirmationDialog(
            "Use Milk Now",
            isPresented: $showingUseNowAlert,
            presenting: selectedMilkForUse
        ) { milk in
            Button("Use Now & Log Bottle Feeding") {
                milk.startUsing()
                let bottleSession = BottleSession(
                    volume: milk.volume,
                    volumeUnit: milk.volumeUnit,
                    contentType: .breastMilk,
                    notes: "From milk stash (pumped \(milk.formattedPumpedDate))",
                    baby: currentBaby
                )
                modelContext.insert(bottleSession)
            }
            Button("Use Now Only (Start Timer)") {
                milk.startUsing()
            }
            Button("Cancel", role: .cancel) {
                selectedMilkForUse = nil
            }
        } message: { milk in
            Text("Would you like to log this \(milk.formattedVolume) as a bottle feeding? A 4-hour room temperature timer will start.")
        }
    }
}

struct StashSummaryCard: View {
    let icon: String
    let title: String
    let count: Int
    let volume: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text("\(count) bags")
                .font(.title2)
                .fontWeight(.bold)

            Text(String(format: "%.1f oz total", volume))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct MilkStashRow: View {
    let item: MilkStash
    let onUseNow: () -> Void
    let onMarkUsed: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: item.location.icon)
                    .font(.title3)
                    .foregroundStyle(item.location == .fridge ? .blue : .cyan)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.formattedVolume)
                        .font(.headline)

                    Text("Pumped \(item.formattedPumpedDate)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    if item.isExpiringSoon {
                        Text("Expires soon!")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    } else {
                        Text("\(item.daysUntilExpiration) days left")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Action buttons
            HStack(spacing: 8) {
                Button(action: onUseNow) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                        Text("Use Now")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.orange.opacity(0.15))
                    .foregroundStyle(.orange)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button(action: onMarkUsed) {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Used")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.green.opacity(0.15))
                    .foregroundStyle(.green)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button(action: onDelete) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash.fill")
                        Text("Delete")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.15))
                    .foregroundStyle(.red)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct AddMilkStashSheet: View {
    let onSave: (Double, VolumeUnit, MilkStorageLocation, Date, String?) -> Void
    let onCancel: () -> Void

    @State private var volume: String = ""
    @State private var volumeUnit: VolumeUnit = .oz
    @State private var location: MilkStorageLocation = .fridge
    @State private var pumpedDate: Date = Date()
    @State private var notes: String = ""

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

                Section("Storage") {
                    Picker("Location", selection: $location) {
                        ForEach(MilkStorageLocation.allCases, id: \.self) { loc in
                            Label(loc.rawValue, systemImage: loc.icon).tag(loc)
                        }
                    }
                    .pickerStyle(.segmented)

                    DatePicker("Pumped Date", selection: $pumpedDate, displayedComponents: [.date, .hourAndMinute])
                }

                Section("Notes") {
                    TextField("Optional notes...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Add to Stash")
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
                            onSave(vol, volumeUnit, location, pumpedDate, notes.isEmpty ? nil : notes)
                        },
                        onComplete: onCancel
                    )
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct InUseMilkSection: View {
    let items: [MilkStash]
    let onMarkUsed: (MilkStash) -> Void
    let onDiscard: (MilkStash) -> Void

    @State private var currentTime = Date()
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundStyle(.orange)
                Text("In Use Now")
                    .font(.headline)
            }

            ForEach(items) { item in
                InUseMilkRow(
                    item: item,
                    currentTime: currentTime,
                    onMarkUsed: { onMarkUsed(item) },
                    onDiscard: { onDiscard(item) }
                )
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onReceive(timer) { _ in
            currentTime = Date()
        }
    }
}

struct InUseMilkRow: View {
    let item: MilkStash
    let currentTime: Date
    let onMarkUsed: () -> Void
    let onDiscard: () -> Void

    private var timeRemaining: TimeInterval {
        item.roomTempTimeRemaining ?? 0
    }

    private var isExpired: Bool {
        timeRemaining <= 0
    }

    private var formattedTime: String {
        item.formattedRoomTempTimeRemaining
    }

    private var progressValue: Double {
        let totalSeconds = Double(MilkStash.roomTempExpirationHours * 3600)
        return max(0, min(1, timeRemaining / totalSeconds))
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.formattedVolume)
                        .font(.headline)
                    Text("Pumped \(item.formattedPumpedDate)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    if isExpired {
                        Text("EXPIRED")
                            .font(.headline)
                            .foregroundStyle(.red)
                    } else {
                        Text(formattedTime)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(timeRemaining < 1800 ? .red : (timeRemaining < 3600 ? .orange : .primary))
                        Text("remaining")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(isExpired ? Color.red : (progressValue < 0.25 ? Color.red : (progressValue < 0.5 ? Color.orange : Color.green)))
                        .frame(width: geometry.size.width * progressValue, height: 8)
                }
            }
            .frame(height: 8)

            HStack(spacing: 12) {
                Button(action: onMarkUsed) {
                    Label("Finished", systemImage: "checkmark.circle.fill")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button(action: onDiscard) {
                    Label("Discard", systemImage: "trash.fill")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.red.opacity(0.8))
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        MilkStashView()
    }
    .modelContainer(for: MilkStash.self, inMemory: true)
}
