import Foundation
import SwiftData

@Model
final class GrowthEntry {
    var id: UUID
    var date: Date
    var weight: Double?
    var weightUnit: WeightUnit
    var height: Double?
    var heightUnit: LengthUnit
    var headCircumference: Double?
    var headCircumferenceUnit: LengthUnit
    var photoData: Data?
    var notes: String?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        weight: Double? = nil,
        weightUnit: WeightUnit = .lbs,
        height: Double? = nil,
        heightUnit: LengthUnit = .inches,
        headCircumference: Double? = nil,
        headCircumferenceUnit: LengthUnit = .inches,
        photoData: Data? = nil,
        notes: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.weight = weight
        self.weightUnit = weightUnit
        self.height = height
        self.heightUnit = heightUnit
        self.headCircumference = headCircumference
        self.headCircumferenceUnit = headCircumferenceUnit
        self.photoData = photoData
        self.notes = notes
        self.baby = baby
    }

    var formattedWeight: String? {
        guard let weight = weight else { return nil }
        if weightUnit == .lbs {
            let lbs = Int(weight)
            let oz = Int((weight - Double(lbs)) * 16)
            return "\(lbs) lbs \(oz) oz"
        }
        return String(format: "%.2f %@", weight, weightUnit.rawValue)
    }

    var formattedHeight: String? {
        guard let height = height else { return nil }
        return String(format: "%.1f %@", height, heightUnit.rawValue)
    }

    var formattedHeadCircumference: String? {
        guard let hc = headCircumference else { return nil }
        return String(format: "%.1f %@", hc, headCircumferenceUnit.rawValue)
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

@Model
final class Milestone {
    var id: UUID
    var name: String
    var category: MilestoneCategory
    var achievedDate: Date?
    var notes: String?
    var photoData: Data?
    var isAchieved: Bool
    var baby: Baby?

    init(
        id: UUID = UUID(),
        name: String,
        category: MilestoneCategory,
        achievedDate: Date? = nil,
        notes: String? = nil,
        photoData: Data? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.achievedDate = achievedDate
        self.notes = notes
        self.photoData = photoData
        self.isAchieved = achievedDate != nil
        self.baby = baby
    }

    var formattedAchievedDate: String? {
        guard let date = achievedDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    func markAchieved(on date: Date = Date()) {
        achievedDate = date
        isAchieved = true
    }
}
