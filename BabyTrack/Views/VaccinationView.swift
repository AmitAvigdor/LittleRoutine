import SwiftUI
import SwiftData

struct VaccinationView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \Vaccination.scheduledDate) private var allVaccinations: [Vaccination]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedVaccination: Vaccination?

    var vaccinations: [Vaccination] {
        guard let selectedId = appState.selectedBabyId else { return allVaccinations }
        return allVaccinations.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var overdueVaccinations: [Vaccination] {
        vaccinations.filter { $0.isOverdue }.sorted { $0.scheduledDate < $1.scheduledDate }
    }

    var upcomingVaccinations: [Vaccination] {
        vaccinations.filter { $0.isUpcoming }.sorted { $0.scheduledDate < $1.scheduledDate }
    }

    var completedVaccinations: [Vaccination] {
        vaccinations.filter { $0.isCompleted }.sorted { ($0.administeredDate ?? Date()) > ($1.administeredDate ?? Date()) }
    }

    var body: some View {
        NavigationStack {
            List {
                if vaccinations.isEmpty {
                    EmptyStateView()
                } else {
                    // Overdue Section
                    if !overdueVaccinations.isEmpty {
                        Section {
                            ForEach(overdueVaccinations) { vaccination in
                                VaccinationRow(vaccination: vaccination)
                                    .onTapGesture {
                                        selectedVaccination = vaccination
                                    }
                            }
                            .onDelete { indexSet in
                                deleteVaccinations(from: overdueVaccinations, at: indexSet)
                            }
                        } header: {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(.red)
                                Text("Overdue")
                            }
                        }
                    }

                    // Upcoming Section
                    if !upcomingVaccinations.isEmpty {
                        Section("Upcoming") {
                            ForEach(upcomingVaccinations) { vaccination in
                                VaccinationRow(vaccination: vaccination)
                                    .onTapGesture {
                                        selectedVaccination = vaccination
                                    }
                            }
                            .onDelete { indexSet in
                                deleteVaccinations(from: upcomingVaccinations, at: indexSet)
                            }
                        }
                    }

                    // Completed Section
                    if !completedVaccinations.isEmpty {
                        Section("Completed") {
                            ForEach(completedVaccinations) { vaccination in
                                VaccinationRow(vaccination: vaccination)
                                    .onTapGesture {
                                        selectedVaccination = vaccination
                                    }
                            }
                            .onDelete { indexSet in
                                deleteVaccinations(from: completedVaccinations, at: indexSet)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Vaccinations")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddVaccinationSheet(baby: currentBaby)
            }
            .sheet(item: $selectedVaccination) { vaccination in
                EditVaccinationSheet(vaccination: vaccination)
            }
        }
    }

    private func deleteVaccinations(from list: [Vaccination], at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(list[index])
        }
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "syringe")
                .font(.system(size: 48))
                .foregroundStyle(.purple.opacity(0.6))

            Text("No Vaccinations")
                .font(.headline)

            Text("Tap + to add your baby's vaccinations and track their schedule.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .listRowBackground(Color.clear)
    }
}

// MARK: - Vaccination Row

struct VaccinationRow: View {
    let vaccination: Vaccination

    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: statusIcon)
                    .font(.title3)
                    .foregroundStyle(statusColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(vaccination.name)
                    .font(.headline)

                HStack(spacing: 8) {
                    Text(vaccination.statusText)
                        .font(.caption)
                        .foregroundStyle(statusColor)

                    if vaccination.isCompleted, let date = vaccination.formattedAdministeredDate {
                        Text("• \(date)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("• \(vaccination.formattedScheduledDate)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if let location = vaccination.location, !location.isEmpty {
                    Text(location)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    var statusColor: Color {
        if vaccination.isCompleted {
            return .green
        } else if vaccination.isOverdue {
            return .red
        } else {
            return .purple
        }
    }

    var statusIcon: String {
        if vaccination.isCompleted {
            return "checkmark.circle.fill"
        } else if vaccination.isOverdue {
            return "exclamationmark.circle.fill"
        } else {
            return "calendar.circle.fill"
        }
    }
}

// MARK: - Add Vaccination Sheet

struct AddVaccinationSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let baby: Baby?

    @State private var name = ""
    @State private var scheduledDate = Date()
    @State private var location = ""
    @State private var notes = ""
    @State private var reminderEnabled = true

    var body: some View {
        NavigationStack {
            Form {
                Section("Vaccine Details") {
                    TextField("Vaccine Name", text: $name)
                    DatePicker("Scheduled Date", selection: $scheduledDate, displayedComponents: .date)
                    TextField("Location/Clinic (optional)", text: $location)
                }

                Section("Reminder") {
                    Toggle("Enable Reminder", isOn: $reminderEnabled)
                }

                Section("Notes") {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                // Common vaccines quick-add
                Section("Quick Add Common Vaccines") {
                    ForEach(commonVaccines, id: \.self) { vaccine in
                        Button {
                            name = vaccine
                        } label: {
                            HStack {
                                Text(vaccine)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if name == vaccine {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.purple)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Add Vaccination")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveVaccination()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private var commonVaccines: [String] {
        [
            "Hepatitis B (HepB)",
            "Rotavirus (RV)",
            "DTaP (Diphtheria, Tetanus, Pertussis)",
            "Hib (Haemophilus influenzae type b)",
            "PCV13 (Pneumococcal)",
            "IPV (Polio)",
            "MMR (Measles, Mumps, Rubella)",
            "Varicella (Chickenpox)",
            "Hepatitis A (HepA)",
            "Influenza (Flu)"
        ]
    }

    private func saveVaccination() {
        let vaccination = Vaccination(
            name: name,
            scheduledDate: scheduledDate,
            location: location.isEmpty ? nil : location,
            notes: notes.isEmpty ? nil : notes,
            reminderEnabled: reminderEnabled
        )
        vaccination.baby = baby
        modelContext.insert(vaccination)

        if reminderEnabled {
            scheduleReminder(for: vaccination)
        }

        dismiss()
    }

    private func scheduleReminder(for vaccination: Vaccination) {
        guard vaccination.scheduledDate > Date() else { return }

        let center = UNUserNotificationCenter.current()

        // Schedule reminder for the day before
        let dayBefore = Calendar.current.date(byAdding: .day, value: -1, to: vaccination.scheduledDate) ?? vaccination.scheduledDate

        let content = UNMutableNotificationContent()
        content.title = "Vaccination Reminder"
        content.body = "\(vaccination.name) is scheduled for tomorrow"
        content.sound = .default

        var components = Calendar.current.dateComponents([.year, .month, .day], from: dayBefore)
        components.hour = 9
        components.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(
            identifier: "vaccination-\(vaccination.id)",
            content: content,
            trigger: trigger
        )

        center.add(request)
    }
}

// MARK: - Edit Vaccination Sheet

struct EditVaccinationSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var vaccination: Vaccination

    @State private var name: String = ""
    @State private var scheduledDate: Date = Date()
    @State private var administeredDate: Date?
    @State private var location: String = ""
    @State private var notes: String = ""
    @State private var reminderEnabled: Bool = true
    @State private var markAsCompleted: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Vaccine Details") {
                    TextField("Vaccine Name", text: $name)
                    DatePicker("Scheduled Date", selection: $scheduledDate, displayedComponents: .date)
                    TextField("Location/Clinic (optional)", text: $location)
                }

                Section("Status") {
                    Toggle("Mark as Completed", isOn: $markAsCompleted)

                    if markAsCompleted {
                        DatePicker(
                            "Date Administered",
                            selection: Binding(
                                get: { administeredDate ?? Date() },
                                set: { administeredDate = $0 }
                            ),
                            displayedComponents: .date
                        )
                    }
                }

                Section("Reminder") {
                    Toggle("Enable Reminder", isOn: $reminderEnabled)
                }

                Section("Notes") {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section {
                    Button(role: .destructive) {
                        modelContext.delete(vaccination)
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Delete Vaccination")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Edit Vaccination")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveChanges()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                loadVaccinationData()
            }
        }
    }

    private func loadVaccinationData() {
        name = vaccination.name
        scheduledDate = vaccination.scheduledDate
        administeredDate = vaccination.administeredDate
        location = vaccination.location ?? ""
        notes = vaccination.notes ?? ""
        reminderEnabled = vaccination.reminderEnabled
        markAsCompleted = vaccination.isCompleted
    }

    private func saveChanges() {
        vaccination.name = name
        vaccination.scheduledDate = scheduledDate
        vaccination.administeredDate = markAsCompleted ? (administeredDate ?? Date()) : nil
        vaccination.location = location.isEmpty ? nil : location
        vaccination.notes = notes.isEmpty ? nil : notes
        vaccination.reminderEnabled = reminderEnabled

        // Update reminder
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["vaccination-\(vaccination.id)"])

        if reminderEnabled && !markAsCompleted && vaccination.scheduledDate > Date() {
            scheduleReminder()
        }

        dismiss()
    }

    private func scheduleReminder() {
        let dayBefore = Calendar.current.date(byAdding: .day, value: -1, to: vaccination.scheduledDate) ?? vaccination.scheduledDate

        let content = UNMutableNotificationContent()
        content.title = "Vaccination Reminder"
        content.body = "\(vaccination.name) is scheduled for tomorrow"
        content.sound = .default

        var components = Calendar.current.dateComponents([.year, .month, .day], from: dayBefore)
        components.hour = 9
        components.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(
            identifier: "vaccination-\(vaccination.id)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }
}

#Preview {
    VaccinationView()
        .environmentObject(AppState())
        .modelContainer(for: Vaccination.self, inMemory: true)
}
