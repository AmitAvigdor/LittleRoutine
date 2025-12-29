import Foundation
import SwiftData

enum BottleContentType: String, Codable, CaseIterable {
    case breastMilk = "Breast Milk"
    case formula = "Formula"
    case mixed = "Mixed"

    var icon: String {
        switch self {
        case .breastMilk: return "drop.fill"
        case .formula: return "flask.fill"
        case .mixed: return "drop.halffull"
        }
    }
}

@Model
final class BottleSession {
    var id: UUID
    var date: Date
    var timestamp: Date
    var volume: Double
    var volumeUnit: VolumeUnit
    var contentType: BottleContentType
    var notes: String?
    var babyMood: BabyMood?
    var loggedBy: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        timestamp: Date = Date(),
        volume: Double = 0,
        volumeUnit: VolumeUnit = .oz,
        contentType: BottleContentType = .breastMilk,
        notes: String? = nil,
        babyMood: BabyMood? = nil,
        loggedBy: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.timestamp = timestamp
        self.volume = volume
        self.volumeUnit = volumeUnit
        self.contentType = contentType
        self.notes = notes
        self.babyMood = babyMood
        self.loggedBy = loggedBy
        self.baby = baby
    }

    var formattedVolume: String {
        String(format: "%.1f %@", volume, volumeUnit.rawValue)
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
