import Foundation
import SwiftData
import SwiftUI

@Model
final class Baby {
    var id: UUID
    var name: String
    var birthDate: Date?
    var photoData: Data?
    var color: String // Store color as hex string
    var createdAt: Date
    var isActive: Bool // Currently selected baby

    // Relationships
    @Relationship(deleteRule: .cascade, inverse: \FeedingSession.baby)
    var feedingSessions: [FeedingSession]? = []

    @Relationship(deleteRule: .cascade, inverse: \DiaperChange.baby)
    var diaperChanges: [DiaperChange]? = []

    @Relationship(deleteRule: .cascade, inverse: \SleepSession.baby)
    var sleepSessions: [SleepSession]? = []

    @Relationship(deleteRule: .cascade, inverse: \PumpSession.baby)
    var pumpSessions: [PumpSession]? = []

    @Relationship(deleteRule: .cascade, inverse: \BottleSession.baby)
    var bottleSessions: [BottleSession]? = []

    @Relationship(deleteRule: .cascade, inverse: \GrowthEntry.baby)
    var growthEntries: [GrowthEntry]? = []

    @Relationship(deleteRule: .cascade, inverse: \MedicineLog.baby)
    var medicineLogs: [MedicineLog]? = []

    @Relationship(deleteRule: .cascade, inverse: \Vaccination.baby)
    var vaccinations: [Vaccination]? = []

    @Relationship(deleteRule: .cascade, inverse: \SolidFood.baby)
    var solidFoods: [SolidFood]? = []

    @Relationship(deleteRule: .cascade, inverse: \TeethingEvent.baby)
    var teethingEvents: [TeethingEvent]? = []

    @Relationship(deleteRule: .cascade, inverse: \DiaryEntry.baby)
    var diaryEntries: [DiaryEntry]? = []

    init(
        name: String,
        birthDate: Date? = nil,
        color: String = "9C27B0" // Default purple
    ) {
        self.id = UUID()
        self.name = name
        self.birthDate = birthDate
        self.color = color
        self.createdAt = Date()
        self.isActive = false
    }

    var displayColor: Color {
        Color(hex: color) ?? .purple
    }

    var age: String? {
        guard let birthDate = birthDate else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.month, .day], from: birthDate, to: Date())

        if let months = components.month, months > 0 {
            if let days = components.day, days > 0 {
                return "\(months) month\(months == 1 ? "" : "s"), \(days) day\(days == 1 ? "" : "s")"
            }
            return "\(months) month\(months == 1 ? "" : "s")"
        } else if let days = components.day {
            return "\(days) day\(days == 1 ? "" : "s")"
        }
        return nil
    }

    var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Preset Baby Colors

enum BabyColor: String, CaseIterable {
    case purple = "9C27B0"
    case pink = "E91E63"
    case blue = "2196F3"
    case teal = "009688"
    case orange = "FF9800"
    case green = "4CAF50"

    var color: Color {
        Color(hex: rawValue) ?? .purple
    }

    var name: String {
        switch self {
        case .purple: return "Purple"
        case .pink: return "Pink"
        case .blue: return "Blue"
        case .teal: return "Teal"
        case .orange: return "Orange"
        case .green: return "Green"
        }
    }
}
