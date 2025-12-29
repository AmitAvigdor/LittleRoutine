import Foundation
import SwiftData

@Model
final class PumpSession {
    var id: UUID
    var date: Date
    var duration: TimeInterval
    var startTime: Date
    var endTime: Date
    var side: PumpSide
    var volume: Double
    var volumeUnit: VolumeUnit
    var notes: String?
    var momMood: MomMood?
    var loggedBy: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        duration: TimeInterval = 0,
        startTime: Date = Date(),
        endTime: Date = Date(),
        side: PumpSide,
        volume: Double = 0,
        volumeUnit: VolumeUnit = .oz,
        notes: String? = nil,
        momMood: MomMood? = nil,
        loggedBy: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.duration = duration
        self.startTime = startTime
        self.endTime = endTime
        self.side = side
        self.volume = volume
        self.volumeUnit = volumeUnit
        self.notes = notes
        self.momMood = momMood
        self.loggedBy = loggedBy
        self.baby = baby
    }

    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var formattedVolume: String {
        String(format: "%.1f %@", volume, volumeUnit.rawValue)
    }

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: startTime)
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }
}
