import Foundation
import SwiftData
import UIKit

enum ExportFormat: String, CaseIterable {
    case csv = "CSV"
    case json = "JSON"

    var fileExtension: String {
        switch self {
        case .csv: return "csv"
        case .json: return "json"
        }
    }

    var mimeType: String {
        switch self {
        case .csv: return "text/csv"
        case .json: return "application/json"
        }
    }
}

struct ExportableData: Codable {
    let exportDate: Date
    let babyName: String?
    let babyBirthDate: Date?
    let feedingSessions: [FeedingExport]
    let bottleSessions: [BottleExport]
    let pumpSessions: [PumpExport]
    let sleepSessions: [SleepExport]
    let diaperChanges: [DiaperExport]
    let growthEntries: [GrowthExport]
    let vaccinations: [VaccinationExport]
    let solidFoods: [SolidFoodExport]
    let teethingEvents: [TeethingExport]
}

struct FeedingExport: Codable {
    let date: Date
    let side: String
    let durationSeconds: Int
    let babyMood: String?
}

struct BottleExport: Codable {
    let date: Date
    let volumeOz: Double
    let contentType: String
}

struct PumpExport: Codable {
    let date: Date
    let side: String
    let durationSeconds: Int
    let volumeOz: Double
}

struct SleepExport: Codable {
    let startDate: Date
    let endDate: Date?
    let sleepType: String
    let durationMinutes: Int?
}

struct DiaperExport: Codable {
    let date: Date
    let type: String
    let notes: String?
}

struct GrowthExport: Codable {
    let date: Date
    let weightLbs: Double?
    let heightInches: Double?
    let headCircumferenceInches: Double?
}

struct VaccinationExport: Codable {
    let name: String
    let scheduledDate: Date
    let administeredDate: Date?
    let location: String?
    let isCompleted: Bool
}

struct SolidFoodExport: Codable {
    let date: Date
    let foodName: String
    let category: String
    let isFirstIntroduction: Bool
    let reaction: String?
    let liked: String?
}

struct TeethingExport: Codable {
    let toothPosition: String
    let firstSignsDate: Date?
    let eruptionDate: Date?
    let symptoms: [String]
}

class DataExporter {
    static let shared = DataExporter()

    private init() {}

    // MARK: - Export to JSON

