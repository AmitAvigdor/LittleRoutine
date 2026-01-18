import SwiftUI

// ⚠️ IMPORTANT: Before publishing to the App Store, update these items:
// 1. Change the support email below to your real support email address
// 2. Update the "Last updated" dates if you modify the legal documents
// 3. Ensure you have a working support email that you monitor regularly

private let supportEmail = "littleroutineapp@gmail.com"

// MARK: - Privacy Policy View

struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Privacy Policy")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Last updated: \(formattedDate)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Group {
                    SectionHeader("Introduction")
                    Text("LittleRoutine (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by LittleRoutine.")

                    SectionHeader("Information We Collect")
                    Text("LittleRoutine collects information that you voluntarily provide when using our app, including:")
                    BulletPoint("Baby information (name, birth date)")
                    BulletPoint("Feeding records and schedules")
                    BulletPoint("Diaper change logs")
                    BulletPoint("Sleep tracking data")
                    BulletPoint("Growth measurements")
                    BulletPoint("Health and medicine logs")
                    BulletPoint("Notes and observations")

                    SectionHeader("How Your Data is Stored")
                    Text("All data is stored locally on your device only. We do not transmit, upload, or store your data on any external servers. Your information never leaves your device unless you explicitly choose to export it.")

                    SectionHeader("Data We Do NOT Collect")
                    Text("We do not collect, store, or have access to:")
                    BulletPoint("Your location data")
                    BulletPoint("Your contacts")
                    BulletPoint("Your photos (unless you add them)")
                    BulletPoint("Any analytics or usage data")
                    BulletPoint("Advertising identifiers")
                    BulletPoint("Any data from other apps")
                }

                Group {
                    SectionHeader("Third-Party Services")
                    Text("LittleRoutine does not use any third-party analytics, advertising, or tracking services. We do not share your data with any third parties.")

                    SectionHeader("Children's Privacy")
                    Text("LittleRoutine is designed for parents and caregivers to track information about their children. The app is operated by parents/guardians, not by children. We comply with the Children's Online Privacy Protection Act (COPPA) and do not knowingly collect information directly from children under 13.")

                    SectionHeader("Data Security")
                    Text("Your data is protected by iOS's built-in security features including app sandboxing, which prevents other apps from accessing your LittleRoutine data. For additional security, we recommend:")
                    BulletPoint("Using a device passcode")
                    BulletPoint("Enabling Face ID or Touch ID")
                    BulletPoint("Keeping your iOS updated")
                    BulletPoint("Using encrypted backups")

                    SectionHeader("Data Retention and Deletion")
                    Text("Your data remains on your device until you choose to delete it. You can delete individual records within the app, or delete all data by uninstalling the app. We have no ability to recover deleted data as we do not have access to it.")

                    SectionHeader("Your Rights")
                    Text("You have complete control over your data:")
                    BulletPoint("Access: All your data is visible in the app")
                    BulletPoint("Export: You can export your data as PDF")
                    BulletPoint("Delete: You can delete any or all data")
                    BulletPoint("Portability: Your data stays with your device")
                }

                Group {
                    SectionHeader("Changes to This Policy")
                    Text("We may update this Privacy Policy from time to time. We will notify you of any changes by updating the \"Last updated\" date at the top of this policy.")

                    SectionHeader("Contact Us")
                    Text("If you have any questions about this Privacy Policy, please contact us at:")
                    Text(supportEmail)
                        .foregroundStyle(.blue)

                    SectionHeader("Consent")
                    Text("By using LittleRoutine, you consent to this Privacy Policy.")
                }
            }
            .padding()
        }
        .navigationTitle("Privacy Policy")
        .navigationBarTitleDisplayMode(.inline)
    }

    // IMPORTANT: Update this date whenever you make changes to the Privacy Policy
    private var formattedDate: String {
        "January 1, 2025"
    }
}

// MARK: - Terms of Service View

