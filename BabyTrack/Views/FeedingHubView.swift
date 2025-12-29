import SwiftUI
import SwiftData

enum FeedingTab: String, CaseIterable {
    case breast = "Breast"
    case pump = "Pump"
    case bottle = "Bottle"

    var icon: String {
        switch self {
        case .breast: return "drop.circle.fill"
        case .pump: return "arrow.down.circle.fill"
        case .bottle: return "waterbottle.fill"
        }
    }
}

struct FeedingHubView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab: FeedingTab = .breast

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Segmented control
                Picker("Feeding Type", selection: $selectedTab) {
                    ForEach(FeedingTab.allCases, id: \.self) { tab in
                        Label(tab.rawValue, systemImage: tab.icon)
                            .tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                TabView(selection: $selectedTab) {
                    FeedingView()
                        .tag(FeedingTab.breast)

                    PumpView()
                        .tag(FeedingTab.pump)

                    BottleView()
                        .tag(FeedingTab.bottle)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Feeding")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    BabySwitcher()
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: MilkStashView()) {
                        Image(systemName: "refrigerator.fill")
                    }
                }
            }
        }
    }
}

#Preview {
    FeedingHubView()
        .environmentObject(AppState())
        .modelContainer(for: [FeedingSession.self, PumpSession.self, BottleSession.self], inMemory: true)
}
