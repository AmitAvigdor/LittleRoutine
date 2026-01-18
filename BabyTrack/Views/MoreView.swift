import SwiftUI
import SwiftData

struct MoreView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]
    @Query private var babies: [Baby]

    var currentSettings: AppSettings? {
        settings.first
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    @State private var showingEditBaby = false
    @State private var showingBabyPicker = false

    var body: some View {
        NavigationStack {
            List {
                // Current Baby Section
                Section {
                    if let baby = currentBaby {
                        Button {
                            showingBabyPicker = true
                        } label: {
                            HStack {
                                Circle()
                                    .fill(baby.displayColor)
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Text(baby.initials)
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                    )

                                VStack(alignment: .leading) {
                                    Text(baby.name)
                                        .font(.headline)
                                        .foregroundStyle(.primary)
                                    if let age = baby.age {
                                        Text(age)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                Spacer()

                                if babies.count > 1 {
                                    Text("Switch")
                                        .font(.caption)
                                        .foregroundStyle(.purple)
                                }

                                Image(systemName: "chevron.down")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    } else {
                        NavigationLink(destination: BabyListView()) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title)
                                    .foregroundStyle(.purple)

                                Text("Add a Baby")
                                    .font(.headline)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                // Babies Section
                Section("Babies") {
                    if currentBaby != nil {
                        Button {
                            showingEditBaby = true
                        } label: {
                            Label("Edit Baby Profile", systemImage: "pencil")
                        }
                    }

                    NavigationLink(destination: BabyListView()) {
                        Label("Manage All Babies", systemImage: "person.2.fill")
                    }
                }

                // Features Section
                Section("Features") {
                    NavigationLink(destination: GrowthView()) {
                        Label("Growth Tracking", systemImage: "chart.line.uptrend.xyaxis")
                    }

                    NavigationLink(destination: MilestoneView()) {
                        Label("Milestones", systemImage: "star.fill")
                    }

                    NavigationLink(destination: MedicineView()) {
                        Label("Medicine & Vitamins", systemImage: "pills.fill")
                    }

                    NavigationLink(destination: VaccinationView()) {
                        Label("Vaccinations", systemImage: "syringe")
                    }

                    NavigationLink(destination: SolidFoodView()) {
                        Label("Solid Foods", systemImage: "carrot.fill")
                    }

                    NavigationLink(destination: TeethingView()) {
                        Label("Teething", systemImage: "mouth.fill")
                    }

                    NavigationLink(destination: PhotoDiaryView()) {
                        Label("Photo Diary", systemImage: "book.closed.fill")
                    }

                    NavigationLink(destination: PediatricianNotesView()) {
                        Label("Notes for Pediatrician", systemImage: "note.text")
                    }
                }

                // Export Section
                Section("Reports") {
                    NavigationLink(destination: PDFExportView()) {
                        Label("Export PDF Report", systemImage: "doc.text.fill")
                    }

                    NavigationLink(destination: DataExportView()) {
                        Label("Export Data (CSV/JSON)", systemImage: "square.and.arrow.up")
                    }
                }

                // Settings Section
                Section("Settings") {
                    NavigationLink(destination: SettingsView()) {
                        Label("App Settings", systemImage: "gear")
                    }

                    NavigationLink(destination: NightModeSettingsView()) {
                        Label("Night Mode", systemImage: "moon.fill")
                    }

                    NavigationLink(destination: ReminderSettingsView()) {
                        Label("Reminders", systemImage: "bell.fill")
                    }

                    NavigationLink(destination: DailySummarySettingsView()) {
                        Label("Daily Summary", systemImage: "sun.max.fill")
                    }

                    // TODO: Enable for Partner Sync in v2
                    // NavigationLink(destination: SyncSettingsView()) {
                    //     Label("Partner Sync", systemImage: "person.2.fill")
                    // }
                }

                // Legal & Privacy Section
                Section("Legal") {
                    NavigationLink(destination: DataPrivacyInfoView()) {
                        Label("Data & Privacy", systemImage: "hand.raised.fill")
                    }

                    NavigationLink(destination: PrivacyPolicyView()) {
                        Label("Privacy Policy", systemImage: "doc.text.fill")
                    }

                    NavigationLink(destination: TermsOfServiceView()) {
                        Label("Terms of Service", systemImage: "doc.plaintext.fill")
                    }
                }

                // About Section
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("More")
            .sheet(isPresented: $showingEditBaby) {
                if let baby = currentBaby {
                    EditBabyView(baby: baby)
                }
            }
            .sheet(isPresented: $showingBabyPicker) {
                BabyPickerSheet(currentBaby: currentBaby)
            }
        }
    }
}

// MARK: - Baby Profile View

struct BabyProfileView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]

    @State private var babyName: String = ""
    @State private var birthDate: Date = Date()
    @State private var userName: String = ""
    @State private var partnerName: String = ""

    var body: some View {
        Form {
            Section("Baby Information") {
                TextField("Baby's Name", text: $babyName)
                DatePicker("Birth Date", selection: $birthDate, displayedComponents: .date)
            }

            Section("Parents") {
                TextField("Your Name", text: $userName)
                TextField("Partner's Name", text: $partnerName)
            }

            Section {
                AnimatedSaveButton("Save") {
                    saveSettings()
                }
            }
        }
        .navigationTitle("Baby Profile")
        .onAppear {
            loadSettings()
        }
    }

    private func loadSettings() {
        if let s = settings.first {
            babyName = s.babyName ?? ""
            birthDate = s.babyBirthDate ?? Date()
            userName = s.userName ?? ""
            partnerName = s.partnerName ?? ""
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.babyName = babyName.isEmpty ? nil : babyName
        s.babyBirthDate = birthDate
        s.userName = userName.isEmpty ? nil : userName
        s.partnerName = partnerName.isEmpty ? nil : partnerName
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]

    @State private var volumeUnit: VolumeUnit = .oz
    @State private var weightUnit: WeightUnit = .lbs
    @State private var lengthUnit: LengthUnit = .inches

    var body: some View {
        Form {
            Section("Preferred Units") {
                Picker("Volume", selection: $volumeUnit) {
                    ForEach(VolumeUnit.allCases, id: \.self) { unit in
                        Text(unit.rawValue).tag(unit)
                    }
                }

                Picker("Weight", selection: $weightUnit) {
                    ForEach(WeightUnit.allCases, id: \.self) { unit in
                        Text(unit.rawValue).tag(unit)
                    }
                }

                Picker("Length", selection: $lengthUnit) {
                    ForEach(LengthUnit.allCases, id: \.self) { unit in
                        Text(unit.rawValue).tag(unit)
                    }
                }
            }

            Section {
                AnimatedSaveButton("Save Preferences") {
                    saveSettings()
                }
            }
        }
        .navigationTitle("App Settings")
        .onAppear {
            loadSettings()
        }
    }

    private func loadSettings() {
        if let s = settings.first {
            volumeUnit = s.preferredVolumeUnit
            weightUnit = s.preferredWeightUnit
            lengthUnit = s.preferredLengthUnit
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.preferredVolumeUnit = volumeUnit
        s.preferredWeightUnit = weightUnit
        s.preferredLengthUnit = lengthUnit
    }
}

// MARK: - Night Mode Settings

struct NightModeSettingsView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]

    @State private var autoEnabled: Bool = false
    @State private var startHour: Int = 22
    @State private var endHour: Int = 6
    @State private var silentMode: Bool = true

    var body: some View {
        Form {
            Section {
                Toggle("Enable Night Mode", isOn: $appState.isNightModeEnabled)
            }

            Section("Automatic Schedule") {
                Toggle("Auto-enable at night", isOn: $autoEnabled)

                if autoEnabled {
                    Picker("Start Time", selection: $startHour) {
                        ForEach(0..<24, id: \.self) { hour in
                            Text(formatHour(hour)).tag(hour)
                        }
                    }

                    Picker("End Time", selection: $endHour) {
                        ForEach(0..<24, id: \.self) { hour in
                            Text(formatHour(hour)).tag(hour)
                        }
                    }
                }
            }

            Section("Options") {
                Toggle("Silent Mode (no sounds)", isOn: $silentMode)
            }

            Section("Preview") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Night mode uses dim red tones to protect your eyes during nighttime feedings.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 16) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(red: 0.1, green: 0.05, blue: 0.05))
                            .frame(height: 40)
                            .overlay(
                                Text("Background")
                                    .font(.caption)
                                    .foregroundStyle(Color(red: 0.8, green: 0.4, blue: 0.4))
                            )

                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(red: 0.6, green: 0.2, blue: 0.2))
                            .frame(height: 40)
                            .overlay(
                                Text("Accent")
                                    .font(.caption)
                                    .foregroundStyle(.white)
                            )
                    }
                }
            }

            Section {
                AnimatedSaveButton("Save Settings") {
                    saveSettings()
                }
            }
        }
        .navigationTitle("Night Mode")
        .onAppear {
            loadSettings()
        }
    }

    private func formatHour(_ hour: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return formatter.string(from: date)
    }

    private func loadSettings() {
        if let s = settings.first {
            autoEnabled = s.nightModeAutoEnabled
            startHour = s.nightModeStartHour
            endHour = s.nightModeEndHour
            silentMode = s.nightModeSilent
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.nightModeAutoEnabled = autoEnabled
        s.nightModeStartHour = startHour
        s.nightModeEndHour = endHour
        s.nightModeSilent = silentMode
    }
}

