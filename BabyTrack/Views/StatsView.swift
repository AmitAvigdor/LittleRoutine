import SwiftUI
import SwiftData
import Charts

enum TimeFilter: String, CaseIterable {
    case today = "Today"
    case week = "This Week"
    case allTime = "All Time"
}

struct DayActivity: Identifiable {
    let id = UUID()
    let type: ActivityType
    let startHour: Double
    let duration: Double // in hours

    enum ActivityType: String, CaseIterable {
        case feeding = "Feeding"
        case sleep = "Sleep"
        case diaper = "Diaper"
        case pump = "Pump"

        var color: Color {
            switch self {
            case .feeding: return .pink
            case .sleep: return .indigo
            case .diaper: return .green
            case .pump: return .blue
            }
        }

        var icon: String {
            switch self {
            case .feeding: return "drop.fill"
            case .sleep: return "moon.fill"
            case .diaper: return "leaf.fill"
            case .pump: return "drop.circle.fill"
            }
        }
    }
}

struct StatsView: View {
    @EnvironmentObject var appState: AppState
    @Query(sort: \FeedingSession.startTime, order: .reverse) private var allFeedingSessions: [FeedingSession]
    @Query(sort: \BottleSession.timestamp, order: .reverse) private var allBottleSessions: [BottleSession]
    @Query(sort: \DiaperChange.timestamp, order: .reverse) private var allDiaperChanges: [DiaperChange]
    @Query(sort: \SleepSession.startTime, order: .reverse) private var allSleepSessions: [SleepSession]
    @Query(sort: \PumpSession.startTime, order: .reverse) private var allPumpSessions: [PumpSession]

    @State private var selectedFilter: TimeFilter = .today