    func exportToJSON(
        baby: Baby?,
        feedingSessions: [FeedingSession],
        bottleSessions: [BottleSession],
        pumpSessions: [PumpSession],
        sleepSessions: [SleepSession],
        diaperChanges: [DiaperChange],
        growthEntries: [GrowthEntry],
        vaccinations: [Vaccination],
        solidFoods: [SolidFood],
        teethingEvents: [TeethingEvent]
    ) throws -> Data {
        let data = ExportableData(
            exportDate: Date(),
            babyName: baby?.name,
            babyBirthDate: baby?.birthDate,
            feedingSessions: feedingSessions.map { session in
                FeedingExport(
                    date: session.date,
                    side: session.breastSide.rawValue,
                    durationSeconds: Int(session.duration),
                    babyMood: session.babyMood?.rawValue
                )
            },
            bottleSessions: bottleSessions.map { session in
                BottleExport(
                    date: session.date,
                    volumeOz: session.volume,
                    contentType: session.contentType.rawValue
                )
            },
            pumpSessions: pumpSessions.map { session in
                PumpExport(
                    date: session.date,
                    side: session.side.rawValue,
                    durationSeconds: Int(session.duration),
                    volumeOz: session.volume
                )
            },
            sleepSessions: sleepSessions.map { session in
                SleepExport(
                    startDate: session.startTime,
                    endDate: session.endTime,
                    sleepType: session.type.rawValue,
                    durationMinutes: session.endTime != nil ? Int(session.endTime!.timeIntervalSince(session.startTime) / 60) : nil
                )
            },
            diaperChanges: diaperChanges.map { change in
                DiaperExport(
                    date: change.date,
                    type: change.type.rawValue,
                    notes: change.notes
                )
            },
            growthEntries: growthEntries.map { entry in
                GrowthExport(
                    date: entry.date,
                    weightLbs: entry.weight,
                    heightInches: entry.height,
                    headCircumferenceInches: entry.headCircumference
                )
            },
            vaccinations: vaccinations.map { vacc in
                VaccinationExport(
                    name: vacc.name,
                    scheduledDate: vacc.scheduledDate,
                    administeredDate: vacc.administeredDate,
                    location: vacc.location,
                    isCompleted: vacc.isCompleted
                )
            },
            solidFoods: solidFoods.map { food in
                SolidFoodExport(
                    date: food.date,
                    foodName: food.foodName,
                    category: food.category.rawValue,
                    isFirstIntroduction: food.isFirstIntroduction,
                    reaction: food.reaction?.rawValue,
                    liked: food.liked?.rawValue
                )
            },
            teethingEvents: teethingEvents.map { event in
                TeethingExport(
                    toothPosition: event.toothPosition.fullName,
                    firstSignsDate: event.firstSignsDate,
                    eruptionDate: event.eruptionDate,
                    symptoms: event.symptoms.map { $0.rawValue }
                )
            }
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        return try encoder.encode(data)
    }

    // MARK: - Export to CSV

    func exportToCSV(
        baby: Baby?,
        feedingSessions: [FeedingSession],
        bottleSessions: [BottleSession],
        pumpSessions: [PumpSession],
        sleepSessions: [SleepSession],
        diaperChanges: [DiaperChange],
        growthEntries: [GrowthEntry],
        vaccinations: [Vaccination],
        solidFoods: [SolidFood],
        teethingEvents: [TeethingEvent]
    ) -> String {
        var csv = ""
        let dateFormatter = ISO8601DateFormatter()

        // Baby Info
        csv += "# Baby Information\n"
        csv += "Name,Birth Date\n"
        csv += "\"\(baby?.name ?? "")\",\"\(baby?.birthDate.map { dateFormatter.string(from: $0) } ?? "")\"\n\n"

        // Feeding Sessions
        csv += "# Feeding Sessions (Breastfeeding)\n"
        csv += "Date,Side,Duration (seconds),Baby Mood\n"
        for session in feedingSessions {
            csv += "\"\(dateFormatter.string(from: session.date))\","
            csv += "\"\(session.breastSide.rawValue)\","
            csv += "\(Int(session.duration)),"
            csv += "\"\(session.babyMood?.rawValue ?? "")\"\n"
        }
        csv += "\n"

        // Bottle Sessions
        csv += "# Bottle Sessions\n"
        csv += "Date,Volume (oz),Content Type\n"
        for session in bottleSessions {
            csv += "\"\(dateFormatter.string(from: session.date))\","
            csv += "\(session.volume),"
            csv += "\"\(session.contentType.rawValue)\"\n"
        }
        csv += "\n"

        // Pump Sessions
        csv += "# Pump Sessions\n"
        csv += "Date,Side,Duration (seconds),Volume (oz)\n"
        for session in pumpSessions {
            csv += "\"\(dateFormatter.string(from: session.date))\","
            csv += "\"\(session.side.rawValue)\","
            csv += "\(Int(session.duration)),"
            csv += "\(session.volume)\n"
        }
        csv += "\n"

        // Sleep Sessions
        csv += "# Sleep Sessions\n"
        csv += "Start Date,End Date,Type,Duration (minutes)\n"
        for session in sleepSessions {
            csv += "\"\(dateFormatter.string(from: session.startTime))\","
            csv += "\"\(session.endTime.map { dateFormatter.string(from: $0) } ?? "")\","
            csv += "\"\(session.type.rawValue)\","
            let duration = session.endTime.map { Int($0.timeIntervalSince(session.startTime) / 60) }
            csv += "\(duration.map { String($0) } ?? "")\n"
        }
        csv += "\n"

        // Diaper Changes
        csv += "# Diaper Changes\n"
        csv += "Date,Type,Notes\n"
        for change in diaperChanges {
            csv += "\"\(dateFormatter.string(from: change.date))\","
            csv += "\"\(change.type.rawValue)\","
            csv += "\"\(change.notes ?? "")\"\n"
        }
        csv += "\n"

        // Growth Entries
        csv += "# Growth Entries\n"
        csv += "Date,Weight (lbs),Height (inches),Head Circumference (inches)\n"
        for entry in growthEntries {
            csv += "\"\(dateFormatter.string(from: entry.date))\","
            csv += "\(entry.weight.map { String($0) } ?? ""),"
            csv += "\(entry.height.map { String($0) } ?? ""),"
            csv += "\(entry.headCircumference.map { String($0) } ?? "")\n"
        }
        csv += "\n"

        // Vaccinations
        csv += "# Vaccinations\n"
        csv += "Name,Scheduled Date,Administered Date,Location,Completed\n"
        for vacc in vaccinations {
            csv += "\"\(vacc.name)\","
            csv += "\"\(dateFormatter.string(from: vacc.scheduledDate))\","
            csv += "\"\(vacc.administeredDate.map { dateFormatter.string(from: $0) } ?? "")\","
            csv += "\"\(vacc.location ?? "")\","
            csv += "\(vacc.isCompleted)\n"
        }
        csv += "\n"

        // Solid Foods
        csv += "# Solid Foods\n"
        csv += "Date,Food Name,Category,First Introduction,Reaction,Liked\n"
        for food in solidFoods {
            csv += "\"\(dateFormatter.string(from: food.date))\","
            csv += "\"\(food.foodName)\","
            csv += "\"\(food.category.rawValue)\","
            csv += "\(food.isFirstIntroduction),"
            csv += "\"\(food.reaction?.rawValue ?? "")\","
            csv += "\"\(food.liked?.rawValue ?? "")\"\n"
        }
        csv += "\n"

        // Teething Events
        csv += "# Teething Events\n"
        csv += "Tooth Position,First Signs Date,Eruption Date,Symptoms\n"
        for event in teethingEvents {
            csv += "\"\(event.toothPosition.fullName)\","
            csv += "\"\(event.firstSignsDate.map { dateFormatter.string(from: $0) } ?? "")\","
            csv += "\"\(event.eruptionDate.map { dateFormatter.string(from: $0) } ?? "")\","
            csv += "\"\(event.symptoms.map { $0.rawValue }.joined(separator: "; "))\"\n"
        }

        return csv
    }

    // MARK: - Create Shareable File

    func createExportFile(data: Data, format: ExportFormat, babyName: String?) throws -> URL {
        let fileName = generateFileName(babyName: babyName, format: format)
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        try data.write(to: tempURL)
        return tempURL
    }

    private func generateFileName(babyName: String?, format: ExportFormat) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: Date())

        let sanitizedName = babyName?.replacingOccurrences(of: " ", with: "_") ?? "BabyTrack"
        return "\(sanitizedName)_Export_\(dateString).\(format.fileExtension)"
    }
}
