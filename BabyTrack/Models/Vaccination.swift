import Foundation
import SwiftData

@Model
final class Vaccination {
    var id: UUID
    var name: String
    var scheduledDate: Date
    var administeredDate: Date?
    var location: String?
    var notes: String?
    var reminderEnabled: Bool
    var baby: Baby?

    init(
        name: String,
        scheduledDate: Date,
        administeredDate: Date? = nil,
        location: String? = nil,
        notes: String? = nil,
        reminderEnabled: Bool = true
    ) {
        self.id = UUID()
        self.name = name
        self.scheduledDate = scheduledDate
        self.administeredDate = administeredDate
        self.location = location
        self.notes = notes
        self.reminderEnabled = reminderEnabled
    }

    var isCompleted: Bool {
        administeredDate != nil
    }

    var isOverdue: Bool {
        !isCompleted && scheduledDate < Date()
    }

    var isUpcoming: Bool {
        !isCompleted && !isOverdue
    }

    var daysUntilDue: Int? {
        guard !isCompleted else { return nil }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: Date(), to: scheduledDate).day
        return days
    }

    var formattedScheduledDate: String {
        scheduledDate.formatted(date: .abbreviated, time: .omitted)
    }

    var formattedAdministeredDate: String? {
        administeredDate?.formatted(date: .abbreviated, time: .omitted)
    }

    var statusText: String {
        if isCompleted {
            return "Completed"
        } else if isOverdue {
            return "Overdue"
        } else if let days = daysUntilDue {
            if days == 0 {
                return "Due today"
            } else if days == 1 {
                return "Due tomorrow"
            } else {
                return "Due in \(days) days"
            }
        }
        return "Scheduled"
    }
}
