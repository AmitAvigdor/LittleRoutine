import Foundation
import SwiftData
import SwiftUI

enum SleepType: String, Codable, CaseIterable {
    case nap = "Nap"
    case night = "Night"

    var icon: String {
        switch self {
        case .nap: return "sun.haze.fill"
        case .night: return "moon.stars.fill"
        }
    }

    var color: Color {
        switch self {
        case .nap: return .orange
        case .night: return .indigo
        }
    }
}

@Model
final class SleepSession {
    var id: UUID
    var date: Date
    var duration: TimeInterval
    var startTime: Date
    var endTime: Date?
    var type: SleepType
    var isActive: Bool
    var notes: String?
    var babyMood: BabyMood?
    var loggedBy: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        duration: TimeInterval = 0,
        startTime: Date = Date(),
        endTime: Date? = nil,
        type: SleepType,
        isActive: Bool = false,
        notes: String? = nil,
        babyMood: BabyMood? = nil,
        loggedBy: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.duration = duration
        self.startTime = startTime
        self.endTime = endTime
        self.type = type
        self.isActive = isActive
        self.notes = notes
        self.babyMood = babyMood
        self.loggedBy = loggedBy
        self.baby = baby
    }

    var formattedDuration: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        if hours > 0 {
            return String(format: "%dh %02dm", hours, minutes)
        }
        return String(format: "%dm", minutes)
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

    func updateDuration() {
        if isActive {
            duration = Date().timeIntervalSince(startTime)
        }
    }
}
