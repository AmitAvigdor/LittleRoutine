import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedingHubView()
                .tabItem {
                    Label("Feed", systemImage: "drop.circle.fill")
                }
                .tag(0)

            SleepView()
                .tabItem {
                    Label("Sleep", systemImage: "moon.stars.fill")
                }
                .tag(1)

            DiaperView()
                .tabItem {
                    Label("Diaper", systemImage: "leaf.circle.fill")
                }
                .tag(2)

            StatsView()
                .tabItem {
                    Label("Stats", systemImage: "chart.bar.fill")
                }
                .tag(3)

            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
                .tag(4)
        }
        .tint(appState.isNightModeEnabled ? appState.nightModeColors.accent : .purple)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppState())
        .modelContainer(for: [FeedingSession.self, DiaperChange.self, SleepSession.self], inMemory: true)
}
