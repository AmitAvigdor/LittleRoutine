import SwiftUI
import SwiftData

struct MedicineView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \Medicine.name) private var allMedicines: [Medicine]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false

    // Filter medicines by selected baby
    var medicines: [Medicine] {
        guard let selectedId = appState.selectedBabyId else {
            return allMedicines
        }
        return allMedicines.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var activeMedicines: [Medicine] {
        medicines.filter { $0.isActive }
    }

    private var inactiveMedicines: [Medicine] {
        medicines.filter { !$0.isActive }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Due medications alert
                let dueMeds = activeMedicines.filter { $0.isDue }
                if !dueMeds.isEmpty {
                    DueMedicationsCard(medicines: dueMeds) { med in
                        logDose(for: med)
                    }
                }

                // Add button
                Button {
                    showingAddSheet = true
                } label: {
                    Label("Add Medication", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.red)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Active medications
                if !activeMedicines.isEmpty {
                    MedicineSection(
                        title: "Active Medications",
                        medicines: activeMedicines,
                        onLogDose: { med in logDose(for: med) },
                        onToggleActive: { med in med.isActive = false },
                        onDelete: { med in modelContext.delete(med) }
                    )
                }

                // Inactive medications
                if !inactiveMedicines.isEmpty {
                    MedicineSection(
                        title: "Inactive",
                        medicines: inactiveMedicines,
                        onLogDose: { _ in },
                        onToggleActive: { med in med.isActive = true },
                        onDelete: { med in modelContext.delete(med) }
                    )
                }

                if medicines.isEmpty {
                    EmptyMedicineView()
                }
            }
            .padding()
        }
        .navigationTitle("Medicine & Vitamins")
        .sheet(isPresented: $showingAddSheet) {
            AddMedicineSheet(
                onSave: { name, dosage, frequency, hours, instructions in
                    let med = Medicine(
                        name: name,
                        dosage: dosage,
                        frequency: frequency,
                        hoursInterval: hours,
                        instructions: instructions,
                        baby: currentBaby
                    )
                    modelContext.insert(med)
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
    }

    private func logDose(for medicine: Medicine) {
        let log = MedicineLog(baby: currentBaby)
        log.medicine = medicine
        modelContext.insert(log)
    }
}

struct DueMedicationsCard: View {
    let medicines: [Medicine]
    let onLogDose: (Medicine) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundStyle(.red)
                Text("Medications Due")
                    .font(.headline)
            }

            ForEach(medicines) { med in
                HStack {
                    VStack(alignment: .leading) {
                        Text(med.name)
                            .fontWeight(.medium)
                        Text(med.dosage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button {
                        onLogDose(med)
                    } label: {
                        Text("Log Dose")
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.red)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct MedicineSection: View {
    let title: String
    let medicines: [Medicine]
    let onLogDose: (Medicine) -> Void
    let onToggleActive: (Medicine) -> Void
    let onDelete: (Medicine) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            LazyVStack(spacing: 8) {
                ForEach(medicines) { med in
                    NavigationLink(destination: MedicineDetailView(medicine: med)) {
                        MedicineRow(medicine: med, onLogDose: { onLogDose(med) })
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            onDelete(med)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }

                        Button {
                            onToggleActive(med)
                        } label: {
                            Label(med.isActive ? "Deactivate" : "Activate", systemImage: med.isActive ? "pause.circle" : "play.circle")
                        }
                        .tint(.orange)
                    }
                }
            }
        }
    }
}

struct MedicineRow: View {
    let medicine: Medicine
    let onLogDose: () -> Void

    var body: some View {
        HStack {
            Image(systemName: "pills.fill")
                .font(.title2)
                .foregroundStyle(.red)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(medicine.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(medicine.dosage)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let nextDue = medicine.formattedNextDue {
                    Text("Next: \(nextDue)")
                        .font(.caption2)
                        .foregroundStyle(medicine.isDue ? .red : .secondary)
                }
            }

            Spacer()

            if medicine.isActive {
                Button(action: onLogDose) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MedicineDetailView: View {
    let medicine: Medicine
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        List {
            Section("Details") {
                LabeledContent("Name", value: medicine.name)
                LabeledContent("Dosage", value: medicine.dosage)
                LabeledContent("Frequency", value: medicine.frequency.rawValue)

                if let instructions = medicine.instructions {
                    VStack(alignment: .leading) {
                        Text("Instructions")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(instructions)
                    }
                }
            }

            Section("Dose History") {
                if let logs = medicine.logs, !logs.isEmpty {
                    ForEach(logs.sorted { $0.timestamp > $1.timestamp }) { log in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(log.formattedDate)
                                    .font(.subheadline)
                                if let givenBy = log.givenBy {
                                    Text("Given by \(givenBy)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                    }
                } else {
                    Text("No doses logged yet")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Button {
                    let log = MedicineLog()
                    log.medicine = medicine
                    modelContext.insert(log)
                } label: {
                    Label("Log Dose Now", systemImage: "plus.circle.fill")
                }
            }
        }
        .navigationTitle(medicine.name)
    }
}

struct EmptyMedicineView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "pills.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red.opacity(0.5))

            Text("No Medications")
                .font(.headline)

            Text("Add medications and vitamins to track doses and get reminders")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
    }
}

struct AddMedicineSheet: View {
    let onSave: (String, String, MedicationFrequency, Int?, String?) -> Void
    let onCancel: () -> Void

    @State private var name: String = ""
    @State private var dosage: String = ""
    @State private var frequency: MedicationFrequency = .onceDaily
    @State private var hoursInterval: String = ""
    @State private var instructions: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Medication") {
                    TextField("Name", text: $name)
                    TextField("Dosage (e.g., 5ml, 1 drop)", text: $dosage)
                }

                Section("Schedule") {
                    Picker("Frequency", selection: $frequency) {
                        ForEach(MedicationFrequency.allCases, id: \.self) { freq in
                            Text(freq.rawValue).tag(freq)
                        }
                    }

                    if frequency == .everyHours {
                        TextField("Hours between doses", text: $hoursInterval)
                            .keyboardType(.numberPad)
                    }
                }

                Section("Instructions") {
                    TextField("Optional instructions...", text: $instructions, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Add Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: name.isEmpty || dosage.isEmpty,
                        action: {
                            let hours = Int(hoursInterval)
                            onSave(name, dosage, frequency, hours, instructions.isEmpty ? nil : instructions)
                        },
                        onComplete: onCancel
                    )
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    NavigationStack {
        MedicineView()
    }
    .modelContainer(for: [Medicine.self, MedicineLog.self], inMemory: true)
}