// MARK: - Reminder Settings

struct ReminderSettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]
    @Query(filter: #Predicate<Medicine> { $0.isActive }) private var activeMedicines: [Medicine]

    @State private var feedingEnabled: Bool = false
    @State private var feedingInterval: Int = 180
    @State private var diaperEnabled: Bool = false
    @State private var diaperInterval: Int = 120
    @State private var medicineEnabled: Bool = false
    @State private var medicineMinutesBefore: Int = 15

    var body: some View {
        Form {
            Section("Feeding Reminders") {
                Toggle("Enable", isOn: $feedingEnabled)

                if feedingEnabled {
                    Picker("Remind every", selection: $feedingInterval) {
                        Text("1 hour").tag(60)
                        Text("1.5 hours").tag(90)
                        Text("2 hours").tag(120)
                        Text("2.5 hours").tag(150)
                        Text("3 hours").tag(180)
                        Text("4 hours").tag(240)
                    }
                }
            }

            Section("Diaper Reminders") {
                Toggle("Enable", isOn: $diaperEnabled)

                if diaperEnabled {
                    Picker("Remind every", selection: $diaperInterval) {
                        Text("1 hour").tag(60)
                        Text("1.5 hours").tag(90)
                        Text("2 hours").tag(120)
                        Text("3 hours").tag(180)
                    }
                }
            }

            Section {
                Toggle("Enable", isOn: $medicineEnabled)

                if medicineEnabled {
                    Picker("Remind before due", selection: $medicineMinutesBefore) {
                        Text("At due time").tag(0)
                        Text("5 minutes before").tag(5)
                        Text("15 minutes before").tag(15)
                        Text("30 minutes before").tag(30)
                        Text("1 hour before").tag(60)
                    }
                }

                if !activeMedicines.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Active Medications:")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        ForEach(activeMedicines) { med in
                            HStack {
                                Image(systemName: "pills.fill")
                                    .foregroundStyle(.red)
                                    .font(.caption)
                                Text(med.name)
                                    .font(.subheadline)
                                Spacer()
                                Text(med.frequency.rawValue)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            } header: {
                Text("Medicine & Vitamins Reminders")
            } footer: {
                Text("Reminders will be sent based on each medication's schedule. Add medications in the Medicine section.")
            }

            Section {
                AnimatedSaveButton("Save Reminders") {
                    saveSettings()
                }
            }
        }
        .navigationTitle("Reminders")
        .onAppear {
            loadSettings()
        }
    }

    private func loadSettings() {
        if let s = settings.first {
            feedingEnabled = s.feedingReminderEnabled
            feedingInterval = s.feedingReminderInterval
            diaperEnabled = s.diaperReminderEnabled
            diaperInterval = s.diaperReminderInterval
            medicineEnabled = s.medicineReminderEnabled
            medicineMinutesBefore = s.medicineReminderMinutesBefore
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.feedingReminderEnabled = feedingEnabled
        s.feedingReminderInterval = feedingInterval
        s.diaperReminderEnabled = diaperEnabled
        s.diaperReminderInterval = diaperInterval
        s.medicineReminderEnabled = medicineEnabled
        s.medicineReminderMinutesBefore = medicineMinutesBefore

        // Schedule medicine notifications if enabled
        if medicineEnabled {
            scheduleMedicineNotifications()
        } else {
            cancelMedicineNotifications()
        }
    }

    private func scheduleMedicineNotifications() {
        let center = UNUserNotificationCenter.current()

        // Request permission
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }

            // Remove existing medicine notifications
            center.removePendingNotificationRequests(withIdentifiers: activeMedicines.map { "medicine-\($0.id)" })

            // Schedule new notifications for each active medicine
            for medicine in activeMedicines {
                guard let nextDue = medicine.nextDueDate else { continue }

                let reminderTime = Calendar.current.date(
                    byAdding: .minute,
                    value: -medicineMinutesBefore,
                    to: nextDue
                ) ?? nextDue

                // Only schedule if reminder time is in the future
                guard reminderTime > Date() else { continue }

                let content = UNMutableNotificationContent()
                content.title = "Medicine Reminder"
                content.body = "Time to give \(medicine.name) (\(medicine.dosage))"
                content.sound = .default

                let components = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute],
                    from: reminderTime
                )
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)

                let request = UNNotificationRequest(
                    identifier: "medicine-\(medicine.id)",
                    content: content,
                    trigger: trigger
                )

                center.add(request)
            }
        }
    }

    private func cancelMedicineNotifications() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: activeMedicines.map { "medicine-\($0.id)" })
    }
}

