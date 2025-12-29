import SwiftUI
import SwiftData
// import CloudKit // TODO: Enable for Partner Sync in v2

@main
struct BabyTrackApp: App {
    let modelContainer: ModelContainer
    @StateObject private var appState = AppState()

    init() {
        do {
            let schema = Schema([
                Baby.self,
                FeedingSession.self,
                DiaperChange.self,
                SleepSession.self,
                PumpSession.self,
                BottleSession.self,
                MilkStash.self,
                GrowthEntry.self,
                Milestone.self,
                Medicine.self,
                MedicineLog.self,
                AppSettings.self,
                PediatricianNote.self,
                Vaccination.self,
                SolidFood.self,
                TeethingEvent.self,
                DiaryEntry.self
            ])

            // Use local storage only for v1
            // TODO: Change to .automatic for Partner Sync in v2
            let modelConfiguration = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false,
                cloudKitDatabase: .none
            )

            modelContainer = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )
        } catch {
            fatalError("Could not initialize ModelContainer: \(error)")
        }

        requestNotificationPermission()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
            // TODO: Enable for Partner Sync in v2
            // .onOpenURL { url in
            //     handleIncomingURL(url)
            // }
        }
        .modelContainer(modelContainer)
    }

    // TODO: Enable for Partner Sync in v2
    // private func handleIncomingURL(_ url: URL) {
    //     CloudKitSharingManager.shared.handleIncomingURL(url)
    // }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }
}

// MARK: - App State

class AppState: ObservableObject {
    @Published var isNightModeEnabled: Bool = false
    @Published var currentUserName: String = "Parent"
    @Published var selectedBabyId: UUID? {
        didSet {
            // Persist to UserDefaults
            if let id = selectedBabyId {
                UserDefaults.standard.set(id.uuidString, forKey: "selectedBabyId")
            } else {
                UserDefaults.standard.removeObject(forKey: "selectedBabyId")
            }
        }
    }

    init() {
        // Load persisted baby selection
        if let idString = UserDefaults.standard.string(forKey: "selectedBabyId"),
           let id = UUID(uuidString: idString) {
            selectedBabyId = id
        }
    }

    var nightModeColors: NightModeColors {
        NightModeColors(enabled: isNightModeEnabled)
    }

    func checkAutoNightMode(settings: AppSettings?) {
        guard let settings = settings, settings.nightModeAutoEnabled else { return }
        isNightModeEnabled = settings.shouldEnableNightMode
    }

    func selectBaby(_ baby: Baby) {
        selectedBabyId = baby.id
    }

    func autoSelectFirstBabyIfNeeded(babies: [Baby]) {
        // If no baby is selected but babies exist, select the first one
        if selectedBabyId == nil, let firstBaby = babies.first {
            selectBaby(firstBaby)
        }
        // If selected baby no longer exists, select first available
        if let selectedId = selectedBabyId,
           !babies.contains(where: { $0.id == selectedId }),
           let firstBaby = babies.first {
            selectBaby(firstBaby)
        }
    }
}

struct NightModeColors {
    let enabled: Bool

    var background: Color {
        enabled ? Color(red: 0.1, green: 0.05, blue: 0.05) : Color(.systemGroupedBackground)
    }

    var cardBackground: Color {
        enabled ? Color(red: 0.15, green: 0.08, blue: 0.08) : Color(.systemBackground)
    }

    var text: Color {
        enabled ? Color(red: 0.8, green: 0.4, blue: 0.4) : .primary
    }

    var secondaryText: Color {
        enabled ? Color(red: 0.6, green: 0.3, blue: 0.3) : .secondary
    }

    var accent: Color {
        enabled ? Color(red: 0.6, green: 0.2, blue: 0.2) : .purple
    }
}
