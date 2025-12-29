import SwiftUI
import HealthKit

struct HealthKitSettingsView: View {
    @StateObject private var healthKitManager = HealthKitManager.shared
    @State private var isRequestingAuthorization = false
    @State private var showingError = false
    @State private var errorMessage = ""

    var body: some View {
        Form {
            Section {
                HStack(spacing: 16) {
                    Image(systemName: "heart.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.red)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Apple Health")
                            .font(.headline)
                        Text("Sync growth data with Apple Health")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            }

            Section {
                if !healthKitManager.isHealthKitAvailable {
                    HStack {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.red)
                        Text("HealthKit is not available on this device")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Authorization Status")
                            Text(authorizationStatusText)
                                .font(.caption)
                                .foregroundStyle(authorizationStatusColor)
                        }

                        Spacer()

                        if healthKitManager.isAuthorized {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        } else {
                            Button {
                                requestAuthorization()
                            } label: {
                                if isRequestingAuthorization {
                                    ProgressView()
                                } else {
                                    Text("Enable")
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(isRequestingAuthorization)
                        }
                    }
                }
            } header: {
                Text("Connection Status")
            }

            if healthKitManager.isAuthorized {
                Section {
                    HealthKitFeatureRow(
                        icon: "scalemass.fill",
                        title: "Weight",
                        description: "Sync baby's weight measurements"
                    )

                    HealthKitFeatureRow(
                        icon: "ruler.fill",
                        title: "Height",
                        description: "Sync baby's height measurements"
                    )
                } header: {
                    Text("Synced Data")
                } footer: {
                    Text("Growth measurements from the Growth Tracking section will be saved to Apple Health automatically.")
                }
            }

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    InfoRow(
                        icon: "lock.shield.fill",
                        title: "Privacy First",
                        description: "Your data stays on your device and in Apple Health. We never upload health data to external servers."
                    )

                    InfoRow(
                        icon: "arrow.triangle.2.circlepath",
                        title: "One-Way Sync",
                        description: "Data is written from LittleRoutine to Apple Health. Changes in Apple Health won't affect the app."
                    )

                    InfoRow(
                        icon: "gear",
                        title: "Manage Permissions",
                        description: "You can change HealthKit permissions anytime in Settings > Privacy > Health."
                    )
                }
            } header: {
                Text("How It Works")
            }
        }
        .navigationTitle("Apple Health")
        .onAppear {
            Task {
                await healthKitManager.updateAuthorizationStatus()
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private var authorizationStatusText: String {
        switch healthKitManager.authorizationStatus {
        case .notDetermined:
            return "Not configured"
        case .sharingDenied:
            return "Access denied - enable in Settings"
        case .sharingAuthorized:
            return "Connected"
        @unknown default:
            return "Unknown"
        }
    }

    private var authorizationStatusColor: Color {
        switch healthKitManager.authorizationStatus {
        case .sharingAuthorized:
            return .green
        case .sharingDenied:
            return .red
        default:
            return .secondary
        }
    }

    private func requestAuthorization() {
        isRequestingAuthorization = true

        Task {
            do {
                try await healthKitManager.requestAuthorization()
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showingError = true
                }
            }

            await MainActor.run {
                isRequestingAuthorization = false
            }
        }
    }
}

// MARK: - Supporting Views

private struct HealthKitFeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.purple)
                .frame(width: 32)

            VStack(alignment: .leading) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        }
    }
}

private struct InfoRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.purple)
                .frame(width: 24)

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

#Preview {
    NavigationStack {
        HealthKitSettingsView()
    }
}
