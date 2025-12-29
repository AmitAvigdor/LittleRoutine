import XCTest
@testable import BabyTrack

final class TeethingTests: XCTestCase {

    func testTeethingEventInitialization() {
        let event = TeethingEvent(
            toothPosition: .lowerLeftCentralIncisor,
            firstSignsDate: Date(),
            symptoms: [.drooling, .fussiness]
        )

        XCTAssertEqual(event.toothPosition, .lowerLeftCentralIncisor)
        XCTAssertNotNil(event.firstSignsDate)
        XCTAssertNil(event.eruptionDate)
        XCTAssertEqual(event.symptoms.count, 2)
    }

    func testIsErupted() {
        let event = TeethingEvent(toothPosition: .upperLeftCentralIncisor)

        XCTAssertFalse(event.isErupted)

        event.eruptionDate = Date()

        XCTAssertTrue(event.isErupted)
    }

    func testIsTeething() {
        let event = TeethingEvent(
            toothPosition: .lowerRightCentralIncisor,
            firstSignsDate: Date()
        )

        XCTAssertTrue(event.isTeething)

        event.eruptionDate = Date()

        XCTAssertFalse(event.isTeething)
    }

    func testStatusText() {
        let event1 = TeethingEvent(toothPosition: .upperLeftCanine)
        XCTAssertEqual(event1.statusText, "Not Started")

        let event2 = TeethingEvent(toothPosition: .upperLeftCanine, firstSignsDate: Date())
        XCTAssertEqual(event2.statusText, "Teething")

        let event3 = TeethingEvent(toothPosition: .upperLeftCanine, eruptionDate: Date())
        XCTAssertEqual(event3.statusText, "Erupted")
    }

    func testToothPositionName() {
        XCTAssertEqual(ToothPosition.lowerLeftCentralIncisor.name, "Central Incisor")
        XCTAssertEqual(ToothPosition.upperRightCanine.name, "Canine")
        XCTAssertEqual(ToothPosition.lowerLeftFirstMolar.name, "First Molar")
        XCTAssertEqual(ToothPosition.upperRightSecondMolar.name, "Second Molar")
    }

    func testToothPositionIsUpper() {
        XCTAssertTrue(ToothPosition.upperLeftCentralIncisor.isUpper)
        XCTAssertTrue(ToothPosition.upperRightSecondMolar.isUpper)
        XCTAssertFalse(ToothPosition.lowerLeftCentralIncisor.isUpper)
    }

    func testToothPositionIsLower() {
        XCTAssertTrue(ToothPosition.lowerLeftCentralIncisor.isLower)
        XCTAssertTrue(ToothPosition.lowerRightSecondMolar.isLower)
        XCTAssertFalse(ToothPosition.upperLeftCentralIncisor.isLower)
    }

    func testToothPositionTypicalEruptionAge() {
        let centralIncisor = ToothPosition.lowerLeftCentralIncisor.typicalEruptionAge
        XCTAssertEqual(centralIncisor.lowerBound, 6)
        XCTAssertEqual(centralIncisor.upperBound, 10)

        let secondMolar = ToothPosition.upperLeftSecondMolar.typicalEruptionAge
        XCTAssertEqual(secondMolar.lowerBound, 23)
        XCTAssertEqual(secondMolar.upperBound, 33)
    }

    func testToothCount() {
        XCTAssertEqual(ToothPosition.allCases.count, 20)
    }

    func testTeethingSymptoms() {
        XCTAssertEqual(TeethingSymptom.allCases.count, 9)
        XCTAssertNotNil(TeethingSymptom.drooling.icon)
        XCTAssertNotNil(TeethingSymptom.fussiness.color)
    }
}