struct TermsOfServiceView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Terms of Service")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Last updated: \(formattedDate)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Group {
                    SectionHeader("Agreement to Terms")
                    Text("By downloading, installing, or using LittleRoutine (\"the App\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, do not use the App.")

                    SectionHeader("Description of Service")
                    Text("LittleRoutine is a personal baby tracking application designed to help parents and caregivers log and monitor their baby's daily activities including feeding, sleeping, diaper changes, growth, and health information.")

                    SectionHeader("Intended Use")
                    Text("The App is intended for personal, non-commercial use by parents, guardians, and caregivers. The App is a tracking and logging tool only and is NOT intended to:")
                    BulletPoint("Provide medical advice or diagnosis")
                    BulletPoint("Replace professional healthcare guidance")
                    BulletPoint("Serve as an emergency alert system")
                    BulletPoint("Monitor infant safety or vital signs")
                }

                Group {
                    SectionHeader("Medical Disclaimer")
                    Text("IMPORTANT: LittleRoutine is NOT a medical device and should NOT be used for medical purposes. The information provided by the App is for informational and tracking purposes only.")
                        .fontWeight(.semibold)

                    Text("Always consult with a qualified healthcare provider for any health-related concerns about your child. Never disregard professional medical advice or delay seeking it because of information logged in this App.")

                    Text("In case of a medical emergency, call emergency services immediately.")
                        .fontWeight(.semibold)
                        .foregroundStyle(.red)

                    SectionHeader("User Responsibilities")
                    Text("You are responsible for:")
                    BulletPoint("The accuracy of information you enter")
                    BulletPoint("Maintaining the security of your device")
                    BulletPoint("Backing up your data regularly")
                    BulletPoint("Using the App in compliance with applicable laws")

                    SectionHeader("Data and Privacy")
                    Text("Your use of the App is also governed by our Privacy Policy. All data is stored locally on your device. You are solely responsible for maintaining backups of your data.")
                }

                Group {
                    SectionHeader("Intellectual Property")
                    Text("The App and its original content, features, and functionality are owned by LittleRoutine and are protected by international copyright, trademark, and other intellectual property laws.")

                    SectionHeader("Limitation of Liability")
                    Text("TO THE MAXIMUM EXTENT PERMITTED BY LAW, LITTLEROUTINE AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:")
                        .fontWeight(.semibold)
                    BulletPoint("Loss of data")
                    BulletPoint("Loss of profits or revenue")
                    BulletPoint("Personal injury or health issues")
                    BulletPoint("Decisions made based on App data")
                    BulletPoint("Device malfunction or data corruption")
                    BulletPoint("Any damages arising from use or inability to use the App")

                    SectionHeader("Disclaimer of Warranties")
                    Text("THE APP IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.")
                        .fontWeight(.semibold)
                }

                Group {
                    SectionHeader("Indemnification")
                    Text("You agree to indemnify and hold harmless LittleRoutine, its developers, and affiliates from any claims, damages, losses, or expenses arising from your use of the App or violation of these Terms.")

                    SectionHeader("Changes to Terms")
                    Text("We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the modified Terms.")

                    SectionHeader("Termination")
                    Text("You may terminate your use of the App at any time by uninstalling it. Upon termination, all data stored locally on your device will be deleted.")

                    SectionHeader("Governing Law")
                    Text("These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.")

                    SectionHeader("Contact")
                    Text("For questions about these Terms, contact us at:")
                    Text(supportEmail)
                        .foregroundStyle(.blue)

                    SectionHeader("Acknowledgment")
                    Text("By using LittleRoutine, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.")
                }
            }
            .padding()
        }
        .navigationTitle("Terms of Service")
        .navigationBarTitleDisplayMode(.inline)
    }

    // IMPORTANT: Update this date whenever you make changes to the Terms of Service
    private var formattedDate: String {
        "January 1, 2025"
    }
}

// MARK: - Helper Views

struct SectionHeader: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.headline)
            .padding(.top, 8)
    }
}

struct BulletPoint: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
            Text(text)
        }
        .padding(.leading, 16)
    }
}

// MARK: - Data & Privacy Info View (for App Store compliance)

