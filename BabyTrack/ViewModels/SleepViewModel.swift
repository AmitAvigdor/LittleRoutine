import Foundation
import SwiftUI
import SwiftData

@MainActor
class SleepViewModel: ObservableObject {
    @Published var isTimerRunning = false
    @Published var elapsedTime: TimeInterval = 0
    @Published var selectedType: SleepType = .nap
    @Published var activeSession: SleepSession?

    private var timer: Timer?

    var formattedTime: String {
        let hours = Int(elapsedTime) / 3600
        let minutes = (Int(elapsedTime) % 3600) / 60
        let seconds = Int(elapsedTime) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    func startSleep(type: SleepType, modelContext: ModelContext, baby: Baby? = nil) {
        selectedType = type
        isTimerRunning = true
        elapsedTime = 0

        let session = SleepSession(
            startTime: Date(),
            type: type,
            isActive: true,
            baby: baby
        )

        modelContext.insert(session)
        activeSession = session

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.elapsedTime += 1
                self?.activeSession?.updateDuration()
            }
        }
    }

    func stopSleep(modelContext: ModelContext) {
        timer?.invalidate()
        timer = nil

        if let session = activeSession {
            session.endTime = Date()
            session.duration = elapsedTime
            session.isActive = false
        }

        isTimerRunning = false
        elapsedTime = 0
        activeSession = nil
    }

    func checkForActiveSession(sessions: [SleepSession]) {
        if let active = sessions.first(where: { $0.isActive }) {
            activeSession = active
            isTimerRunning = true
            selectedType = active.type
            elapsedTime = Date().timeIntervalSince(active.startTime)

            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    self?.elapsedTime += 1
                    self?.activeSession?.updateDuration()
                }
            }
        }
    }

    func getTodaysSessions(sessions: [SleepSession]) -> [SleepSession] {
        return sessions.filter { $0.isToday && !$0.isActive }
    }

    func getTotalSleepTimeToday(sessions: [SleepSession]) -> TimeInterval {
        return getTodaysSessions(sessions: sessions).reduce(0) { $0 + $1.duration }
    }

    func getFormattedTotalSleep(sessions: [SleepSession]) -> String {
        let total = getTotalSleepTimeToday(sessions: sessions)
        let hours = Int(total) / 3600
        let minutes = (Int(total) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    func getNapCount(sessions: [SleepSession]) -> Int {
        return getTodaysSessions(sessions: sessions).filter { $0.type == .nap }.count
    }

    func getNightSleepTime(sessions: [SleepSession]) -> String {
        let nightSessions = getTodaysSessions(sessions: sessions).filter { $0.type == .night }
        let total = nightSessions.reduce(0) { $0 + $1.duration }
        let hours = Int(total) / 3600
        let minutes = (Int(total) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    func deleteSession(_ session: SleepSession, modelContext: ModelContext) {
        if session.isActive {
            timer?.invalidate()
            timer = nil
            isTimerRunning = false
            elapsedTime = 0
            activeSession = nil
        }
        modelContext.delete(session)
    }
}
