import AppIntents
import SwiftUI
import SwiftData

// MARK: - Log Feeding Intent

struct LogFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Feeding"
    static var description = IntentDescription("Log a breastfeeding session")

    @Parameter(title: "Breast Side")
    var side: FeedingSideEntity

    @Parameter(title: "Duration (minutes)")
    var durationMinutes: Int?

    static var parameterSummary: some ParameterSummary {
        Summary("Log feeding on \(\.$side)") {
            \.$durationMinutes
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // In production, this would save to SwiftData
        let sideText = side.side == .left ? "left" : "right"
        let durationText = durationMinutes != nil ? " for \(durationMinutes!) minutes" : ""

        return .result(dialog: "Logged feeding on \(sideText) breast\(durationText)")
    }
}

struct FeedingSideEntity: AppEntity {
    var id: String
    var side: BreastSideOption

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Breast Side"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(side.rawValue)")
    }

    static var defaultQuery = FeedingSideQuery()

    enum BreastSideOption: String, CaseIterable {
        case left = "Left"
        case right = "Right"
    }
}

struct FeedingSideQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [FeedingSideEntity] {
        identifiers.compactMap { id in
            if let side = FeedingSideEntity.BreastSideOption(rawValue: id) {
                return FeedingSideEntity(id: id, side: side)
            }
            return nil
        }
    }

    func suggestedEntities() async throws -> [FeedingSideEntity] {
        FeedingSideEntity.BreastSideOption.allCases.map {
            FeedingSideEntity(id: $0.rawValue, side: $0)
        }
    }

    func defaultResult() async -> FeedingSideEntity? {
        FeedingSideEntity(id: "Left", side: .left)
    }
}

// MARK: - Log Diaper Intent

struct LogDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Diaper Change"
    static var description = IntentDescription("Log a diaper change")

    @Parameter(title: "Type")
    var type: DiaperTypeEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$type) diaper")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Logged \(type.type.rawValue.lowercased()) diaper change")
    }
}

struct DiaperTypeEntity: AppEntity {
    var id: String
    var type: DiaperTypeOption

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Diaper Type"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(type.rawValue)")
    }

    static var defaultQuery = DiaperTypeQuery()

    enum DiaperTypeOption: String, CaseIterable {
        case wet = "Wet"
        case dirty = "Dirty"
        case both = "Both"
    }
}

struct DiaperTypeQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [DiaperTypeEntity] {
        identifiers.compactMap { id in
            if let type = DiaperTypeEntity.DiaperTypeOption(rawValue: id) {
                return DiaperTypeEntity(id: id, type: type)
            }
            return nil
        }
    }

    func suggestedEntities() async throws -> [DiaperTypeEntity] {
        DiaperTypeEntity.DiaperTypeOption.allCases.map {
            DiaperTypeEntity(id: $0.rawValue, type: $0)
        }
    }

    func defaultResult() async -> DiaperTypeEntity? {
        DiaperTypeEntity(id: "Wet", type: .wet)
    }
}

// MARK: - Start Sleep Intent

struct StartSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Sleep Timer"
    static var description = IntentDescription("Start tracking baby's sleep")

    @Parameter(title: "Sleep Type")
    var type: SleepTypeEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Start \(\.$type) timer")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Started \(type.type.rawValue.lowercased()) timer")
    }
}

struct SleepTypeEntity: AppEntity {
    var id: String
    var type: SleepTypeOption

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Sleep Type"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(type.rawValue)")
    }

    static var defaultQuery = SleepTypeQuery()

    enum SleepTypeOption: String, CaseIterable {
        case nap = "Nap"
        case night = "Night"
    }
}

struct SleepTypeQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [SleepTypeEntity] {
        identifiers.compactMap { id in
            if let type = SleepTypeEntity.SleepTypeOption(rawValue: id) {
                return SleepTypeEntity(id: id, type: type)
            }
            return nil
        }
    }

    func suggestedEntities() async throws -> [SleepTypeEntity] {
        SleepTypeEntity.SleepTypeOption.allCases.map {
            SleepTypeEntity(id: $0.rawValue, type: $0)
        }
    }

    func defaultResult() async -> SleepTypeEntity? {
        SleepTypeEntity(id: "Nap", type: .nap)
    }
}

// MARK: - Get Last Feeding Intent

struct GetLastFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Last Feeding"
    static var description = IntentDescription("Get information about the last feeding")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // In production, this would query SwiftData
        return .result(dialog: "Last feeding was 2 hours ago on the left breast")
    }
}

// MARK: - Shortcuts Provider

struct BabyTrackShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogFeedingIntent(),
            phrases: [
                "Log a feeding in \(.applicationName)",
                "Log feeding on left breast with \(.applicationName)",
                "Log feeding on right breast with \(.applicationName)",
                "Start feeding in \(.applicationName)"
            ],
            shortTitle: "Log Feeding",
            systemImageName: "drop.circle.fill"
        )

        AppShortcut(
            intent: LogDiaperIntent(),
            phrases: [
                "Log a diaper change in \(.applicationName)",
                "Log wet diaper with \(.applicationName)",
                "Log dirty diaper with \(.applicationName)"
            ],
            shortTitle: "Log Diaper",
            systemImageName: "leaf.circle.fill"
        )

        AppShortcut(
            intent: StartSleepIntent(),
            phrases: [
                "Start sleep timer in \(.applicationName)",
                "Baby is sleeping with \(.applicationName)",
                "Start nap timer with \(.applicationName)"
            ],
            shortTitle: "Start Sleep",
            systemImageName: "moon.stars.fill"
        )

        AppShortcut(
            intent: GetLastFeedingIntent(),
            phrases: [
                "When was the last feeding in \(.applicationName)",
                "Get last feeding from \(.applicationName)",
                "How long since last feeding with \(.applicationName)"
            ],
            shortTitle: "Last Feeding",
            systemImageName: "clock.fill"
        )
    }
}
