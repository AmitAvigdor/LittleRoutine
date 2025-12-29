import Foundation
import SwiftUI

// MARK: - Mood Enums

enum BabyMood: String, Codable, CaseIterable {
    case happy = "Happy"
    case fussy = "Fussy"
    case calm = "Calm"
    case crying = "Crying"
    case sleepy = "Sleepy"

    var icon: String {
        switch self {
        case .happy: return "face.smiling.fill"
        case .fussy: return "face.dashed"
        case .calm: return "leaf.fill"
        case .crying: return "drop.triangle.fill"
        case .sleepy: return "zzz"
        }
    }

    var color: Color {
        switch self {
        case .happy: return .yellow
        case .fussy: return .orange
        case .calm: return .green
        case .crying: return .red
        case .sleepy: return .indigo
        }
    }
}

enum MomMood: String, Codable, CaseIterable {
    case energized = "Energized"
    case tired = "Tired"
    case stressed = "Stressed"
    case happy = "Happy"
    case overwhelmed = "Overwhelmed"

    var icon: String {
        switch self {
        case .energized: return "bolt.fill"
        case .tired: return "battery.25"
        case .stressed: return "waveform.path.ecg"
        case .happy: return "heart.fill"
        case .overwhelmed: return "cloud.rain.fill"
        }
    }

    var color: Color {
        switch self {
        case .energized: return .green
        case .tired: return .gray
        case .stressed: return .orange
        case .happy: return .pink
        case .overwhelmed: return .purple
        }
    }
}

// MARK: - Pump Side

enum PumpSide: String, Codable, CaseIterable {
    case left = "Left"
    case right = "Right"
    case both = "Both"

    var icon: String {
        switch self {
        case .left: return "l.circle.fill"
        case .right: return "r.circle.fill"
        case .both: return "circle.grid.2x1.fill"
        }
    }
}

// MARK: - Volume Unit

enum VolumeUnit: String, Codable, CaseIterable {
    case oz = "oz"
    case ml = "ml"

    func convert(_ value: Double, to unit: VolumeUnit) -> Double {
        if self == unit { return value }
        switch (self, unit) {
        case (.oz, .ml): return value * 29.5735
        case (.ml, .oz): return value / 29.5735
        default: return value
        }
    }
}

// MARK: - Weight Unit

enum WeightUnit: String, Codable, CaseIterable {
    case lbs = "lbs"
    case kg = "kg"

    func convert(_ value: Double, to unit: WeightUnit) -> Double {
        if self == unit { return value }
        switch (self, unit) {
        case (.lbs, .kg): return value * 0.453592
        case (.kg, .lbs): return value / 0.453592
        default: return value
        }
    }
}

// MARK: - Length Unit

enum LengthUnit: String, Codable, CaseIterable {
    case inches = "in"
    case cm = "cm"

    func convert(_ value: Double, to unit: LengthUnit) -> Double {
        if self == unit { return value }
        switch (self, unit) {
        case (.inches, .cm): return value * 2.54
        case (.cm, .inches): return value / 2.54
        default: return value
        }
    }
}

// MARK: - Milk Storage Location

enum MilkStorageLocation: String, Codable, CaseIterable {
    case fridge = "Fridge"
    case freezer = "Freezer"

    var icon: String {
        switch self {
        case .fridge: return "refrigerator.fill"
        case .freezer: return "snowflake"
        }
    }

    var expirationDays: Int {
        switch self {
        case .fridge: return 4
        case .freezer: return 180
        }
    }
}

// MARK: - Medication Frequency

enum MedicationFrequency: String, Codable, CaseIterable {
    case asNeeded = "As Needed"
    case onceDaily = "Once Daily"
    case twiceDaily = "Twice Daily"
    case threeTimesDaily = "3x Daily"
    case fourTimesDaily = "4x Daily"
    case everyHours = "Every X Hours"

    var icon: String {
        switch self {
        case .asNeeded: return "clock.badge.questionmark"
        case .onceDaily: return "1.circle.fill"
        case .twiceDaily: return "2.circle.fill"
        case .threeTimesDaily: return "3.circle.fill"
        case .fourTimesDaily: return "4.circle.fill"
        case .everyHours: return "clock.arrow.circlepath"
        }
    }
}

// MARK: - Milestones

enum MilestoneCategory: String, Codable, CaseIterable {
    case motor = "Motor Skills"
    case cognitive = "Cognitive"
    case social = "Social"
    case language = "Language"
    case feeding = "Feeding"
    case other = "Other"

    var icon: String {
        switch self {
        case .motor: return "figure.walk"
        case .cognitive: return "brain.head.profile"
        case .social: return "person.2.fill"
        case .language: return "bubble.left.and.bubble.right.fill"
        case .feeding: return "fork.knife"
        case .other: return "star.fill"
        }
    }
}

// MARK: - Common Milestones

struct CommonMilestones {
    static let all: [(String, MilestoneCategory)] = [
        ("First smile", .social),
        ("First laugh", .social),
        ("Holds head up", .motor),
        ("Rolls over (tummy to back)", .motor),
        ("Rolls over (back to tummy)", .motor),
        ("Sits without support", .motor),
        ("Crawls", .motor),
        ("Pulls to stand", .motor),
        ("First steps", .motor),
        ("First words", .language),
        ("Waves bye-bye", .social),
        ("Claps hands", .motor),
        ("Points at objects", .cognitive),
        ("Follows objects with eyes", .cognitive),
        ("Responds to name", .cognitive),
        ("First solid food", .feeding),
        ("Drinks from cup", .feeding),
        ("Self-feeds with fingers", .feeding),
        ("Uses spoon", .feeding),
        ("First tooth", .other),
        ("Sleeps through night", .other)
    ]
}