    // Filter by selected baby
    private var feedingSessions: [FeedingSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allFeedingSessions
        }
        return allFeedingSessions.filter { $0.baby?.id == selectedId }
    }

    private var bottleSessions: [BottleSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allBottleSessions
        }
        return allBottleSessions.filter { $0.baby?.id == selectedId }
    }

    private var diaperChanges: [DiaperChange] {
        guard let selectedId = appState.selectedBabyId else {
            return allDiaperChanges
        }
        return allDiaperChanges.filter { $0.baby?.id == selectedId }
    }

    private var sleepSessions: [SleepSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allSleepSessions
        }
        return allSleepSessions.filter { $0.baby?.id == selectedId }
    }

    private var pumpSessions: [PumpSession] {
        guard let selectedId = appState.selectedBabyId else {
            return allPumpSessions
        }
        return allPumpSessions.filter { $0.baby?.id == selectedId }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Filter picker
                    Picker("Time Period", selection: $selectedFilter) {
                        ForEach(TimeFilter.allCases, id: \.self) { filter in
                            Text(filter.rawValue).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Daily timeline diagram (only for Today)
                    if selectedFilter == .today {
                        DailyTimelineCard(activities: todayActivities)
                    }

                    // Feeding stats (breastfeeding + bottle)
                    FeedingStatsCard(
                        breastfeedingSessions: filteredFeedingSessions,
                        bottleSessions: filteredBottleSessions
                    )

                    // Breast balance
                    BreastBalanceCard(sessions: filteredFeedingSessions)

                    // Sleep stats
                    SleepStatsCard(sessions: filteredSleepSessions)

                    // Diaper stats
                    DiaperStatsCard(changes: filteredDiaperChanges)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Statistics")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    BabySwitcher()
                }
            }
        }
    }

    private var filteredFeedingSessions: [FeedingSession] {
        switch selectedFilter {
        case .today:
            return feedingSessions.filter { Calendar.current.isDateInToday($0.date) }
        case .week:
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return feedingSessions.filter { $0.date >= weekAgo }
        case .allTime:
            return feedingSessions
        }
    }

    private var filteredSleepSessions: [SleepSession] {
        switch selectedFilter {
        case .today:
            return sleepSessions.filter { Calendar.current.isDateInToday($0.date) && !$0.isActive }
        case .week:
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return sleepSessions.filter { $0.date >= weekAgo && !$0.isActive }
        case .allTime:
            return sleepSessions.filter { !$0.isActive }
        }
    }

    private var filteredDiaperChanges: [DiaperChange] {
        switch selectedFilter {
        case .today:
            return diaperChanges.filter { Calendar.current.isDateInToday($0.date) }
        case .week:
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return diaperChanges.filter { $0.date >= weekAgo }
        case .allTime:
            return diaperChanges
        }
    }

    private var filteredPumpSessions: [PumpSession] {
        switch selectedFilter {
        case .today:
            return pumpSessions.filter { Calendar.current.isDateInToday($0.date) }
        case .week:
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return pumpSessions.filter { $0.date >= weekAgo }
        case .allTime:
            return pumpSessions
        }
    }

    private var filteredBottleSessions: [BottleSession] {
        switch selectedFilter {
        case .today:
            return bottleSessions.filter { Calendar.current.isDateInToday($0.date) }
        case .week:
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return bottleSessions.filter { $0.date >= weekAgo }
        case .allTime:
            return bottleSessions
        }
    }

    // Combined feeding count (breastfeeding + bottle)
    private var totalFeedingCount: Int {
        filteredFeedingSessions.count + filteredBottleSessions.count
    }

    private var todayActivities: [DayActivity] {
        var activities: [DayActivity] = []
        let calendar = Calendar.current

        // Add breastfeeding sessions
        for session in filteredFeedingSessions {
            let hour = Double(calendar.component(.hour, from: session.startTime)) +
                       Double(calendar.component(.minute, from: session.startTime)) / 60.0
            let durationHours = session.duration / 3600.0
            activities.append(DayActivity(type: .feeding, startHour: hour, duration: max(0.1, durationHours)))
        }

        // Add bottle feeding sessions (estimate 15 min duration for bottle)
        for session in filteredBottleSessions {
            let hour = Double(calendar.component(.hour, from: session.timestamp)) +
                       Double(calendar.component(.minute, from: session.timestamp)) / 60.0
            activities.append(DayActivity(type: .feeding, startHour: hour, duration: 0.25)) // 15 min for bottle
        }

        // Add sleep sessions
        for session in filteredSleepSessions {
            let hour = Double(calendar.component(.hour, from: session.startTime)) +
                       Double(calendar.component(.minute, from: session.startTime)) / 60.0
            let durationHours = session.duration / 3600.0
            activities.append(DayActivity(type: .sleep, startHour: hour, duration: max(0.1, durationHours)))
        }

        // Add diaper changes (show as short events)
        for change in filteredDiaperChanges {
            let hour = Double(calendar.component(.hour, from: change.timestamp)) +
                       Double(calendar.component(.minute, from: change.timestamp)) / 60.0
            activities.append(DayActivity(type: .diaper, startHour: hour, duration: 0.1))
        }

        // Add pump sessions
        for session in filteredPumpSessions {
            let hour = Double(calendar.component(.hour, from: session.startTime)) +
                       Double(calendar.component(.minute, from: session.startTime)) / 60.0
            let durationHours = session.duration / 3600.0
            activities.append(DayActivity(type: .pump, startHour: hour, duration: max(0.1, durationHours)))
        }

        return activities.sorted { $0.startHour < $1.startHour }
    }
}

struct FeedingStatsCard: View {
    let breastfeedingSessions: [FeedingSession]
    let bottleSessions: [BottleSession]

    private var totalSessions: Int {
        breastfeedingSessions.count + bottleSessions.count
    }

    private var totalBreastfeedingDuration: TimeInterval {
        breastfeedingSessions.reduce(0) { $0 + $1.duration }
    }

    private var totalBottleVolume: Double {
        bottleSessions.reduce(0) { $0 + $1.volume }
    }

    private var formattedBreastfeedingTime: String {
        let hours = Int(totalBreastfeedingDuration) / 3600
        let minutes = (Int(totalBreastfeedingDuration) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "drop.circle.fill")
                    .font(.title2)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.purple, .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Feeding")
                    .font(.headline)

                Spacer()
            }

