import Foundation
import SwiftUI
import SwiftData
import Combine

@MainActor
class FeedingViewModel: ObservableObject {
    @Published var isTimerRunning = false
    @Published var isPaused = false
    @Published var elapsedTime: TimeInterval = 0
    @Published var selectedSide: BreastSide = .left
    @Published var startTime: Date?

    private var timer: Timer?
    private var pausedTime: TimeInterval = 0

    var formattedTime: String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    func startTimer() {
        startTime = Date()
        isTimerRunning = true
        isPaused = false
        elapsedTime = pausedTime

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, !self.isPaused else { return }
                self.elapsedTime += 1
            }
        }
    }

    func pauseTimer() {
        isPaused = true
        pausedTime = elapsedTime
        timer?.invalidate()
        timer = nil
    }

    func resumeTimer() {
        isPaused = false
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, !self.isPaused else { return }
                self.elapsedTime += 1
            }
        }
    }

    func stopTimer(modelContext: ModelContext, baby: Baby? = nil) {
        timer?.invalidate()
        timer = nil

        guard let start = startTime else { return }

        let session = FeedingSession(
            date: Date(),
            duration: elapsedTime,
            breastSide: selectedSide,
            startTime: start,
            endTime: Date(),
            baby: baby
        )

        modelContext.insert(session)

        resetTimer()
    }

    func resetTimer() {
        timer?.invalidate()
        timer = nil
        isTimerRunning = false
        isPaused = false
        elapsedTime = 0
        pausedTime = 0
        startTime = nil
    }

    func selectSide(_ side: BreastSide) {
        selectedSide = side
    }

    func getLastUsedSide(sessions: [FeedingSession]) -> BreastSide? {
        return sessions.first?.breastSide
    }

    func getTimeSinceLastFeeding(sessions: [FeedingSession]) -> String? {
        guard let lastSession = sessions.first else { return nil }

        let interval = Date().timeIntervalSince(lastSession.endTime)
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m ago"
        }
        return "\(minutes)m ago"
    }

    func getTodaysSessions(sessions: [FeedingSession]) -> [FeedingSession] {
        return sessions.filter { $0.isToday }
    }

    func getTotalFeedingTimeToday(sessions: [FeedingSession]) -> TimeInterval {
        return getTodaysSessions(sessions: sessions).reduce(0) { $0 + $1.duration }
    }

    func getFormattedTotalTime(sessions: [FeedingSession]) -> String {
        let total = getTotalFeedingTimeToday(sessions: sessions)
        let hours = Int(total) / 3600
        let minutes = (Int(total) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    func deleteSession(_ session: FeedingSession, modelContext: ModelContext) {
        modelContext.delete(session)
    }
}
