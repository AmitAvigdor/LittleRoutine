import SwiftUI
import SwiftData
import PhotosUI

struct SolidFoodView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \SolidFood.date, order: .reverse) private var allFoods: [SolidFood]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedFood: SolidFood?
    @State private var selectedCategory: FoodCategory?

    var foods: [SolidFood] {
        guard let selectedId = appState.selectedBabyId else { return allFoods }
        return allFoods.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    var filteredFoods: [SolidFood] {
        if let category = selectedCategory {
            return foods.filter { $0.category == category }
        }
        return foods
    }

    var firstFoods: [SolidFood] {
        foods.filter { $0.isFirstIntroduction }.sorted { $0.date < $1.date }
    }

    var foodsWithReactions: [SolidFood] {
        foods.filter { $0.hasReaction }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Category filter
                    CategoryFilterView(selectedCategory: $selectedCategory)

                    // Stats cards
                    if !foods.isEmpty {
                        StatsCardsView(
                            totalFoods: foods.count,
                            firstFoodsCount: firstFoods.count,
                            reactionsCount: foodsWithReactions.count
                        )
                    }

                    // Foods with reactions warning
                    if !foodsWithReactions.isEmpty && selectedCategory == nil {
                        ReactionsWarningCard(foods: foodsWithReactions)
                    }

                    // Food list
                    if filteredFoods.isEmpty {
                        EmptyFoodStateView()
                    } else {
                        FoodListSection(
                            foods: filteredFoods,
                            onSelect: { selectedFood = $0 },
                            onDelete: deleteFood
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Solid Foods")
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
                AddSolidFoodSheet(baby: currentBaby)
            }
            .sheet(item: $selectedFood) { food in
                EditSolidFoodSheet(food: food)
            }
        }
    }

    private func deleteFood(_ food: SolidFood) {
        modelContext.delete(food)
    }
}

// MARK: - Category Filter

struct CategoryFilterView: View {
    @Binding var selectedCategory: FoodCategory?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    title: "All",
                    isSelected: selectedCategory == nil,
                    color: .purple
                ) {
                    selectedCategory = nil
                }

                ForEach(FoodCategory.allCases, id: \.self) { category in
                    FilterChip(
                        title: category.rawValue,
                        icon: category.icon,
                        isSelected: selectedCategory == category,
                        color: category.color
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }
}

struct FilterChip: View {
    let title: String
    var icon: String? = nil
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(.subheadline)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : color.opacity(0.15))
            .foregroundStyle(isSelected ? .white : color)
            .clipShape(Capsule())
        }
    }
}

// MARK: - Stats Cards

struct StatsCardsView: View {
    let totalFoods: Int
    let firstFoodsCount: Int
    let reactionsCount: Int

    var body: some View {
        HStack(spacing: 12) {
            FoodStatCard(
                title: "Total Foods",
                value: "\(totalFoods)",
                icon: "fork.knife",
                color: .purple
            )

            FoodStatCard(
                title: "First Foods",
                value: "\(firstFoodsCount)",
                icon: "star.fill",
                color: .yellow
            )

            FoodStatCard(
                title: "Reactions",
                value: "\(reactionsCount)",
                icon: "exclamationmark.triangle.fill",
                color: reactionsCount > 0 ? .red : .green
            )
        }
    }
}

struct FoodStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Reactions Warning Card

