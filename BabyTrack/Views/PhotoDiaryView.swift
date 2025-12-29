import SwiftUI
import SwiftData
import PhotosUI

struct PhotoDiaryView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \DiaryEntry.date, order: .reverse) private var allEntries: [DiaryEntry]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedEntry: DiaryEntry?
    @State private var viewMode: DiaryViewMode = .grid
    @State private var selectedMonth: Date = Date()

    var entries: [DiaryEntry] {
        guard let selectedId = appState.selectedBabyId else { return allEntries }
        return allEntries.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var entriesWithPhotos: [DiaryEntry] {
        entries.filter { $0.hasPhoto }
    }

    var groupedByMonth: [(String, [DiaryEntry])] {
        let grouped = Dictionary(grouping: entries) { entry in
            entry.date.formatted(.dateTime.year().month())
        }
        return grouped.sorted { $0.value.first?.date ?? Date() > $1.value.first?.date ?? Date() }
    }

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    EmptyDiaryStateView()
                } else {
                    switch viewMode {
                    case .grid:
                        PhotoGridView(
                            entries: entriesWithPhotos,
                            onSelect: { selectedEntry = $0 }
                        )
                    case .timeline:
                        TimelineView(
                            groupedEntries: groupedByMonth,
                            onSelect: { selectedEntry = $0 },
                            onDelete: deleteEntry
                        )
                    }
                }
            }
            .navigationTitle("Photo Diary")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Picker("View", selection: $viewMode) {
                        Image(systemName: "square.grid.2x2").tag(DiaryViewMode.grid)
                        Image(systemName: "list.bullet").tag(DiaryViewMode.timeline)
                    }
                    .pickerStyle(.segmented)
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddDiaryEntrySheet(baby: currentBaby)
            }
            .sheet(item: $selectedEntry) { entry in
                DiaryEntryDetailView(entry: entry)
            }
        }
    }

    private func deleteEntry(_ entry: DiaryEntry) {
        modelContext.delete(entry)
    }
}

enum DiaryViewMode {
    case grid
    case timeline
}

// MARK: - Photo Grid View

struct PhotoGridView: View {
    let entries: [DiaryEntry]
    let onSelect: (DiaryEntry) -> Void

    let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]

    var body: some View {
        ScrollView {
            if entries.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)

                    Text("No photos yet")
                        .font(.headline)

                    Text("Add diary entries with photos to see them here")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 100)
            } else {
                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(entries) { entry in
                        PhotoGridItem(entry: entry)
                            .onTapGesture {
                                onSelect(entry)
                            }
                    }
                }
            }
        }
    }
}

struct PhotoGridItem: View {
    let entry: DiaryEntry

