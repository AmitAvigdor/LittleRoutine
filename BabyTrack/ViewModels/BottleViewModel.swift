import Foundation
import SwiftUI
import SwiftData

@MainActor
class BottleViewModel: ObservableObject {

    func logBottleFeeding(
        volume: Double,
        volumeUnit: VolumeUnit,
        contentType: BottleContentType,
        notes: String?,
        babyMood: BabyMood?,
        modelContext: ModelContext,
        baby: Baby? = nil
    ) {
        let session = BottleSession(
            volume: volume,
            volumeUnit: volumeUnit,
            contentType: contentType,
            notes: notes,
            babyMood: babyMood,
            baby: baby
        )

        modelContext.insert(session)
    }

    func deleteSession(_ session: BottleSession, modelContext: ModelContext) {
        modelContext.delete(session)
    }

    func getTodaysSessions(sessions: [BottleSession]) -> [BottleSession] {
        sessions.filter { $0.isToday }
    }

    func getTotalVolumeToday(sessions: [BottleSession]) -> Double {
        getTodaysSessions(sessions: sessions).reduce(0) { $0 + $1.volume }
    }
}