            HStack(spacing: 16) {
                VStack(alignment: .leading) {
                    Text("\(totalSessions)")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Total")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()
                    .frame(height: 40)

                VStack(alignment: .leading) {
                    Text("\(breastfeedingSessions.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.pink)
                    Text("Breast")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading) {
                    Text("\(bottleSessions.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.purple)
                    Text("Bottle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Additional details
            if !breastfeedingSessions.isEmpty || !bottleSessions.isEmpty {
                Divider()

                HStack(spacing: 24) {
                    if !breastfeedingSessions.isEmpty {
                        VStack(alignment: .leading) {
                            Text(formattedBreastfeedingTime)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("Breastfeeding time")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if !bottleSessions.isEmpty {
                        VStack(alignment: .leading) {
                            Text(String(format: "%.1f oz", totalBottleVolume))
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("Bottle volume")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct BreastBalanceCard: View {
    let sessions: [FeedingSession]

    private var leftCount: Int {
        sessions.filter { $0.breastSide == .left }.count
    }

    private var rightCount: Int {
        sessions.filter { $0.breastSide == .right }.count
    }

    private var leftDuration: TimeInterval {
        sessions.filter { $0.breastSide == .left }.reduce(0) { $0 + $1.duration }
    }

    private var rightDuration: TimeInterval {
        sessions.filter { $0.breastSide == .right }.reduce(0) { $0 + $1.duration }
    }

    private var leftPercentage: Double {
        let total = leftDuration + rightDuration
        guard total > 0 else { return 0.5 }
        return leftDuration / total
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "scale.3d")
                    .font(.title2)
                    .foregroundStyle(.purple)

                Text("Breast Balance")
                    .font(.headline)

                Spacer()
            }

            // Balance bar
            GeometryReader { geometry in
                HStack(spacing: 2) {
                    Rectangle()
                        .fill(Color.purple)
                        .frame(width: geometry.size.width * leftPercentage)

                    Rectangle()
                        .fill(Color.pink)
                        .frame(width: geometry.size.width * (1 - leftPercentage))
                }
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .frame(height: 12)

            HStack {
                VStack(alignment: .leading) {
                    HStack {
                        Circle()
                            .fill(Color.purple)
                            .frame(width: 8, height: 8)
                        Text("Left")
                            .font(.subheadline)
                    }
                    Text("\(leftCount) sessions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    HStack {
                        Text("Right")
                            .font(.subheadline)
                        Circle()
                            .fill(Color.pink)
                            .frame(width: 8, height: 8)
                    }
                    Text("\(rightCount) sessions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct SleepStatsCard: View {
    let sessions: [SleepSession]

    private var totalSleep: TimeInterval {
        sessions.reduce(0) { $0 + $1.duration }
    }

    private var napCount: Int {
        sessions.filter { $0.type == .nap }.count
    }

    private var nightSleep: TimeInterval {
        sessions.filter { $0.type == .night }.reduce(0) { $0 + $1.duration }
    }

    private var formattedTotal: String {
        let hours = Int(totalSleep) / 3600
        let minutes = (Int(totalSleep) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    private var formattedNight: String {
        let hours = Int(nightSleep) / 3600
        let minutes = (Int(nightSleep) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "moon.stars.fill")
                    .font(.title2)
                    .foregroundStyle(.indigo)

                Text("Sleep")
                    .font(.headline)

                Spacer()
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text(formattedTotal)
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Total Sleep")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading) {
                    Text("\(napCount)")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Naps")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading) {
                    Text(formattedNight)
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Night Sleep")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct DiaperStatsCard: View {
    let changes: [DiaperChange]

    private var totalChanges: Int {
        changes.count
    }

    private var wetCount: Int {
        changes.filter { $0.type == .wet || $0.type == .both }.count
    }

    private var dirtyCount: Int {
        changes.filter { $0.type == .dirty || $0.type == .both }.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "leaf.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.green)

                Text("Diapers")
                    .font(.headline)

                Spacer()
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text("\(totalChanges)")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Total Changes")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading) {
                    HStack(spacing: 4) {
                        Image(systemName: "drop.fill")
                            .foregroundStyle(.blue)
                        Text("\(wetCount)")
                            .font(.title)
                            .fontWeight(.bold)
                    }
                    Text("Wet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading) {
                    HStack(spacing: 4) {
                        Image(systemName: "leaf.fill")
                            .foregroundStyle(.brown)
                        Text("\(dirtyCount)")
                            .font(.title)
                            .fontWeight(.bold)
                    }
                    Text("Dirty")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct DailyTimelineCard: View {
    let activities: [DayActivity]

    private var currentHour: Double {
        let calendar = Calendar.current
        return Double(calendar.component(.hour, from: Date())) +
               Double(calendar.component(.minute, from: Date())) / 60.0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "calendar.day.timeline.left")
                    .font(.title2)
                    .foregroundStyle(.purple)

                Text("Today's Timeline")
                    .font(.headline)

                Spacer()

                Text(formatCurrentTime())
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if activities.isEmpty {
                Text("No activities recorded yet today")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                // Time header
                HStack(spacing: 0) {
                    Text("")
                        .frame(width: 70)
                    ForEach([0, 6, 12, 18], id: \.self) { hour in
                        Text(formatHour(hour))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                // Gantt rows for each activity type
                VStack(spacing: 8) {
                    ForEach(DayActivity.ActivityType.allCases, id: \.self) { type in
                        GanttRow(
                            type: type,
                            activities: activities.filter { $0.type == type },
                            currentHour: currentHour
                        )
                    }
                }

                // Current time indicator line
                GeometryReader { geometry in
                    let timelineWidth = geometry.size.width - 70
                    let xPosition = 70 + (currentHour / 24.0) * timelineWidth

                    Rectangle()
                        .fill(Color.red)
                        .frame(width: 2)
                        .position(x: xPosition, y: geometry.size.height / 2)
                }
                .frame(height: 4)

                Divider()

                // Activity counts summary
                HStack(spacing: 8) {
                    ForEach(DayActivity.ActivityType.allCases, id: \.self) { type in
                        let count = activities.filter { $0.type == type }.count
                        HStack(spacing: 4) {
                            Image(systemName: type.icon)
                                .font(.caption)
                                .foregroundStyle(type.color)
                            Text("\(count)")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private func formatHour(_ hour: Int) -> String {
        switch hour {
        case 0: return "12a"
        case 6: return "6a"
        case 12: return "12p"
        case 18: return "6p"
        default: return "\(hour)"
        }
    }

    private func formatCurrentTime() -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: Date())
    }
}

struct GanttRow: View {
    let type: DayActivity.ActivityType
    let activities: [DayActivity]
    let currentHour: Double

    var body: some View {
        HStack(spacing: 0) {
            // Label
            HStack(spacing: 4) {
                Image(systemName: type.icon)
                    .font(.caption)
                    .foregroundStyle(type.color)
                Text(type.rawValue)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 70, alignment: .leading)

            // Timeline bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.1))
                        .frame(height: 24)

                    // Activity blocks
                    ForEach(activities) { activity in
                        let startX = (activity.startHour / 24.0) * geometry.size.width
                        let width = max(4, (activity.duration / 24.0) * geometry.size.width)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(type.color.opacity(0.8))
                            .frame(width: width, height: 20)
                            .offset(x: startX)
                    }

                    // Current time marker
                    let nowX = (currentHour / 24.0) * geometry.size.width
                    Rectangle()
                        .fill(Color.red.opacity(0.6))
                        .frame(width: 2, height: 24)
                        .offset(x: nowX)
                }
            }
            .frame(height: 24)
        }
    }
}

#Preview {
    StatsView()
        .modelContainer(for: [FeedingSession.self, BottleSession.self, DiaperChange.self, SleepSession.self, PumpSession.self], inMemory: true)
}
