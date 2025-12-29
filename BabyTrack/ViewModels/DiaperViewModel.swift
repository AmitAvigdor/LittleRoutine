import Foundation
import SwiftUI
import SwiftData

@MainActor
class DiaperViewModel: ObservableObject {

    func logDiaperChange(type: DiaperType, modelContext: ModelContext, baby: Baby? = nil) {
        let change = DiaperChange(type: type, baby: baby)
        modelContext.insert(change)
    }

    func getTodaysChanges(changes: [DiaperChange]) -> [DiaperChange] {
        return changes.filter { $0.isToday }
    }

    func getTodaysCount(changes: [DiaperChange]) -> Int {
        return getTodaysChanges(changes: changes).count
    }

    func getWetCount(changes: [DiaperChange]) -> Int {
        return getTodaysChanges(changes: changes).filter { $0.type == .wet || $0.type == .both }.count
    }

    func getDirtyCount(changes: [DiaperChange]) -> Int {
        return getTodaysChanges(changes: changes).filter { $0.type == .dirty || $0.type == .both }.count
    }

    func getTimeSinceLastChange(changes: [DiaperChange]) -> String? {
        guard let lastChange = changes.first else { return nil }

        let interval = Date().timeIntervalSince(lastChange.timestamp)
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m ago"
        }
        return "\(minutes)m ago"
    }

    func deleteChange(_ change: DiaperChange, modelContext: ModelContext) {
        modelContext.delete(change)
    }
}
