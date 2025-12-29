import SwiftUI
import SwiftData

struct DiaperView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \DiaperChange.timestamp, order: .reverse) private var allChanges: [DiaperChange]
    @Query private var babies: [Baby]
    @StateObject private var viewModel = DiaperViewModel()

    @State private var showingConfirmation = false
    @State private var lastLoggedType: DiaperType?
    @State private var showingNoBabyAlert = false

    // Filter changes by selected baby
    var changes: [DiaperChange] {
        guard let selectedId = appState.selectedBabyId else {
            return allChanges
        }
        return allChanges.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var hasBabySelected: Bool {
        currentBaby != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Last change info
                    if let timeSince = viewModel.getTimeSinceLastChange(changes: changes) {
                        LastChangeCard(timeSince: timeSince, lastType: changes.first?.type)
                    }

                    // Quick log buttons
                    QuickLogSection(
                        onLog: { type in
                            if hasBabySelected {
                                viewModel.logDiaperChange(type: type, modelContext: modelContext, baby: currentBaby)
                                lastLoggedType = type
                                showingConfirmation = true

                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    showingConfirmation = false
                                }
                            } else {
                                showingNoBabyAlert = true
                            }
                        }
                    )

                    // Confirmation toast
                    if showingConfirmation, let type = lastLoggedType {
                        LogConfirmationBanner(type: type)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // Today's summary
                    DiaperSummaryCard(
                        totalCount: viewModel.getTodaysCount(changes: changes),
                        wetCount: viewModel.getWetCount(changes: changes),
                        dirtyCount: viewModel.getDirtyCount(changes: changes)
                    )

                    // History
                    DiaperHistorySection(
                        changes: changes,
                        onDelete: { change in
                            viewModel.deleteChange(change, modelContext: modelContext)
                        }
                    )
                }
                .padding()
                .animation(.spring(response: 0.3), value: showingConfirmation)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Diaper")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    BabySwitcher()
                }
            }
            .alert("No Baby Selected", isPresented: $showingNoBabyAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Please add or select a baby profile before logging a diaper change.")
            }
        }
    }
}

struct LastChangeCard: View {
    let timeSince: String
    let lastType: DiaperType?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Last change")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    if let type = lastType {
                        Image(systemName: type.icon)
                            .foregroundStyle(colorForType(type))
                    }

                    Text(timeSince)
                        .font(.headline)
                }
            }

            Spacer()

            Image(systemName: "clock")
                .font(.title2)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private func colorForType(_ type: DiaperType) -> Color {
        switch type {
        case .wet: return .blue
        case .dirty: return .brown
        case .both: return .orange
        }
    }
}

struct QuickLogSection: View {
    let onLog: (DiaperType) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Quick Log")
                .font(.headline)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                ForEach(DiaperType.allCases, id: \.self) { type in
                    Button {
                        onLog(type)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: type.icon)
                                .font(.title)

                            Text(type.rawValue)
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(backgroundForType(type))
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
            }
        }
    }

    private func backgroundForType(_ type: DiaperType) -> some ShapeStyle {
        switch type {
        case .wet:
            return LinearGradient(
                colors: [.blue, .cyan],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .dirty:
            return LinearGradient(
                colors: [.brown, .orange.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .both:
            return LinearGradient(
                colors: [.orange, .yellow],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

struct LogConfirmationBanner: View {
    let type: DiaperType

    var body: some View {
        HStack {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)

            Text("\(type.rawValue) diaper logged!")
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.green.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct DiaperSummaryCard: View {
    let totalCount: Int
    let wetCount: Int
    let dirtyCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Today's Diapers")
                .font(.headline)

            HStack(spacing: 16) {
                DiaperStatItem(
                    icon: "number.circle.fill",
                    value: "\(totalCount)",
                    label: "Total",
                    color: .green
                )

                DiaperStatItem(
                    icon: "drop.fill",
                    value: "\(wetCount)",
                    label: "Wet",
                    color: .blue
                )

                DiaperStatItem(
                    icon: "leaf.fill",
                    value: "\(dirtyCount)",
                    label: "Dirty",
                    color: .brown
                )
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct DiaperStatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct DiaperHistorySection: View {
    let changes: [DiaperChange]
    let onDelete: (DiaperChange) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            if changes.isEmpty {
                Text("No diaper changes logged yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(changes) { change in
                        DiaperChangeRow(change: change)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    onDelete(change)
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

struct DiaperChangeRow: View {
    let change: DiaperChange

    var body: some View {
        HStack {
            Image(systemName: change.type.icon)
                .font(.title3)
                .foregroundStyle(colorForType(change.type))
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(change.type.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if change.isToday {
                        Text("Today")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.1))
                            .foregroundStyle(.green)
                            .clipShape(Capsule())
                    }
                }

                Text(change.isToday ? change.formattedTime : "\(change.formattedDate) at \(change.formattedTime)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func colorForType(_ type: DiaperType) -> Color {
        switch type {
        case .wet: return .blue
        case .dirty: return .brown
        case .both: return .orange
        }
    }
}

#Preview {
    DiaperView()
        .modelContainer(for: DiaperChange.self, inMemory: true)
}
