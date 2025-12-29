import SwiftUI
import SwiftData

struct MilestoneView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var appState: AppState
    @Query(sort: \Milestone.achievedDate, order: .reverse) private var allMilestones: [Milestone]
    @Query private var babies: [Baby]

    @State private var showingAddSheet = false
    @State private var selectedCategory: MilestoneCategory?

    // Filter milestones by selected baby
    var milestones: [Milestone] {
        guard let selectedId = appState.selectedBabyId else {
            return allMilestones
        }
        return allMilestones.filter { $0.baby?.id == selectedId }
    }

    var currentBaby: Baby? {
        babies.first { $0.id == appState.selectedBabyId }
    }

    private var achievedMilestones: [Milestone] {
        milestones.filter { $0.isAchieved }
    }

    private var pendingMilestones: [Milestone] {
        milestones.filter { !$0.isAchieved }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Progress summary
                MilestoneProgressCard(
                    achieved: achievedMilestones.count,
                    total: milestones.count
                )

                // Add button
                Button {
                    showingAddSheet = true
                } label: {
                    Label("Add Milestone", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.yellow)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Category filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        CategoryFilterChip(
                            title: "All",
                            isSelected: selectedCategory == nil,
                            color: .purple
                        ) {
                            selectedCategory = nil
                        }

                        ForEach(MilestoneCategory.allCases, id: \.self) { category in
                            CategoryFilterChip(
                                title: category.rawValue,
                                icon: category.icon,
                                isSelected: selectedCategory == category,
                                color: .purple
                            ) {
                                selectedCategory = category
                            }
                        }
                    }
                }

                // Achieved milestones
                if !achievedMilestones.isEmpty {
                    MilestoneSection(
                        title: "Achieved",
                        milestones: filteredMilestones(achievedMilestones),
                        onToggle: { milestone in
                            milestone.isAchieved = false
                            milestone.achievedDate = nil
                        },
                        onDelete: { milestone in
                            modelContext.delete(milestone)
                        }
                    )
                }

                // Pending milestones
                if !pendingMilestones.isEmpty {
                    MilestoneSection(
                        title: "Coming Up",
                        milestones: filteredMilestones(pendingMilestones),
                        onToggle: { milestone in
                            milestone.markAchieved()
                        },
                        onDelete: { milestone in
                            modelContext.delete(milestone)
                        }
                    )
                }

                // Suggestions
                if milestones.isEmpty {
                    SuggestedMilestonesSection {
                        addDefaultMilestones()
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Milestones")
        .sheet(isPresented: $showingAddSheet) {
            AddMilestoneSheet(
                onSave: { name, category, date, notes in
                    let milestone = Milestone(
                        name: name,
                        category: category,
                        achievedDate: date,
                        notes: notes,
                        baby: currentBaby
                    )
                    modelContext.insert(milestone)
                    showingAddSheet = false
                },
                onCancel: {
                    showingAddSheet = false
                }
            )
        }
    }

    private func filteredMilestones(_ list: [Milestone]) -> [Milestone] {
        guard let category = selectedCategory else { return list }
        return list.filter { $0.category == category }
    }

    private func addDefaultMilestones() {
        for (name, category) in CommonMilestones.all {
            let milestone = Milestone(name: name, category: category, baby: currentBaby)
            modelContext.insert(milestone)
        }
    }
}

struct MilestoneProgressCard: View {
    let achieved: Int
    let total: Int

    private var progress: Double {
        guard total > 0 else { return 0 }
        return Double(achieved) / Double(total)
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundStyle(.yellow)
                Text("Milestone Progress")
                    .font(.headline)
                Spacer()
                Text("\(achieved)/\(total)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))

                    RoundedRectangle(cornerRadius: 8)
                        .fill(
                            LinearGradient(
                                colors: [.yellow, .orange],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 12)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct CategoryFilterChip: View {
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
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color(.systemBackground))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(color, lineWidth: 1)
            )
        }
    }
}

struct MilestoneSection: View {
    let title: String
    let milestones: [Milestone]
    let onToggle: (Milestone) -> Void
    let onDelete: (Milestone) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            LazyVStack(spacing: 8) {
                ForEach(milestones) { milestone in
                    MilestoneRow(
                        milestone: milestone,
                        onToggle: { onToggle(milestone) }
                    )
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            onDelete(milestone)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }
}

struct MilestoneRow: View {
    let milestone: Milestone
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Button(action: onToggle) {
                Image(systemName: milestone.isAchieved ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(milestone.isAchieved ? .yellow : .gray)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(milestone.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .strikethrough(milestone.isAchieved)

                HStack {
                    Label(milestone.category.rawValue, systemImage: milestone.category.icon)
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if let date = milestone.formattedAchievedDate {
                        Text("• \(date)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct SuggestedMilestonesSection: View {
    let onAdd: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.yellow)

            Text("Start Tracking Milestones")
                .font(.headline)

            Text("Add common developmental milestones to track your baby's progress")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(action: onAdd) {
                Text("Add Common Milestones")
                    .fontWeight(.medium)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.yellow)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct AddMilestoneSheet: View {
    let onSave: (String, MilestoneCategory, Date?, String?) -> Void
    let onCancel: () -> Void

    @State private var name: String = ""
    @State private var category: MilestoneCategory = .motor
    @State private var isAchieved: Bool = false
    @State private var achievedDate: Date = Date()
    @State private var notes: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Milestone") {
                    TextField("Name", text: $name)

                    Picker("Category", selection: $category) {
                        ForEach(MilestoneCategory.allCases, id: \.self) { cat in
                            Label(cat.rawValue, systemImage: cat.icon).tag(cat)
                        }
                    }
                }

                Section {
                    Toggle("Already Achieved", isOn: $isAchieved)

                    if isAchieved {
                        DatePicker("Date Achieved", selection: $achievedDate, displayedComponents: .date)
                    }
                }

                Section("Notes") {
                    TextField("Optional notes...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle("Add Milestone")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    ToolbarSaveButton(
                        isDisabled: name.isEmpty,
                        action: {
                            onSave(name, category, isAchieved ? achievedDate : nil, notes.isEmpty ? nil : notes)
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
        MilestoneView()
    }
    .modelContainer(for: Milestone.self, inMemory: true)
}
