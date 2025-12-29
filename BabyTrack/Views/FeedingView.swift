import SwiftUI
import SwiftData

struct FeedingView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \FeedingSession.startTime, order: .reverse) private var allSessions: [FeedingSession]
    @Query private var babies: [Baby]
    @StateObject private var viewModel = FeedingViewModel()
    @State private var showingNoBabyAlert = false

    // Filter sessions by selected baby
    var sessions: [FeedingSession] {
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
                // Last feeding info
                if let lastSide = viewModel.getLastUsedSide(sessions: sessions) {
                    LastFeedingCard(
                        lastSide: lastSide,
                        timeSince: viewModel.getTimeSinceLastFeeding(sessions: sessions)
                    )
                }

                // Timer display
                TimerDisplayCard(
                    formattedTime: viewModel.formattedTime,
                    isRunning: viewModel.isTimerRunning,
                    selectedSide: viewModel.selectedSide
                )

                // Breast side selection
                BreastSideSelector(
                    selectedSide: viewModel.selectedSide,
                    isTimerRunning: viewModel.isTimerRunning
                ) { side in
                    viewModel.selectSide(side)
                }

                // Timer controls
                TimerControlButtons(
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
                    onStop: { viewModel.stopTimer(modelContext: modelContext, baby: currentBaby) },
                    onReset: { viewModel.resetTimer() }
                )

                // Quick stats
                QuickStatsRow(
                    sessionsToday: viewModel.getTodaysSessions(sessions: sessions).count,
                    totalTime: viewModel.getFormattedTotalTime(sessions: sessions)
                )

                // Session history
                SessionHistorySection(
                    sessions: sessions,
                    onDelete: { session in
                        viewModel.deleteSession(session, modelContext: modelContext)
                    }
                )
            }
            .padding()
        }
        .alert("No Baby Selected", isPresented: $showingNoBabyAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Please add or select a baby profile before starting a timer.")
        }
    }
}

// MARK: - Subviews

struct LastFeedingCard: View {
    let lastSide: BreastSide
    let timeSince: String?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Last feeding")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    Image(systemName: lastSide.icon)
                        .foregroundStyle(lastSide == .left ? .purple : .pink)

                    Text("\(lastSide.rawValue) breast")
                        .font(.headline)

                    if let time = timeSince {
                        Text("• \(time)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Text("Try \(lastSide == .left ? "Right" : "Left")")
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(lastSide == .left ? Color.pink.opacity(0.2) : Color.purple.opacity(0.2))
                )
                .foregroundStyle(lastSide == .left ? .pink : .purple)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct TimerDisplayCard: View {
    let formattedTime: String
    let isRunning: Bool
    let selectedSide: BreastSide

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.purple, .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 8
                    )
                    .frame(width: 200, height: 200)

                if isRunning {
                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(
                            LinearGradient(
                                colors: [.purple.opacity(0.3), .pink.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 200, height: 200)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 2).repeatForever(autoreverses: false), value: isRunning)
                }

                VStack(spacing: 8) {
                    Text(formattedTime)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .monospacedDigit()

                    if isRunning {
                        HStack(spacing: 4) {
                            Image(systemName: selectedSide.icon)
                            Text(selectedSide.rawValue)
                        }
                        .font(.subheadline)
                        .foregroundStyle(selectedSide == .left ? .purple : .pink)
                    }
                }
            }
        }
        .padding(.vertical, 20)
    }
}

struct BreastSideSelector: View {
    let selectedSide: BreastSide
    let isTimerRunning: Bool
    let onSelect: (BreastSide) -> Void

    var body: some View {
        HStack(spacing: 16) {
            ForEach(BreastSide.allCases, id: \.self) { side in
                Button {
                    onSelect(side)
                } label: {
                    VStack(spacing: 8) {
                        Image(systemName: side.icon)
                            .font(.title)

                        Text(side.rawValue)
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(selectedSide == side
                                  ? (side == .left ? Color.purple : Color.pink)
                                  : Color(.systemBackground))
                    )
                    .foregroundStyle(selectedSide == side ? .white : (side == .left ? .purple : .pink))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(side == .left ? Color.purple : Color.pink, lineWidth: 2)
                    )
                }
                .disabled(isTimerRunning)
                .opacity(isTimerRunning ? 0.6 : 1)
            }
        }
    }
}

struct TimerControlButtons: View {
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
                            LinearGradient(
                                colors: [.purple, .pink],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
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
                    Label("Save", systemImage: "checkmark.circle.fill")
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

struct QuickStatsRow: View {
    let sessionsToday: Int
    let totalTime: String

    var body: some View {
        HStack(spacing: 16) {
            StatCard(
                icon: "number.circle.fill",
                title: "Sessions Today",
                value: "\(sessionsToday)",
                color: .purple
            )

            StatCard(
                icon: "clock.fill",
                title: "Total Time",
                value: totalTime,
                color: .pink
            )
        }
    }
}

struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Spacer()
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct SessionHistorySection: View {
    let sessions: [FeedingSession]
    let onDelete: (FeedingSession) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            if sessions.isEmpty {
                Text("No feeding sessions yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(sessions) { session in
                        SessionRow(session: session)
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

struct SessionRow: View {
    let session: FeedingSession

    var body: some View {
        HStack {
            Circle()
                .fill(session.breastSide == .left ? Color.purple : Color.pink)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(session.breastSide.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if session.isToday {
                        Text("Today")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.purple.opacity(0.1))
                            .foregroundStyle(.purple)
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
                .monospacedDigit()
                .foregroundStyle(session.breastSide == .left ? .purple : .pink)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    FeedingView()
        .modelContainer(for: FeedingSession.self, inMemory: true)
}
