import SwiftUI
import SwiftData

struct PediatricianNotesView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \PediatricianNote.date, order: .reverse) private var allNotes: [PediatricianNote]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false

    // Filter notes by selected baby
    var notes: [PediatricianNote] {
        guard let selectedId = appState.selectedBabyId else {
            return allNotes
        }
        return allNotes.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var unresolvedNotes: [PediatricianNote] {
        notes.filter { !$0.isResolved }
    }

    private var resolvedNotes: [PediatricianNote] {
        notes.filter { $0.isResolved }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Info card
                HStack(spacing: 12) {
                    Image(systemName: "stethoscope")
                        .font(.title)
                        .foregroundStyle(.blue)

                    VStack(alignment: .leading) {
                        Text("Notes for Doctor")
                            .font(.headline)
                        Text("Keep track of questions and concerns for your next pediatrician visit")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.blue.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                // Add button
                Button {
                    showingAddSheet = true
                } label: {
                    Label("Add Concern", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Unresolved concerns
                if !unresolvedNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("To Discuss")
                                .font(.headline)
                            Spacer()
                            Text("\(unresolvedNotes.count)")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }

                        LazyVStack(spacing: 8) {
                            ForEach(unresolvedNotes) { note in
                                ConcernRow(note: note) {
                                    resolveNote(note)
                                }
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        modelContext.delete(note)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }

                                    Button {
                                        resolveNote(note)
                                    } label: {
                                        Label("Resolve", systemImage: "checkmark.circle")
                                    }
                                    .tint(.green)
                                }
                            }
                        }
                    }
                }

                // Resolved concerns
                if !resolvedNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Resolved")
                            .font(.headline)
                            .foregroundStyle(.secondary)

                        LazyVStack(spacing: 8) {
                            ForEach(resolvedNotes) { note in
                                ResolvedConcernRow(note: note)
                                    .swipeActions(edge: .trailing) {
                                        Button(role: .destructive) {
                                            modelContext.delete(note)
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                            }
                        }
                    }
                }

                if notes.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.green)

                        Text("No concerns to discuss")
                            .font(.headline)

                        Text("Add any questions or concerns you want to remember for your next doctor visit")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(32)
                }
            }
            .padding()
        }
        .navigationTitle("Pediatrician Notes")
        .sheet(isPresented: $showingAddSheet) {
            AddConcernSheet(
                onSave: { concern in
                    let note = PediatricianNote(concern: concern, baby: currentBaby)
                    modelContext.insert(note)
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
    }

    private func resolveNote(_ note: PediatricianNote) {
        note.resolve(with: "Discussed with doctor")
    }
}

struct ConcernRow: View {
    let note: PediatricianNote
    let onResolve: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: "circle")
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text(note.concern)
                    .font(.subheadline)

                Text("Added \(note.formattedDate)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button(action: onResolve) {
                Image(systemName: "checkmark.circle")
                    .font(.title2)
                    .foregroundStyle(.green)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ResolvedConcernRow: View {
    let note: PediatricianNote

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)

            VStack(alignment: .leading, spacing: 4) {
                Text(note.concern)
                    .font(.subheadline)
                    .strikethrough()
                    .foregroundStyle(.secondary)

                if let resolution = note.resolution {
                    Text(resolution)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .opacity(0.7)
    }
}

struct AddConcernSheet: View {
    let onSave: (String) -> Void
    let onCancel: () -> Void

    @State private var concern: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What's on your mind?", text: $concern, axis: .vertical)
                        .lineLimit(3...8)
                } footer: {
                    Text("Write down any questions, symptoms, or concerns you want to discuss at your next appointment")
                }
            }
            .navigationTitle("Add Concern")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: concern.isEmpty,
                        action: { onSave(concern) },
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
        PediatricianNotesView()
    }
    .modelContainer(for: PediatricianNote.self, inMemory: true)
}
