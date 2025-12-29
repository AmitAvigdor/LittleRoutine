// TODO: Enable for Partner Sync in v2
// This file contains CloudKit Sharing functionality for syncing between different Apple IDs
// Uncomment and configure when ready to implement Partner Sync feature

/*
import Foundation
import CloudKit
import SwiftUI

/// Manages CloudKit sharing between partners with different Apple IDs
@MainActor
class CloudKitSharingManager: ObservableObject {
    static let shared = CloudKitSharingManager()

    @Published var isShared: Bool = false
    @Published var shareURL: URL?
    @Published var participants: [String] = []
    @Published var errorMessage: String?
    @Published var isLoading: Bool = false

    private let container = CKContainer(identifier: "iCloud.com.babytrack.app")
    private let recordZone = CKRecordZone(zoneName: "BabyTrackZone")

    private init() {}

    // MARK: - Setup Shared Zone

    /// Creates a custom zone for sharing (required for CloudKit Sharing)
    func setupSharedZone() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let database = container.privateCloudDatabase
            try await database.save(recordZone)
            print("Shared zone created successfully")
        } catch {
            // Zone might already exist, which is fine
            print("Zone setup: \(error.localizedDescription)")
        }
    }

    // MARK: - Create Share

    /// Creates a share link that can be sent to partner
    func createShareLink() async -> URL? {
        isLoading = true
        defer { isLoading = false }

        do {
            let database = container.privateCloudDatabase

            // Create a root record to share (represents the baby/family)
            let rootRecord = CKRecord(recordType: "Family", recordID: CKRecord.ID(zoneID: recordZone.zoneID))
            rootRecord["name"] = "Baby Data" as CKRecordValue
            rootRecord["createdAt"] = Date() as CKRecordValue

            // Save the root record first
            try await database.save(rootRecord)

            // Create a share for this record
            let share = CKShare(rootRecord: rootRecord)
            share[CKShare.SystemFieldKey.title] = "LittleRoutine Data" as CKRecordValue
            share.publicPermission = .none // Only invited participants

            // Save the share
            let modifyOperation = CKModifyRecordsOperation(recordsToSave: [rootRecord, share], recordIDsToDelete: nil)
            modifyOperation.savePolicy = .changedKeys

            try await database.modifyRecords(saving: [rootRecord, share], deleting: [])

            // Get the share URL
            self.shareURL = share.url
            self.isShared = true

            return share.url
        } catch {
            errorMessage = "Failed to create share: \(error.localizedDescription)"
            return nil
        }
    }

    // MARK: - Accept Share

    /// Accepts a share invitation (called when partner opens the share link)
    func acceptShare(from metadata: CKShare.Metadata) async -> Bool {
        isLoading = true
        defer { isLoading = false }

        do {
            let operation = CKAcceptSharesOperation(shareMetadatas: [metadata])

            return await withCheckedContinuation { continuation in
                operation.acceptSharesResultBlock = { result in
                    switch result {
                    case .success:
                        Task { @MainActor in
                            self.isShared = true
                        }
                        continuation.resume(returning: true)
                    case .failure(let error):
                        Task { @MainActor in
                            self.errorMessage = error.localizedDescription
                        }
                        continuation.resume(returning: false)
                    }
                }
                container.add(operation)
            }
        }
    }

    // MARK: - Get Participants

    /// Fetches current share participants
    func fetchParticipants() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let database = container.sharedCloudDatabase
            let zones = try await database.allRecordZones()

            var allParticipants: [String] = []

            for zone in zones {
                if let share = try? await database.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: zone.zoneID)) as? CKShare {
                    for participant in share.participants {
                        if let name = participant.userIdentity.nameComponents?.formatted() {
                            allParticipants.append(name)
                        } else {
                            allParticipants.append("Partner")
                        }
                    }
                }
            }

            self.participants = allParticipants
        } catch {
            print("Error fetching participants: \(error)")
        }
    }

    // MARK: - Stop Sharing

    func stopSharing() async {
        isLoading = true
        defer { isLoading = false }

        // In a full implementation, you would delete the CKShare record
        isShared = false
        shareURL = nil
        participants = []
    }
}

// MARK: - Share Link View

struct PartnerInviteView: View {
    @StateObject private var sharingManager = CloudKitSharingManager.shared
    @State private var showingShareSheet = false
    @State private var inviteLink: URL?

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "person.2.fill")
                            .font(.title)
                            .foregroundStyle(.purple)

                        VStack(alignment: .leading) {
                            Text("Partner Sync")
                                .font(.headline)
                            Text("Share data with your partner using different Apple IDs")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if sharingManager.isShared {
                Section("Sharing Status") {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Sharing is active")
                    }

                    if !sharingManager.participants.isEmpty {
                        ForEach(sharingManager.participants, id: \.self) { name in
                            HStack {
                                Image(systemName: "person.fill")
                                Text(name)
                            }
                        }
                    }

                    Button(role: .destructive) {
                        Task {
                            await sharingManager.stopSharing()
                        }
                    } label: {
                        Label("Stop Sharing", systemImage: "xmark.circle")
                    }
                }
            } else {
                Section("Invite Partner") {
                    Button {
                        Task {
                            if let url = await sharingManager.createShareLink() {
                                inviteLink = url
                                showingShareSheet = true
                            }
                        }
                    } label: {
                        if sharingManager.isLoading {
                            ProgressView()
                        } else {
                            Label("Create Invite Link", systemImage: "link.badge.plus")
                        }
                    }
                    .disabled(sharingManager.isLoading)
                }
            }

            Section("How it works") {
                VStack(alignment: .leading, spacing: 16) {
                    StepRow(number: 1, text: "Create an invite link")
                    StepRow(number: 2, text: "Send the link to your partner via Messages, Email, or AirDrop")
                    StepRow(number: 3, text: "Partner opens the link and accepts the invitation")
                    StepRow(number: 4, text: "All data syncs automatically between both devices")
                }
                .padding(.vertical, 8)
            }

            if let error = sharingManager.errorMessage {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
        }
        .navigationTitle("Partner Sync")
        .sheet(isPresented: $showingShareSheet) {
            if let url = inviteLink {
                ShareLinkSheet(url: url)
            }
        }
        .onAppear {
            Task {
                await sharingManager.setupSharedZone()
                await sharingManager.fetchParticipants()
            }
        }
    }
}

struct StepRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.purple))
                .foregroundStyle(.white)

            Text(text)
                .font(.subheadline)
        }
    }
}

struct ShareLinkSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let message = "Join me on LittleRoutine to help track our baby's care together!"
        return UIActivityViewController(activityItems: [message, url], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Scene Delegate for handling share URLs

extension CloudKitSharingManager {
    /// Call this from your App's onOpenURL modifier
    func handleIncomingURL(_ url: URL) {
        // CloudKit share URLs have a specific format
        guard url.scheme == "cloudkit" || url.host?.contains("icloud") == true else { return }

        // The system will handle showing the share acceptance UI
        print("Received share URL: \(url)")
    }
}
*/