struct ReactionsWarningCard: View {
    let foods: [SolidFood]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("Foods with Reactions")
                    .font(.headline)
            }

            ForEach(foods.prefix(3)) { food in
                HStack {
                    Text(food.foodName)
                        .font(.subheadline)
                    Spacer()
                    if let reaction = food.reaction {
                        Text(reaction.rawValue)
                            .font(.caption)
                            .foregroundStyle(reaction.color)
                    }
                }
            }

            if foods.count > 3 {
                Text("+ \(foods.count - 3) more")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Food List Section

struct FoodListSection: View {
    let foods: [SolidFood]
    let onSelect: (SolidFood) -> Void
    let onDelete: (SolidFood) -> Void

    var groupedFoods: [(String, [SolidFood])] {
        let grouped = Dictionary(grouping: foods) { food in
            food.date.formatted(date: .abbreviated, time: .omitted)
        }
        return grouped.sorted { $0.value.first?.date ?? Date() > $1.value.first?.date ?? Date() }
    }

    var body: some View {
        LazyVStack(spacing: 16) {
            ForEach(groupedFoods, id: \.0) { dateString, dayFoods in
                VStack(alignment: .leading, spacing: 8) {
                    Text(dateString)
                        .font(.headline)
                        .foregroundStyle(.secondary)

                    ForEach(dayFoods) { food in
                        FoodRowCard(food: food)
                            .onTapGesture {
                                onSelect(food)
                            }
                            .contextMenu {
                                Button(role: .destructive) {
                                    onDelete(food)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
    }
}

struct FoodRowCard: View {
    let food: SolidFood

    var body: some View {
        HStack(spacing: 12) {
            // Category icon
            ZStack {
                Circle()
                    .fill(food.category.color.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: food.category.icon)
                    .font(.title3)
                    .foregroundStyle(food.category.color)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(food.foodName)
                        .font(.headline)

                    if food.isFirstIntroduction {
                        Text("FIRST")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.yellow)
                            .foregroundStyle(.black)
                            .clipShape(Capsule())
                    }
                }

                HStack(spacing: 8) {
                    Text(food.date.formatted(date: .omitted, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let liked = food.liked {
                        HStack(spacing: 2) {
                            Image(systemName: liked.icon)
                            Text(liked.rawValue)
                        }
                        .font(.caption)
                        .foregroundStyle(liked.color)
                    }

                    if let reaction = food.reaction, reaction != .none {
                        HStack(spacing: 2) {
                            Image(systemName: reaction.icon)
                            Text(reaction.rawValue)
                        }
                        .font(.caption)
                        .foregroundStyle(reaction.color)
                    }
                }
            }

            Spacer()

            if food.photoData != nil {
                Image(systemName: "photo.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Empty State

struct EmptyFoodStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "carrot.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange.opacity(0.6))

            Text("No Foods Logged")
                .font(.headline)

            Text("Tap + to start tracking your baby's solid food journey.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Add Solid Food Sheet

struct AddSolidFoodSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let baby: Baby?

    @State private var foodName = ""
    @State private var date = Date()
    @State private var category: FoodCategory = .other
    @State private var isFirstIntroduction = false
    @State private var reaction: FoodReaction = .none
    @State private var reactionNotes = ""
    @State private var liked: FoodPreference?
    @State private var notes = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var photoData: Data?

    var body: some View {
        NavigationStack {
            Form {
                Section("Food Details") {
                    TextField("Food Name", text: $foodName)

                    DatePicker("Date & Time", selection: $date)

                    Picker("Category", selection: $category) {
                        ForEach(FoodCategory.allCases, id: \.self) { cat in
                            Label(cat.rawValue, systemImage: cat.icon)
                                .tag(cat)
                        }
                    }

                    Toggle("First Time Trying", isOn: $isFirstIntroduction)
                }

                Section("Baby's Response") {
                    Picker("Reaction", selection: $reaction) {
                        ForEach(FoodReaction.allCases, id: \.self) { r in
                            Label(r.rawValue, systemImage: r.icon)
                                .tag(r)
                        }
                    }

                    if reaction != .none {
                        TextField("Reaction Notes", text: $reactionNotes, axis: .vertical)
                            .lineLimit(2...4)
                    }

                    Picker("Did Baby Like It?", selection: $liked) {
                        Text("Not Sure").tag(nil as FoodPreference?)
                        ForEach(FoodPreference.allCases, id: \.self) { pref in
                            Label(pref.rawValue, systemImage: pref.icon)
                                .tag(pref as FoodPreference?)
                        }
                    }
                }

                Section("Photo") {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        if let photoData = photoData,
                           let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(height: 150)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        } else {
                            Label("Add Photo", systemImage: "photo.badge.plus")
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

                Section("Quick Suggestions") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(CommonFoods.suggestions.prefix(10), id: \.0) { name, cat in
                                Button {
                                    foodName = name
                                    category = cat
                                } label: {
                                    Text(name)
                                        .font(.caption)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(cat.color.opacity(0.15))
                                        .foregroundStyle(cat.color)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section("Notes") {
                    TextField("Additional notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Log Food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveFood()
                    }
                    .disabled(foodName.isEmpty)
                }
            }
        }
    }

    private func saveFood() {
        let food = SolidFood(
            foodName: foodName,
            date: date,
            category: category,
            isFirstIntroduction: isFirstIntroduction,
            reaction: reaction,
            reactionNotes: reactionNotes.isEmpty ? nil : reactionNotes,
            liked: liked,
            photoData: photoData,
            notes: notes.isEmpty ? nil : notes
        )
        food.baby = baby
        modelContext.insert(food)
        dismiss()
    }
}

// MARK: - Edit Solid Food Sheet

struct EditSolidFoodSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var food: SolidFood

    @State private var foodName = ""
    @State private var date = Date()
    @State private var category: FoodCategory = .other
    @State private var isFirstIntroduction = false
    @State private var reaction: FoodReaction = .none
    @State private var reactionNotes = ""
    @State private var liked: FoodPreference?
    @State private var notes = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var photoData: Data?

    var body: some View {
        NavigationStack {
            Form {
                Section("Food Details") {
                    TextField("Food Name", text: $foodName)

                    DatePicker("Date & Time", selection: $date)

                    Picker("Category", selection: $category) {
                        ForEach(FoodCategory.allCases, id: \.self) { cat in
                            Label(cat.rawValue, systemImage: cat.icon)
                                .tag(cat)
                        }
                    }

                    Toggle("First Time Trying", isOn: $isFirstIntroduction)
                }

                Section("Baby's Response") {
                    Picker("Reaction", selection: $reaction) {
                        ForEach(FoodReaction.allCases, id: \.self) { r in
                            Label(r.rawValue, systemImage: r.icon)
                                .tag(r)
                        }
                    }

                    if reaction != .none {
                        TextField("Reaction Notes", text: $reactionNotes, axis: .vertical)
                            .lineLimit(2...4)
                    }

                    Picker("Did Baby Like It?", selection: $liked) {
                        Text("Not Sure").tag(nil as FoodPreference?)
                        ForEach(FoodPreference.allCases, id: \.self) { pref in
                            Label(pref.rawValue, systemImage: pref.icon)
                                .tag(pref as FoodPreference?)
                        }
                    }
                }

                Section("Photo") {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        if let data = photoData,
                           let uiImage = UIImage(data: data) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(height: 150)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        } else {
                            Label("Add Photo", systemImage: "photo.badge.plus")
                        }
                    }
                    .onChange(of: selectedPhotoItem) { _, newItem in
                        Task {
                            if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                photoData = data
                            }
                        }
                    }

                    if photoData != nil {
                        Button("Remove Photo", role: .destructive) {
                            photoData = nil
                        }
                    }
                }

                Section("Notes") {
                    TextField("Additional notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section {
                    Button(role: .destructive) {
                        modelContext.delete(food)
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Delete Entry")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Edit Food")
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
                    .disabled(foodName.isEmpty)
                }
            }
            .onAppear {
                loadFoodData()
            }
        }
    }

    private func loadFoodData() {
        foodName = food.foodName
        date = food.date
        category = food.category
        isFirstIntroduction = food.isFirstIntroduction
        reaction = food.reaction ?? .none
        reactionNotes = food.reactionNotes ?? ""
        liked = food.liked
        notes = food.notes ?? ""
        photoData = food.photoData
    }

    private func saveChanges() {
        food.foodName = foodName
        food.date = date
        food.category = category
        food.isFirstIntroduction = isFirstIntroduction
        food.reaction = reaction
        food.reactionNotes = reactionNotes.isEmpty ? nil : reactionNotes
        food.liked = liked
        food.notes = notes.isEmpty ? nil : notes
        food.photoData = photoData
        dismiss()
    }
}

#Preview {
    SolidFoodView()
        .environmentObject(AppState())
        .modelContainer(for: SolidFood.self, inMemory: true)
}
