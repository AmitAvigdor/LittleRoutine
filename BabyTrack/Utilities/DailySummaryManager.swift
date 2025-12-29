import Foundation
import UserNotifications
import SwiftData

class DailySummaryManager {
    static let shared = DailySummaryManager()

    private let morningSummaryIdentifier = "daily-summary-morning"
    private let eveningSummaryIdentifier = "daily-summary-evening"

    private init() {}

    // MARK: - Schedule Notifications

    func scheduleNotifications(settings: AppSettings, babyName: String?) {
        cancelAllSummaryNotifications()

        guard settings.dailySummaryEnabled else { return }

        if settings.morningSummaryEnabled {
            scheduleMorningSummary(hour: settings.morningSummaryHour, babyName: babyName)
        }

        if settings.eveningSummaryEnabled {
            scheduleEveningSummary(hour: settings.eveningSummaryHour, babyName: babyName)
        }
    }

    private func scheduleMorningSummary(hour: Int, babyName: String?) {
        let content = UNMutableNotificationContent()
        content.title = "Good Morning! ☀️"
        content.body = babyName != nil
            ? "Here's yesterday's summary for \(babyName!). Tap to see details."
            : "Here's yesterday's summary. Tap to see details."
        content.sound = .default
        content.categoryIdentifier = "DAILY_SUMMARY"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: morningSummaryIdentifier,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling morning summary: \(error)")
            }
        }
    }

    private func scheduleEveningSummary(hour: Int, babyName: String?) {
        let content = UNMutableNotificationContent()
        content.title = "Daily Recap 🌙"
        content.body = babyName != nil
            ? "Here's today's activity summary for \(babyName!). Tap to see details."
            : "Here's today's activity summary. Tap to see details."
        content.sound = .default
        content.categoryIdentifier = "DAILY_SUMMARY"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: eveningSummaryIdentifier,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling evening summary: \(error)")
            }
        }
    }

    func cancelAllSummaryNotifications() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [morningSummaryIdentifier, eveningSummaryIdentifier]
        )
    }

    // MARK: - Generate Summary Text

    static func generateMorningSummary(
        feedingCount: Int,
        totalFeedingMinutes: Int,
        diaperCount: Int,
        sleepHours: Double,
        medicinesDue: Int
    ) -> String {
        var parts: [String] = []

        if feedingCount > 0 {
            parts.append("\(feedingCount) feedings (\(totalFeedingMinutes) min)")
        }

        if diaperCount > 0 {
            parts.append("\(diaperCount) diapers")
        }

        if sleepHours > 0 {
            let hours = Int(sleepHours)
            let minutes = Int((sleepHours - Double(hours)) * 60)
            if minutes > 0 {
                parts.append("\(hours)h \(minutes)m sleep")
            } else {
                parts.append("\(hours)h sleep")
            }
        }

        if medicinesDue > 0 {
            parts.append("\(medicinesDue) medicines due today")
        }

        return parts.isEmpty ? "No activities recorded yesterday" : parts.joined(separator: " • ")
    }

    static func generateEveningSummary(
        feedingCount: Int,
        totalFeedingMinutes: Int,
        diaperCount: Int,
        sleepHours: Double
    ) -> String {
        var parts: [String] = []

        if feedingCount > 0 {
            parts.append("\(feedingCount) feedings")
        }

        if diaperCount > 0 {
            parts.append("\(diaperCount) diapers")
        }

        if sleepHours > 0 {
            let hours = Int(sleepHours)
            let minutes = Int((sleepHours - Double(hours)) * 60)
            if minutes > 0 {
                parts.append("\(hours)h \(minutes)m sleep")
            } else {
                parts.append("\(hours)h sleep")
            }
        }

        return parts.isEmpty ? "No activities recorded today" : "Today: " + parts.joined(separator: " • ")
    }
}
