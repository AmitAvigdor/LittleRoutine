import Foundation
import SwiftUI
import SwiftData

@MainActor
class PumpViewModel: ObservableObject {
    @Published var isTimerRunning = false
    @Published var isPaused = false
    @Published var elapsedTime: TimeInterval = 0
    @Published var selectedSide: PumpSide = .both
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

    func saveSession(
        volume: Double,
        volumeUnit: VolumeUnit,
        notes: String?,
        momMood: MomMood?,
        modelContext: ModelContext,
        baby: Baby? = nil
    ) {
        guard let start = startTime else { return }

        let session = PumpSession(
            date: Date(),
            duration: elapsedTime,
            startTime: start,
            endTime: Date(),
            side: selectedSide,
            volume: volume,
            volumeUnit: volumeUnit,
            notes: notes,
            momMood: momMood,
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

    func deleteSession(_ session: PumpSession, modelContext: ModelContext) {
        modelContext.delete(session)
    }

    func getTodaysSessions(sessions: [PumpSession]) -> [PumpSession] {
        sessions.filter { $0.isToday }
    }

    func getTotalVolumeToday(sessions: [PumpSession]) -> Double {
        getTodaysSessions(sessions: sessions).reduce(0) { $0 + $1.volume }
    }
}
