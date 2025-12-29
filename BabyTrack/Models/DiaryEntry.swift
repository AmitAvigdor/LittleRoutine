import Foundation
import SwiftData
import SwiftUI

@Model
final class DiaryEntry {
    var id: UUID
    var date: Date
    var title: String?
    var notes: String?
    var photoData: Data?
    var mood: BabyMood?
    var baby: Baby?

    init(
        date: Date = Date(),
        title: String? = nil,
        notes: String? = nil,
        photoData: Data? = nil,
        mood: BabyMood? = nil
    ) {
        self.id = UUID()
        self.date = date
        self.title = title
        self.notes = notes
        self.photoData = photoData
        self.mood = mood
    }

    var formattedDate: String {
        date.formatted(date: .abbreviated, time: .shortened)
    }

    var formattedDateOnly: String {
        date.formatted(date: .abbreviated, time: .omitted)
    }

    var formattedTimeOnly: String {
        date.formatted(date: .omitted, time: .shortened)
    }

    var hasPhoto: Bool {
        photoData != nil
    }

    var displayTitle: String {
        if let title = title, !title.isEmpty {
            return title
        }
        return formattedDate
    }
}
