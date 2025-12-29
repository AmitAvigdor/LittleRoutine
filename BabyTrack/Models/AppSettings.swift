import Foundation
import SwiftData
import SwiftUI

@Model
final class AppSettings {
    var id: UUID

    // User Info
    var userName: String?
    var partnerName: String?
    var babyName: String?
    var babyBirthDate: Date?

    // Units
    var preferredVolumeUnit: VolumeUnit
    var preferredWeightUnit: WeightUnit
    var preferredLengthUnit: LengthUnit

    // Night Mode
    var nightModeEnabled: Bool
    var nightModeAutoEnabled: Bool
    var nightModeStartHour: Int
    var nightModeEndHour: Int
    var nightModeSilent: Bool

    // Reminders
    var feedingReminderEnabled: Bool
    var feedingReminderInterval: Int // minutes
    var diaperReminderEnabled: Bool
    var diaperReminderInterval: Int // minutes
    var sleepReminderEnabled: Bool
    var medicineReminderEnabled: Bool
    var medicineReminderMinutesBefore: Int // minutes before due time to remind

    // Daily Summary
    var dailySummaryEnabled: Bool
    var morningSummaryEnabled: Bool
    var morningSummaryHour: Int // 0-23
    var eveningSummaryEnabled: Bool
    var eveningSummaryHour: Int // 0-23

    // Sync
    var iCloudSyncEnabled: Bool
    var lastSyncDate: Date?

    init(
        id: UUID = UUID(),
        userName: String? = nil,
        partnerName: String? = nil,
        babyName: String? = nil,
        babyBirthDate: Date? = nil,
        preferredVolumeUnit: VolumeUnit = .oz,
        preferredWeightUnit: WeightUnit = .lbs,
        preferredLengthUnit: LengthUnit = .inches,
        nightModeEnabled: Bool = false,
        nightModeAutoEnabled: Bool = false,
        nightModeStartHour: Int = 22,
        nightModeEndHour: Int = 6,
        nightModeSilent: Bool = true,
        feedingReminderEnabled: Bool = false,
        feedingReminderInterval: Int = 180,
        diaperReminderEnabled: Bool = false,
        diaperReminderInterval: Int = 120,
        sleepReminderEnabled: Bool = false,
        medicineReminderEnabled: Bool = false,
        medicineReminderMinutesBefore: Int = 15,
        dailySummaryEnabled: Bool = false,
        morningSummaryEnabled: Bool = true,
        morningSummaryHour: Int = 8,
        eveningSummaryEnabled: Bool = true,
        eveningSummaryHour: Int = 20,
        iCloudSyncEnabled: Bool = false
    ) {
        self.id = id
        self.userName = userName
        self.partnerName = partnerName
        self.babyName = babyName
        self.babyBirthDate = babyBirthDate
        self.preferredVolumeUnit = preferredVolumeUnit
        self.preferredWeightUnit = preferredWeightUnit
        self.preferredLengthUnit = preferredLengthUnit
        self.nightModeEnabled = nightModeEnabled
        self.nightModeAutoEnabled = nightModeAutoEnabled
        self.nightModeStartHour = nightModeStartHour
        self.nightModeEndHour = nightModeEndHour
        self.nightModeSilent = nightModeSilent
        self.feedingReminderEnabled = feedingReminderEnabled
        self.feedingReminderInterval = feedingReminderInterval
        self.diaperReminderEnabled = diaperReminderEnabled
        self.diaperReminderInterval = diaperReminderInterval
        self.sleepReminderEnabled = sleepReminderEnabled
        self.medicineReminderEnabled = medicineReminderEnabled
        self.medicineReminderMinutesBefore = medicineReminderMinutesBefore
        self.dailySummaryEnabled = dailySummaryEnabled
        self.morningSummaryEnabled = morningSummaryEnabled
        self.morningSummaryHour = morningSummaryHour
        self.eveningSummaryEnabled = eveningSummaryEnabled
        self.eveningSummaryHour = eveningSummaryHour
        self.iCloudSyncEnabled = iCloudSyncEnabled
        self.lastSyncDate = nil
    }

    var babyAge: String? {
        guard let birthDate = babyBirthDate else { return nil }

        let components = Calendar.current.dateComponents([.month, .day], from: birthDate, to: Date())
        let months = components.month ?? 0
        let days = components.day ?? 0

        if months > 0 {
            return "\(months) month\(months == 1 ? "" : "s"), \(days) day\(days == 1 ? "" : "s")"
        }
        return "\(days) day\(days == 1 ? "" : "s")"
    }

    var shouldEnableNightMode: Bool {
        guard nightModeAutoEnabled else { return nightModeEnabled }

        let hour = Calendar.current.component(.hour, from: Date())

        if nightModeStartHour > nightModeEndHour {
            // Overnight (e.g., 22:00 - 06:00)
            return hour >= nightModeStartHour || hour < nightModeEndHour
        } else {
            // Same day
            return hour >= nightModeStartHour && hour < nightModeEndHour
        }
    }
}

@Model
final class PediatricianNote {
    var id: UUID
    var date: Date
    var concern: String
    var isResolved: Bool
    var resolution: String?
    var resolvedDate: Date?
    var baby: Baby?

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        concern: String,
        isResolved: Bool = false,
        resolution: String? = nil,
        baby: Baby? = nil
    ) {
        self.id = id
        self.date = date
        self.concern = concern
        self.isResolved = isResolved
        self.resolution = resolution
        self.resolvedDate = nil
        self.baby = baby
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    func resolve(with note: String) {
        isResolved = true
        resolution = note
        resolvedDate = Date()
    }
}
