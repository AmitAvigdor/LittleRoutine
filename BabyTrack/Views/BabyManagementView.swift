import SwiftUI
import SwiftData

// MARK: - Baby Switcher (appears in navigation bar)

struct BabySwitcher: View {
    @EnvironmentObject var appState: AppState
    @Query(sort: \Baby.createdAt) private var babies: [Baby]
    @State private var showingBabyPicker = false

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId } ?? babies.first
    }

    var body: some View {
        Button {
            showingBabyPicker = true
        } label: {
            HStack(spacing: 6) {
                if let baby = currentBaby {
                    Circle()
                        .fill(baby.displayColor)
                        .frame(width: 24, height: 24)
                        .overlay(
                            Text(baby.initials)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.white)
                        )
                    Text(baby.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    if babies.count > 1 {
                        Image(systemName: "chevron.down")
                            .font(.caption2)
                    }
                } else {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Baby")
                        .font(.subheadline)
                }
            }
            .foregroundStyle(.primary)
        }
        .sheet(isPresented: $showingBabyPicker) {
            BabyPickerSheet(currentBaby: currentBaby)
        }
        .onAppear {
            // Auto-select first baby if none selected
            appState.autoSelectFirstBabyIfNeeded(babies: babies)
        }
    }
}

// MARK: - Baby Picker Sheet

struct BabyPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \Baby.createdAt) private var babies: [Baby]

    let currentBaby: Baby?
    @State private var showingAddBaby = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(babies) { baby in
                        Button {
                            appState.selectBaby(baby)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(baby.displayColor)
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Text(baby.initials)
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                    )

                                VStack(alignment: .leading, spacing: 2) {
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

                                if baby.id == currentBaby?.id {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.green)
                                        .font(.title2)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .onDelete(perform: deleteBabies)
                }

                Section {
                    Button {
                        showingAddBaby = true
                    } label: {
                        Label("Add Baby", systemImage: "plus.circle.fill")
                    }
                }
            }
            .navigationTitle("Select Baby")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingAddBaby) {
                AddBabyView()
            }
        }
    }

    private func deleteBabies(at offsets: IndexSet) {
        for index in offsets {
            let baby = babies[index]
            // If deleting current baby, select another
            if baby.id == appState.selectedBabyId {
                if let nextBaby = babies.first(where: { $0.id != baby.id }) {
                    appState.selectBaby(nextBaby)
                } else {
                    appState.selectedBabyId = nil
                }
            }
            modelContext.delete(baby)
        }
    }
}

// MARK: - Add Baby View

struct AddBabyView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState

    @State private var name = ""
    @State private var birthDate = Date()
    @State private var hasBirthDate = false
    @State private var selectedColor: BabyColor = .purple

    var body: some View {
        NavigationStack {
            Form {
                Section("Baby Info") {
                    TextField("Baby's Name", text: $name)

                    Toggle("Add Birth Date", isOn: $hasBirthDate)

                    if hasBirthDate {
                        DatePicker("Birth Date", selection: $birthDate, displayedComponents: .date)
                    }
                }

                Section("Color") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 50))], spacing: 12) {
                        ForEach(BabyColor.allCases, id: \.self) { color in
                            Circle()
                                .fill(color.color)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle()
                                        .stroke(Color.primary, lineWidth: selectedColor == color ? 3 : 0)
                                        .padding(2)
                                )
                                .onTapGesture {
                                    selectedColor = color
                                }
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("Add Baby")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: name.isEmpty,
                        action: { saveBaby() },
                        onComplete: { dismiss() }
                    )
                }
            }
        }
    }

    private func saveBaby() {
        let baby = Baby(
            name: name,
            birthDate: hasBirthDate ? birthDate : nil,
            color: selectedColor.rawValue
        )
        modelContext.insert(baby)
        appState.selectBaby(baby)
    }
}

// MARK: - Baby Management List View (for Settings)

struct BabyListView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \Baby.createdAt) private var babies: [Baby]

    @State private var showingAddBaby = false
    @State private var babyToEdit: Baby?

    var body: some View {
        List {
            ForEach(babies) { baby in
                Button {
                    babyToEdit = baby
                } label: {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(baby.displayColor)
                            .frame(width: 44, height: 44)
                            .overlay(
                                Text(baby.initials)
                                    .font(.headline)
                                    .foregroundStyle(.white)
                            )

                        VStack(alignment: .leading, spacing: 2) {
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

                        if baby.id == appState.selectedBabyId {
                            Text("Active")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.2))
                                .foregroundStyle(.green)
                                .clipShape(Capsule())
                        }

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .onDelete(perform: deleteBabies)

            Button {
                showingAddBaby = true
            } label: {
                Label("Add Baby", systemImage: "plus.circle.fill")
            }
        }
        .navigationTitle("Manage Babies")
        .sheet(isPresented: $showingAddBaby) {
            AddBabyView()
        }
        .sheet(item: $babyToEdit) { baby in
            EditBabyView(baby: baby)
        }
    }

    private func deleteBabies(at offsets: IndexSet) {
        for index in offsets {
            let baby = babies[index]
            if baby.id == appState.selectedBabyId {
                if let nextBaby = babies.first(where: { $0.id != baby.id }) {
                    appState.selectBaby(nextBaby)
                } else {
                    appState.selectedBabyId = nil
                }
            }
            modelContext.delete(baby)
        }
    }
}

// MARK: - Edit Baby View

struct EditBabyView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @Bindable var baby: Baby
    @State private var name: String = ""
    @State private var birthDate: Date = Date()
    @State private var hasBirthDate: Bool = false
    @State private var selectedColor: BabyColor = .purple

    var body: some View {
        NavigationStack {
            Form {
                Section("Baby Info") {
                    TextField("Baby's Name", text: $name)

                    Toggle("Birth Date", isOn: $hasBirthDate)

                    if hasBirthDate {
                        DatePicker("Birth Date", selection: $birthDate, displayedComponents: .date)
                    }
                }

                Section("Color") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 50))], spacing: 12) {
                        ForEach(BabyColor.allCases, id: \.self) { color in
                            Circle()
                                .fill(color.color)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle()
                                        .stroke(Color.primary, lineWidth: selectedColor == color ? 3 : 0)
                                        .padding(2)
                                )
                                .onTapGesture {
                                    selectedColor = color
                                }
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("Edit Baby")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: name.isEmpty,
                        action: { updateBaby() },
                        onComplete: { dismiss() }
                    )
                }
            }
            .onAppear {
                name = baby.name
                hasBirthDate = baby.birthDate != nil
                birthDate = baby.birthDate ?? Date()
                selectedColor = BabyColor.allCases.first { $0.rawValue == baby.color } ?? .purple
            }
        }
    }

    private func updateBaby() {
        baby.name = name
        baby.birthDate = hasBirthDate ? birthDate : nil
        baby.color = selectedColor.rawValue
    }
}

#Preview {
    BabySwitcher()
        .environmentObject(AppState())
        .modelContainer(for: Baby.self, inMemory: true)
}
