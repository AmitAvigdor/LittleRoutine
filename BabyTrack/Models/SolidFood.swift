import Foundation
import SwiftData
import SwiftUI

@Model
final class SolidFood {
    var id: UUID
    var date: Date
    var foodName: String
    var category: FoodCategory
    var isFirstIntroduction: Bool
    var reaction: FoodReaction?
    var reactionNotes: String?
    var liked: FoodPreference?
    var photoData: Data?
    var notes: String?
    var baby: Baby?

    init(
        foodName: String,
        date: Date = Date(),
        category: FoodCategory = .other,
        isFirstIntroduction: Bool = false,
        reaction: FoodReaction? = nil,
        reactionNotes: String? = nil,
        liked: FoodPreference? = nil,
        photoData: Data? = nil,
        notes: String? = nil
    ) {
        self.id = UUID()
        self.date = date
        self.foodName = foodName
        self.category = category
        self.isFirstIntroduction = isFirstIntroduction
        self.reaction = reaction
        self.reactionNotes = reactionNotes
        self.liked = liked
        self.photoData = photoData
        self.notes = notes
    }

    var formattedDate: String {
        date.formatted(date: .abbreviated, time: .shortened)
    }

    var hasReaction: Bool {
        guard let reaction = reaction else { return false }
        return reaction != .none
    }
}

// MARK: - Food Category

enum FoodCategory: String, Codable, CaseIterable {
    case fruit = "Fruit"
    case vegetable = "Vegetable"
    case grain = "Grain"
    case protein = "Protein"
    case dairy = "Dairy"
    case other = "Other"

    var icon: String {
        switch self {
        case .fruit: return "leaf.fill"
        case .vegetable: return "carrot.fill"
        case .grain: return "takeoutbag.and.cup.and.straw.fill"
        case .protein: return "fish.fill"
        case .dairy: return "cup.and.saucer.fill"
        case .other: return "fork.knife"
        }
    }

    var color: Color {
        switch self {
        case .fruit: return .red
        case .vegetable: return .green
        case .grain: return .orange
        case .protein: return .brown
        case .dairy: return .blue
        case .other: return .gray
        }
    }
}

// MARK: - Food Reaction

enum FoodReaction: String, Codable, CaseIterable {
    case none = "None"
    case mild = "Mild"
    case moderate = "Moderate"
    case severe = "Severe"

    var icon: String {
        switch self {
        case .none: return "checkmark.circle.fill"
        case .mild: return "exclamationmark.circle.fill"
        case .moderate: return "exclamationmark.triangle.fill"
        case .severe: return "xmark.octagon.fill"
        }
    }

    var color: Color {
        switch self {
        case .none: return .green
        case .mild: return .yellow
        case .moderate: return .orange
        case .severe: return .red
        }
    }
}

// MARK: - Food Preference

enum FoodPreference: String, Codable, CaseIterable {
    case loved = "Loved"
    case neutral = "Neutral"
    case disliked = "Disliked"

    var icon: String {
        switch self {
        case .loved: return "heart.fill"
        case .neutral: return "minus.circle.fill"
        case .disliked: return "hand.thumbsdown.fill"
        }
    }

    var color: Color {
        switch self {
        case .loved: return .pink
        case .neutral: return .gray
        case .disliked: return .orange
        }
    }
}

// MARK: - Common First Foods

struct CommonFoods {
    static let suggestions: [(String, FoodCategory)] = [
        // Vegetables
        ("Avocado", .vegetable),
        ("Sweet Potato", .vegetable),
        ("Butternut Squash", .vegetable),
        ("Carrots", .vegetable),
        ("Peas", .vegetable),
        ("Green Beans", .vegetable),
        ("Broccoli", .vegetable),
        ("Zucchini", .vegetable),

        // Fruits
        ("Banana", .fruit),
        ("Apple", .fruit),
        ("Pear", .fruit),
        ("Mango", .fruit),
        ("Peach", .fruit),
        ("Blueberries", .fruit),
        ("Strawberries", .fruit),

        // Grains
        ("Rice Cereal", .grain),
        ("Oatmeal", .grain),
        ("Quinoa", .grain),
        ("Pasta", .grain),
        ("Bread", .grain),

        // Protein
        ("Chicken", .protein),
        ("Turkey", .protein),
        ("Beef", .protein),
        ("Fish", .protein),
        ("Eggs", .protein),
        ("Tofu", .protein),
        ("Lentils", .protein),
        ("Beans", .protein),

        // Dairy
        ("Yogurt", .dairy),
        ("Cheese", .dairy)
    ]
}