// MARK: - Daily Summary Settings

struct DailySummarySettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]
    @Query private var babies: [Baby]
    @EnvironmentObject var appState: AppState

    @State private var dailySummaryEnabled = false
    @State private var morningSummaryEnabled = true
    @State private var morningSummaryHour = 8
    @State private var eveningSummaryEnabled = true
    @State private var eveningSummaryHour = 20

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var body: some View {
        Form {
            Section {
                Toggle("Enable Daily Summaries", isOn: $dailySummaryEnabled)
            } footer: {
                Text("Get a daily overview of your baby's activities delivered as notifications.")
            }

            if dailySummaryEnabled {
                Section {
                    Toggle("Enable", isOn: $morningSummaryEnabled)

                    if morningSummaryEnabled {
                        Picker("Time", selection: $morningSummaryHour) {
                            ForEach(5..<12, id: \.self) { hour in
                                Text(formatHour(hour)).tag(hour)
                            }
                        }
                    }
                } header: {
                    Text("Morning Summary")
                } footer: {
                    Text("Receive yesterday's summary to start your day.")
                }

                Section {
                    Toggle("Enable", isOn: $eveningSummaryEnabled)

                    if eveningSummaryEnabled {
                        Picker("Time", selection: $eveningSummaryHour) {
                            ForEach(17..<24, id: \.self) { hour in
                                Text(formatHour(hour)).tag(hour)
                            }
                        }
                    }
                } header: {
                    Text("Evening Summary")
                } footer: {
                    Text("Get a recap of today's activities.")
                }

                Section("Preview") {
                    VStack(alignment: .leading, spacing: 12) {
                        if morningSummaryEnabled {
                            HStack {
                                Image(systemName: "sun.max.fill")
                                    .foregroundStyle(.orange)
                                VStack(alignment: .leading) {
                                    Text("Morning Summary")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    Text("Yesterday: 8 feedings • 6 diapers • 12h sleep")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        if eveningSummaryEnabled {
                            HStack {
                                Image(systemName: "moon.fill")
                                    .foregroundStyle(.purple)
                                VStack(alignment: .leading) {
                                    Text("Evening Summary")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    Text("Today: 6 feedings • 5 diapers • 3h naps")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }

            Section {
                AnimatedSaveButton("Save Settings") {
                    saveSettings()
                }
            }
        }
        .navigationTitle("Daily Summary")
        .onAppear {
            loadSettings()
        }
    }

    private func formatHour(_ hour: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return formatter.string(from: date)
    }

    private func loadSettings() {
        if let s = settings.first {
            dailySummaryEnabled = s.dailySummaryEnabled
            morningSummaryEnabled = s.morningSummaryEnabled
            morningSummaryHour = s.morningSummaryHour
            eveningSummaryEnabled = s.eveningSummaryEnabled
            eveningSummaryHour = s.eveningSummaryHour
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.dailySummaryEnabled = dailySummaryEnabled
        s.morningSummaryEnabled = morningSummaryEnabled
        s.morningSummaryHour = morningSummaryHour
        s.eveningSummaryEnabled = eveningSummaryEnabled
        s.eveningSummaryHour = eveningSummaryHour

        // Schedule or cancel notifications
        DailySummaryManager.shared.scheduleNotifications(
            settings: s,
            babyName: currentBaby?.name
        )
    }
}

// MARK: - Sync Settings
// TODO: Enable for Partner Sync in v2

/*
struct SyncSettingsView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.modelContext) private var modelContext
    @Query private var settings: [AppSettings]
    @StateObject private var sharingManager = CloudKitSharingManager.shared

    @State private var iCloudEnabled: Bool = false
    @State private var showingPartnerInvite: Bool = false

    var body: some View {
        Form {
            // Same Apple ID sync
            Section {
                Toggle("Enable iCloud Sync", isOn: $iCloudEnabled)
            } footer: {
                Text("Syncs automatically between your own devices signed into the same iCloud account.")
            }

            // Different Apple ID sharing
            Section {
                NavigationLink {
                    PartnerInviteView()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Partner Sharing")
                                .font(.body)
                            Text("Share with a different Apple ID")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if sharingManager.isShared {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                    }
                }
            } footer: {
                Text("Invite your partner to share baby data even if they use a different Apple ID.")
            }

            Section("How Partner Sync Works") {
                VStack(alignment: .leading, spacing: 12) {
                    SyncFeatureRow(
                        icon: "1.circle.fill",
                        title: "Same Apple ID",
                        description: "Enable iCloud Sync above - data syncs automatically"
                    )
                    SyncFeatureRow(
                        icon: "2.circle.fill",
                        title: "Different Apple ID",
                        description: "Use Partner Sharing to create an invite link"
                    )
                    SyncFeatureRow(
                        icon: "arrow.triangle.2.circlepath",
                        title: "Real-time Updates",
                        description: "Both parents see changes instantly"
                    )
                }
            }

            if iCloudEnabled {
                Section("Sync Status") {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Connected to iCloud")
                    }

                    if let lastSync = settings.first?.lastSyncDate {
                        HStack {
                            Text("Last synced")
                            Spacer()
                            Text(lastSync, style: .relative)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if sharingManager.isShared && !sharingManager.participants.isEmpty {
                Section("Sharing With") {
                    ForEach(sharingManager.participants, id: \.self) { name in
                        HStack {
                            Image(systemName: "person.fill")
                                .foregroundStyle(.purple)
                            Text(name)
                        }
                    }
                }
            }

            Section {
                Button("Save") {
                    saveSettings()
                }
                .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Partner Sync")
        .onAppear {
            loadSettings()
            Task {
                await sharingManager.fetchParticipants()
            }
        }
    }

    private func loadSettings() {
        if let s = settings.first {
            iCloudEnabled = s.iCloudSyncEnabled
        }
    }

    private func saveSettings() {
        let s: AppSettings
        if let existing = settings.first {
            s = existing
        } else {
            s = AppSettings()
            modelContext.insert(s)
        }

        s.iCloudSyncEnabled = iCloudEnabled
    }
}

struct SyncFeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.purple)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
*/

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.purple)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    MoreView()
        .environmentObject(AppState())
        .modelContainer(for: AppSettings.self, inMemory: true)
}
