import Foundation
import SwiftData

@Model
final class Medicine {
    var id: UUID
    var name: String
    var dosage: String
    var frequency: MedicationFrequency
    var hoursInterval: Int?
    var instructions: String?
    var photoData: Data?
    var isActive: Bool
    var createdDate: Date
    var baby: Baby?
    @Relationship(deleteRule: .cascade) var logs: [MedicineLog]?

    init(
        id: UUID = UUID(),
        name: String,
        dosage: String,
        frequency: MedicationFrequency,
        hoursInterval: Int? = nil,
        instructions: String? = nil,
        photoData: Data? = nil,
        isActive: Bool = true,
        baby: Baby? = nil
    ) {
        self.id = id
        self.name = name
        self.dosage = dosage
        self.frequency = frequency
        self.hoursInterval = hoursInterval
        self.instructions = instructions
        self.photoData = photoData
        self.isActive = isActive
        self.createdDate = Date()
        self.baby = baby
        self.logs = []
    }

    var lastDose: MedicineLog? {
        logs?.sorted { $0.timestamp > $1.timestamp }.first
    }

    var nextDueDate: Date? {
        guard let last = lastDose else { return nil }

        switch frequency {
        case .asNeeded:
            return nil
        case .onceDaily:
            return Calendar.current.date(byAdding: .hour, value: 24, to: last.timestamp)
        case .twiceDaily:
            return Calendar.current.date(byAdding: .hour, value: 12, to: last.timestamp)
        case .threeTimesDaily:
            return Calendar.current.date(byAdding: .hour, value: 8, to: last.timestamp)
        case .fourTimesDaily:
            return Calendar.current.date(byAdding: .hour, value: 6, to: last.timestamp)
        case .everyHours:
            guard let hours = hoursInterval else { return nil }
            return Calendar.current.date(byAdding: .hour, value: hours, to: last.timestamp)
        }
    }

    var isDue: Bool {
        guard let due = nextDueDate else { return false }
        return Date() >= due
    }

    var formattedNextDue: String? {
        guard let due = nextDueDate else { return nil }

        if due < Date() {
            return "Overdue"
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: due, relativeTo: Date())
    }
}

@Model
final class MedicineLog {
    var id: UUID
    var timestamp: Date
    var givenBy: String?
    var notes: String?
    @Relationship(inverse: \Medicine.logs) var medicine: Medicine?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        givenBy: String? = nil,
        notes: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.timestamp = timestamp
        self.givenBy = givenBy
        self.notes = notes
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
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}
