import Foundation
import SwiftData

@Model
final class MilkStash {
    var id: UUID
    var date: Date
    var volume: Double
    var volumeUnit: VolumeUnit
    var location: MilkStorageLocation
    var pumpedDate: Date
    var expirationDate: Date
    var isUsed: Bool
    var usedDate: Date?
    var notes: String?
    var baby: Baby?
    var isInUse: Bool
    var inUseStartDate: Date?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        volume: Double = 0,
        volumeUnit: VolumeUnit = .oz,
        location: MilkStorageLocation = .fridge,
        pumpedDate: Date = Date(),
        notes: String? = nil,
        baby: Baby? = nil,
        isInUse: Bool = false
    ) {
        self.id = id
        self.date = date
        self.volume = volume
        self.volumeUnit = volumeUnit
        self.location = location
        self.pumpedDate = pumpedDate
        self.expirationDate = Calendar.current.date(byAdding: .day, value: location.expirationDays, to: pumpedDate) ?? pumpedDate
        self.isUsed = false
        self.usedDate = nil
        self.notes = notes
        self.baby = baby
        self.isInUse = isInUse
        self.inUseStartDate = isInUse ? Date() : nil
    }

    // Room temperature milk is good for 4 hours
    static let roomTempExpirationHours: Int = 4

    func startUsing() {
        isInUse = true
        inUseStartDate = Date()
        // Update expiration to 4 hours from now (room temp)
        expirationDate = Calendar.current.date(byAdding: .hour, value: MilkStash.roomTempExpirationHours, to: Date()) ?? Date()
    }

    var roomTempTimeRemaining: TimeInterval? {
        guard isInUse, let startDate = inUseStartDate else { return nil }
        let expiresAt = Calendar.current.date(byAdding: .hour, value: MilkStash.roomTempExpirationHours, to: startDate) ?? startDate
        let remaining = expiresAt.timeIntervalSince(Date())
        return max(0, remaining)
    }

    var isRoomTempExpired: Bool {
        guard let remaining = roomTempTimeRemaining else { return false }
        return remaining <= 0
    }

    var formattedRoomTempTimeRemaining: String {
        guard let remaining = roomTempTimeRemaining else { return "" }
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        let seconds = Int(remaining) % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var formattedVolume: String {
        String(format: "%.1f %@", volume, volumeUnit.rawValue)
    }

    var formattedPumpedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter.string(from: pumpedDate)
    }

    var formattedExpirationDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter.string(from: expirationDate)
    }

    var isExpired: Bool {
        Date() > expirationDate
    }

    var isExpiringSoon: Bool {
        guard !isExpired else { return false }
        let daysUntilExpiration = Calendar.current.dateComponents([.day], from: Date(), to: expirationDate).day ?? 0
        return daysUntilExpiration <= 1
    }

    var daysUntilExpiration: Int {
        max(0, Calendar.current.dateComponents([.day], from: Date(), to: expirationDate).day ?? 0)
    }

    func markAsUsed() {
        isUsed = true
        usedDate = Date()
    }
}