    var body: some View {
        GeometryReader { geometry in
            if let photoData = entry.photoData,
               let uiImage = UIImage(data: photoData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.width)
                    .clipped()
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundStyle(.secondary)
                    )
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

// MARK: - Timeline View

struct TimelineView: View {
    let groupedEntries: [(String, [DiaryEntry])]
    let onSelect: (DiaryEntry) -> Void
    let onDelete: (DiaryEntry) -> Void

    var body: some View {
        List {
            ForEach(groupedEntries, id: \.0) { month, monthEntries in
                Section(month) {
                    ForEach(monthEntries) { entry in
                        TimelineEntryRow(entry: entry)
                            .onTapGesture {
                                onSelect(entry)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    onDelete(entry)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

struct TimelineEntryRow: View {
    let entry: DiaryEntry

    var body: some View {
        HStack(spacing: 12) {
            // Thumbnail
            if let photoData = entry.photoData,
               let uiImage = UIImage(data: photoData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.purple.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "note.text")
                            .foregroundStyle(.purple)
                    )
            }

            VStack(alignment: .leading, spacing: 4) {
                if let title = entry.title, !title.isEmpty {
                    Text(title)
                        .font(.headline)
                }

                Text(entry.formattedDate)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let mood = entry.mood {
                    HStack(spacing: 4) {
                        Image(systemName: mood.icon)
                        Text(mood.rawValue)
                    }
                    .font(.caption)
                    .foregroundStyle(mood.color)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Empty State

struct EmptyDiaryStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 48))
                .foregroundStyle(.purple.opacity(0.6))

            Text("No Diary Entries")
                .font(.headline)

            Text("Capture precious moments with photos and notes. Tap + to add your first entry.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
    }
}

// MARK: - Add Diary Entry Sheet

struct AddDiaryEntrySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let baby: Baby?

    @State private var date = Date()
    @State private var title = ""
    @State private var notes = ""
    @State private var mood: BabyMood?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var photoData: Data?

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo") {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        if let photoData = photoData,
                           let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(height: 200)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            VStack(spacing: 12) {
                                Image(systemName: "photo.badge.plus")
                                    .font(.system(size: 40))
                                    .foregroundStyle(.purple)

                                Text("Add Photo")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(height: 150)
                            .frame(maxWidth: .infinity)
                            .background(Color.purple.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .onChange(of: selectedPhotoItem) { _, newItem in
                        Task {
                            if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                photoData = data
                            }
                        }
                    }
                }

                Section("Details") {
                    DatePicker("Date", selection: $date)

                    TextField("Title (optional)", text: $title)

                    Picker("Baby's Mood", selection: $mood) {
                        Text("Not specified").tag(nil as BabyMood?)
                        ForEach(BabyMood.allCases, id: \.self) { m in
                            Label(m.rawValue, systemImage: m.icon)
                                .tag(m as BabyMood?)
                        }
                    }
                }

                Section("Notes") {
                    TextField("Write about this moment...", text: $notes, axis: .vertical)
                        .lineLimit(4...8)
                }
            }
            .navigationTitle("New Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveEntry()
                    }
                }
            }
        }
    }

    private func saveEntry() {
        let entry = DiaryEntry(
            date: date,
            title: title.isEmpty ? nil : title,
            notes: notes.isEmpty ? nil : notes,
            photoData: photoData,
            mood: mood
        )
        entry.baby = baby
        modelContext.insert(entry)
        dismiss()
    }
}

// MARK: - Diary Entry Detail View

struct DiaryEntryDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var entry: DiaryEntry

    @State private var isEditing = false
    @State private var editTitle = ""
    @State private var editNotes = ""
    @State private var editMood: BabyMood?
    @State private var editDate = Date()
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var editPhotoData: Data?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Photo
                    if let photoData = isEditing ? editPhotoData : entry.photoData,
                       let uiImage = UIImage(data: photoData) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    if isEditing {
                        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                            Label(editPhotoData != nil ? "Change Photo" : "Add Photo", systemImage: "photo.badge.plus")
                        }
                        .onChange(of: selectedPhotoItem) { _, newItem in
                            Task {
                                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                    editPhotoData = data
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        // Date & Mood
                        HStack {
                            if isEditing {
                                DatePicker("", selection: $editDate)
                                    .labelsHidden()
                            } else {
                                Text(entry.formattedDate)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if isEditing {
                                Picker("Mood", selection: $editMood) {
                                    Text("None").tag(nil as BabyMood?)
                                    ForEach(BabyMood.allCases, id: \.self) { m in
                                        Label(m.rawValue, systemImage: m.icon).tag(m as BabyMood?)
                                    }
                                }
                            } else if let mood = entry.mood {
                                HStack(spacing: 4) {
                                    Image(systemName: mood.icon)
                                    Text(mood.rawValue)
                                }
                                .font(.subheadline)
                                .foregroundStyle(mood.color)
                            }
                        }

                        // Title
                        if isEditing {
                            TextField("Title", text: $editTitle)
                                .font(.title2)
                                .fontWeight(.bold)
                        } else if let title = entry.title, !title.isEmpty {
                            Text(title)
                                .font(.title2)
                                .fontWeight(.bold)
                        }

                        // Notes
                        if isEditing {
                            TextField("Notes", text: $editNotes, axis: .vertical)
                                .lineLimit(4...10)
                        } else if let notes = entry.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.body)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    if isEditing {
                        Button(role: .destructive) {
                            modelContext.delete(entry)
                            dismiss()
                        } label: {
                            Label("Delete Entry", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                    }
                }
                .padding()
            }
            .navigationTitle(isEditing ? "Edit Entry" : "")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(isEditing ? "Cancel" : "Close") {
                        if isEditing {
                            isEditing = false
                            loadEntryData()
                        } else {
                            dismiss()
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(isEditing ? "Save" : "Edit") {
                        if isEditing {
                            saveChanges()
                        } else {
                            loadEntryData()
                            isEditing = true
                        }
                    }
                }
            }
        }
    }

    private func loadEntryData() {
        editTitle = entry.title ?? ""
        editNotes = entry.notes ?? ""
        editMood = entry.mood
        editDate = entry.date
        editPhotoData = entry.photoData
    }

    private func saveChanges() {
        entry.title = editTitle.isEmpty ? nil : editTitle
        entry.notes = editNotes.isEmpty ? nil : editNotes
        entry.mood = editMood
        entry.date = editDate
        entry.photoData = editPhotoData
        isEditing = false
    }
}

#Preview {
    PhotoDiaryView()
        .environmentObject(AppState())
        .modelContainer(for: DiaryEntry.self, inMemory: true)
}
