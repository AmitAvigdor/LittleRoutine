import Foundation
import SwiftData
import SwiftUI

enum DiaperType: String, Codable, CaseIterable {
    case wet = "Wet"
    case dirty = "Dirty"
    case both = "Both"

    var icon: String {
        switch self {
        case .wet: return "drop.fill"
        case .dirty: return "leaf.fill"
        case .both: return "sparkles"
        }
    }

    var color: Color {
        switch self {
        case .wet: return .blue
        case .dirty: return .brown
        case .both: return .orange
        }
    }
}

@Model
final class DiaperChange {
    var id: UUID
    var date: Date
    var type: DiaperType
    var timestamp: Date
    var notes: String?
    var babyMood: BabyMood?
    var loggedBy: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        type: DiaperType,
        timestamp: Date = Date(),
        notes: String? = nil,
        babyMood: BabyMood? = nil,
        loggedBy: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.type = type
        self.timestamp = timestamp
        self.notes = notes
        self.babyMood = babyMood
        self.loggedBy = loggedBy
        self.baby = baby
    }

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
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
