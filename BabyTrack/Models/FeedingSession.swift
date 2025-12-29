import Foundation
import SwiftData
import SwiftUI

enum BreastSide: String, Codable, CaseIterable {
    case left = "Left"
    case right = "Right"

    var icon: String {
        switch self {
        case .left: return "l.circle.fill"
        case .right: return "r.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .left: return .purple
        case .right: return .pink
        }
    }

    var opposite: BreastSide {
        self == .left ? .right : .left
    }
}

@Model
final class FeedingSession {
    var id: UUID
    var date: Date
    var duration: TimeInterval
    var breastSide: BreastSide
    var startTime: Date
    var endTime: Date
    var notes: String?
    var babyMood: BabyMood?
    var momMood: MomMood?
    var loggedBy: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        duration: TimeInterval = 0,
        breastSide: BreastSide,
        startTime: Date,
        endTime: Date = Date(),
        notes: String? = nil,
        babyMood: BabyMood? = nil,
        momMood: MomMood? = nil,
        loggedBy: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.duration = duration
        self.breastSide = breastSide
        self.startTime = startTime
        self.endTime = endTime
        self.notes = notes
        self.babyMood = babyMood
        self.momMood = momMood
        self.loggedBy = loggedBy
        self.baby = baby
    }

    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
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
