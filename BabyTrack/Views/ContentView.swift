import SwiftUI
import SwiftData

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @Query private var settings: [AppSettings]
    @Query private var babies: [Baby]

    // Legal consent tracking
    @AppStorage("hasAcceptedTerms") private var hasAcceptedTerms = false
    @State private var showConsentScreen = false

    var body: some View {
        Group {
            if hasAcceptedTerms {
                MainTabView()
                    .preferredColorScheme(appState.isNightModeEnabled ? .dark : nil)
                    .tint(appState.isNightModeEnabled ? appState.nightModeColors.accent : .purple)
                    .onAppear {
                        appState.checkAutoNightMode(settings: settings.first)
                        appState.autoSelectFirstBabyIfNeeded(babies: babies)
                    }
                    .onChange(of: babies.count) { _, _ in
                        // Re-check baby selection when babies change
                        appState.autoSelectFirstBabyIfNeeded(babies: babies)
                    }
            } else {
                FirstLaunchConsentView {
                    // Terms accepted, view will automatically update
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
        .modelContainer(for: [FeedingSession.self, DiaperChange.self, SleepSession.self], inMemory: true)
}
