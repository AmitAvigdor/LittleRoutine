import SwiftUI
import SwiftData

struct SleepView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \SleepSession.startTime, order: .reverse) private var allSessions: [SleepSession]
    @Query private var babies: [Baby]
    @StateObject private var viewModel = SleepViewModel()
    @State private var showingNoBabyAlert = false

    // Filter sessions by selected baby
    var sessions: [SleepSession] {
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
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Timer display
                    SleepTimerCard(
                        formattedTime: viewModel.formattedTime,
                        isRunning: viewModel.isTimerRunning,
                        sleepType: viewModel.selectedType
                    )

                    // Sleep type selection and controls
                    if !viewModel.isTimerRunning {
                        SleepTypeButtons(
                            onStart: { type in
                                if hasBabySelected {
                                    viewModel.startSleep(type: type, modelContext: modelContext, baby: currentBaby)
                                } else {
                                    showingNoBabyAlert = true
                                }
                            }
                        )
                    } else {
                        Button {
                            viewModel.stopSleep(modelContext: modelContext)
                        } label: {
                            Label("Wake Up", systemImage: "sun.max.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.orange)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .padding(.horizontal)
                    }

                    // Today's summary
                    SleepSummaryCard(
                        totalSleep: viewModel.getFormattedTotalSleep(sessions: sessions),
                        napCount: viewModel.getNapCount(sessions: sessions),
                        nightSleep: viewModel.getNightSleepTime(sessions: sessions)
                    )

                    // Session history
                    SleepHistorySection(
                        sessions: sessions.filter { !$0.isActive },
                        onDelete: { session in
                            viewModel.deleteSession(session, modelContext: modelContext)
                        }
                    )
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Sleep")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    BabySwitcher()
                }
            }
            .onAppear {
                viewModel.checkForActiveSession(sessions: sessions)
            }
            .alert("No Baby Selected", isPresented: $showingNoBabyAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Please add or select a baby profile before starting a timer.")
            }
        }
    }
}

struct SleepTimerCard: View {
    let formattedTime: String
    let isRunning: Bool
    let sleepType: SleepType

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.indigo, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 8
                    )
                    .frame(width: 180, height: 180)

                if isRunning {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.indigo.opacity(0.1), .purple.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 160, height: 160)
                }

                VStack(spacing: 8) {
                    if isRunning {
                        Image(systemName: sleepType.icon)
                            .font(.title)
                            .foregroundStyle(sleepType == .nap ? .orange : .indigo)
                    } else {
                        Image(systemName: "zzz")
                            .font(.title)
                            .foregroundStyle(.gray)
                    }

                    Text(formattedTime)
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()

                    if isRunning {
                        Text(sleepType.rawValue)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if isRunning {
                Text("Baby is sleeping...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 20)
    }
}

struct SleepTypeButtons: View {
    let onStart: (SleepType) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Start Sleep")
                .font(.headline)
                .foregroundStyle(.secondary)

            HStack(spacing: 16) {
                ForEach(SleepType.allCases, id: \.self) { type in
                    Button {
                        onStart(type)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: type.icon)
                                .font(.title)

                            Text(type.rawValue)
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(
                            LinearGradient(
                                colors: type == .nap ? [.orange, .yellow] : [.indigo, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct SleepSummaryCard: View {
    let totalSleep: String
    let napCount: Int
    let nightSleep: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Today's Sleep")
                .font(.headline)

            HStack(spacing: 16) {
                SleepStatItem(
                    icon: "clock.fill",
                    value: totalSleep,
                    label: "Total",
                    color: .purple
                )

                SleepStatItem(
                    icon: "sun.haze.fill",
                    value: "\(napCount)",
                    label: "Naps",
                    color: .orange
                )

                SleepStatItem(
                    icon: "moon.stars.fill",
                    value: nightSleep,
                    label: "Night",
                    color: .indigo
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

struct SleepStatItem: View {
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
                .font(.headline)

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct SleepHistorySection: View {
    let sessions: [SleepSession]
    let onDelete: (SleepSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            if sessions.isEmpty {
                Text("No sleep sessions yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(sessions) { session in
                        SleepSessionRow(session: session)
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

struct SleepSessionRow: View {
    let session: SleepSession

    var body: some View {
        HStack {
            Image(systemName: session.type.icon)
                .font(.title3)
                .foregroundStyle(session.type == .nap ? .orange : .indigo)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(session.type.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if session.isToday {
                        Text("Today")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.indigo.opacity(0.1))
                            .foregroundStyle(.indigo)
                            .clipShape(Capsule())
                    }
                }

                Text(session.isToday ? session.formattedTime : "\(session.formattedDate) at \(session.formattedTime)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(session.formattedDuration)
                .font(.headline)
                .foregroundStyle(session.type == .nap ? .orange : .indigo)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    SleepView()
        .modelContainer(for: SleepSession.self, inMemory: true)
}
