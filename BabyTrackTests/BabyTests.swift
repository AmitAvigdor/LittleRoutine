import XCTest
@testable import BabyTrack

final class BabyTests: XCTestCase {

    func testBabyInitialization() {
        let baby = Baby(name: "Emma", birthDate: Date(), color: "9C27B0")

        XCTAssertEqual(baby.name, "Emma")
        XCTAssertNotNil(baby.birthDate)
        XCTAssertEqual(baby.color, "9C27B0")
        XCTAssertNotNil(baby.id)
        XCTAssertFalse(baby.isActive)
    }

    func testBabyInitials() {
        let baby1 = Baby(name: "Emma Rose")
        XCTAssertEqual(baby1.initials, "ER")

        let baby2 = Baby(name: "Jack")
        XCTAssertEqual(baby2.initials, "JA")

        let baby3 = Baby(name: "A")
        XCTAssertEqual(baby3.initials, "A")
    }

    func testBabyAge_Days() {
        let calendar = Calendar.current
        let fiveDaysAgo = calendar.date(byAdding: .day, value: -5, to: Date())!

        let baby = Baby(name: "Newborn", birthDate: fiveDaysAgo)

        XCTAssertNotNil(baby.age)
        XCTAssertTrue(baby.age!.contains("5 days"))
    }

    func testBabyAge_Months() {
        let calendar = Calendar.current
        let twoMonthsAgo = calendar.date(byAdding: .month, value: -2, to: Date())!

        let baby = Baby(name: "Infant", birthDate: twoMonthsAgo)

        XCTAssertNotNil(baby.age)
        XCTAssertTrue(baby.age!.contains("2 month"))
    }

    func testBabyAge_NoBirthDate() {
        let baby = Baby(name: "Unknown", birthDate: nil)

        XCTAssertNil(baby.age)
    }

    func testDisplayColor() {
        let baby = Baby(name: "Test", color: "FF0000")

        XCTAssertNotNil(baby.displayColor)
    }

    func testDefaultColor() {
        let baby = Baby(name: "Test")

        // Default color is purple: 9C27B0
        XCTAssertEqual(baby.color, "9C27B0")
    }
}
