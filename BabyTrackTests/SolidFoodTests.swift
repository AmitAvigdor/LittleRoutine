import XCTest
@testable import BabyTrack

final class SolidFoodTests: XCTestCase {

    func testSolidFoodInitialization() {
        let food = SolidFood(
            foodName: "Banana",
            category: .fruit,
            isFirstIntroduction: true
        )

        XCTAssertEqual(food.foodName, "Banana")
        XCTAssertEqual(food.category, .fruit)
        XCTAssertTrue(food.isFirstIntroduction)
        XCTAssertNil(food.reaction)
        XCTAssertNil(food.liked)
    }

    func testHasReaction_None() {
        let food = SolidFood(foodName: "Apple", reaction: .none)

        XCTAssertFalse(food.hasReaction)
    }

    func testHasReaction_Mild() {
        let food = SolidFood(foodName: "Strawberry", reaction: .mild)

        XCTAssertTrue(food.hasReaction)
    }

    func testHasReaction_Severe() {
        let food = SolidFood(foodName: "Peanut", reaction: .severe)

        XCTAssertTrue(food.hasReaction)
    }

    func testFoodCategory() {
        XCTAssertEqual(FoodCategory.fruit.rawValue, "Fruit")
        XCTAssertEqual(FoodCategory.vegetable.rawValue, "Vegetable")
        XCTAssertEqual(FoodCategory.grain.rawValue, "Grain")
        XCTAssertEqual(FoodCategory.protein.rawValue, "Protein")
        XCTAssertEqual(FoodCategory.dairy.rawValue, "Dairy")
    }

    func testFoodReaction() {
        XCTAssertEqual(FoodReaction.none.rawValue, "None")
        XCTAssertEqual(FoodReaction.mild.rawValue, "Mild")
        XCTAssertEqual(FoodReaction.moderate.rawValue, "Moderate")
        XCTAssertEqual(FoodReaction.severe.rawValue, "Severe")
    }

    func testFoodPreference() {
        XCTAssertEqual(FoodPreference.loved.rawValue, "Loved")
        XCTAssertEqual(FoodPreference.neutral.rawValue, "Neutral")
        XCTAssertEqual(FoodPreference.disliked.rawValue, "Disliked")
    }

    func testCommonFoodsSuggestions() {
        XCTAssertFalse(CommonFoods.suggestions.isEmpty)
        XCTAssertTrue(CommonFoods.suggestions.count > 20)

        // Check that common first foods are in the list
        let foodNames = CommonFoods.suggestions.map { $0.0 }
        XCTAssertTrue(foodNames.contains("Avocado"))
        XCTAssertTrue(foodNames.contains("Banana"))
        XCTAssertTrue(foodNames.contains("Rice Cereal"))
    }
}