struct DataPrivacyInfoView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Your Data & Privacy")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                InfoCard(
                    icon: "iphone",
                    title: "Stored Locally",
                    description: "All your data is stored only on this device. Nothing is uploaded to the internet or cloud servers."
                )

                InfoCard(
                    icon: "lock.shield.fill",
                    title: "Private & Secure",
                    description: "Your data is protected by iOS security. Other apps cannot access your LittleRoutine data."
                )

                InfoCard(
                    icon: "hand.raised.fill",
                    title: "No Tracking",
                    description: "We don't use analytics, advertising, or any third-party tracking services."
                )

                InfoCard(
                    icon: "arrow.up.doc.fill",
                    title: "No Data Sharing",
                    description: "We never share, sell, or transmit your personal information to anyone."
                )

                InfoCard(
                    icon: "trash.fill",
                    title: "Easy Deletion",
                    description: "Delete any data within the app, or remove everything by uninstalling the app."
                )

                InfoCard(
                    icon: "square.and.arrow.up.fill",
                    title: "Export Anytime",
                    description: "Export your data as a PDF report whenever you need it."
                )

                Divider()
                    .padding(.vertical)

                VStack(alignment: .leading, spacing: 12) {
                    NavigationLink(destination: PrivacyPolicyView()) {
                        Label("Read Full Privacy Policy", systemImage: "doc.text.fill")
                    }

                    NavigationLink(destination: TermsOfServiceView()) {
                        Label("Read Terms of Service", systemImage: "doc.plaintext.fill")
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Data & Privacy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct InfoCard: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.purple)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - First Launch Consent View (Required for Legal Compliance)

struct FirstLaunchConsentView: View {
    @AppStorage("hasAcceptedTerms") private var hasAcceptedTerms = false
    @AppStorage("termsAcceptedDate") private var termsAcceptedDate: Double = 0
    @AppStorage("termsAcceptedVersion") private var termsAcceptedVersion = ""

    @State private var hasReadTerms = false
    @State private var hasReadPrivacy = false
    @State private var showingTerms = false
    @State private var showingPrivacy = false

    let onAccept: () -> Void

    // Update this when you make significant changes to legal documents
    private let currentLegalVersion = "1.0"

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // App icon and welcome
                VStack(spacing: 16) {
                    Image(systemName: "heart.circle.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(.purple)

                    Text("Welcome to LittleRoutine")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Before you begin, please review and accept our Terms of Service and Privacy Policy.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Spacer()

                // Legal document links with checkmarks
                VStack(spacing: 16) {
                    LegalDocumentRow(
                        title: "Terms of Service",
                        isRead: hasReadTerms,
                        action: { showingTerms = true }
                    )

                    LegalDocumentRow(
                        title: "Privacy Policy",
                        isRead: hasReadPrivacy,
                        action: { showingPrivacy = true }
                    )
                }
                .padding(.horizontal)

                Spacer()

                // Accept button
                VStack(spacing: 12) {
                    Button {
                        acceptTerms()
                    } label: {
                        Text("I Accept")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(canAccept ? Color.purple : Color.gray)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(!canAccept)

                    if !canAccept {
                        Text("Please read both documents to continue")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .sheet(isPresented: $showingTerms, onDismiss: { hasReadTerms = true }) {
                NavigationStack {
                    TermsOfServiceView()
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Done") {
                                    showingTerms = false
                                }
                            }
                        }
                }
            }
            .sheet(isPresented: $showingPrivacy, onDismiss: { hasReadPrivacy = true }) {
                NavigationStack {
                    PrivacyPolicyView()
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Done") {
                                    showingPrivacy = false
                                }
                            }
                        }
                }
            }
        }
    }

    private var canAccept: Bool {
        hasReadTerms && hasReadPrivacy
    }

    private func acceptTerms() {
        hasAcceptedTerms = true
        termsAcceptedDate = Date().timeIntervalSince1970
        termsAcceptedVersion = currentLegalVersion
        onAccept()
    }
}

struct LegalDocumentRow: View {
    let title: String
    let isRead: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: isRead ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isRead ? .green : .gray)
                    .font(.title2)

                Text(title)
                    .font(.body)
                    .foregroundStyle(.primary)

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

// MARK: - GDPR Consent (for EU Users)

struct GDPRConsentSection: View {
    @AppStorage("gdprDataProcessingConsent") private var dataProcessingConsent = false

    var body: some View {
        Section {
            Toggle("Data Processing Consent", isOn: $dataProcessingConsent)

            Text("I consent to the processing of the personal data I enter into this app for the purpose of tracking my baby's activities. I understand that all data is stored locally on my device and is not transmitted to any servers.")
                .font(.caption)
                .foregroundStyle(.secondary)
        } header: {
            Text("GDPR Consent (EU Users)")
        } footer: {
            Text("Required for users in the European Union under the General Data Protection Regulation.")
        }
    }
}

#Preview("First Launch") {
    FirstLaunchConsentView(onAccept: {})
}

#Preview("Data Privacy") {
    NavigationStack {
        DataPrivacyInfoView()
    }
}
