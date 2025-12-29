import XCTest
@testable import BabyTrack

final class VaccinationTests: XCTestCase {

    func testVaccinationInitialization() {
        let vaccination = Vaccination(
            name: "MMR",
            scheduledDate: Date(),
            location: "Clinic A"
        )

        XCTAssertEqual(vaccination.name, "MMR")
        XCTAssertNotNil(vaccination.scheduledDate)
        XCTAssertEqual(vaccination.location, "Clinic A")
        XCTAssertNil(vaccination.administeredDate)
        XCTAssertTrue(vaccination.reminderEnabled)
    }

    func testIsCompleted() {
        let vaccination = Vaccination(name: "DTaP", scheduledDate: Date())

        XCTAssertFalse(vaccination.isCompleted)

        vaccination.administeredDate = Date()

        XCTAssertTrue(vaccination.isCompleted)
    }

    func testIsOverdue() {
        let calendar = Calendar.current
        let yesterday = calendar.date(byAdding: .day, value: -1, to: Date())!

        let vaccination = Vaccination(name: "Test", scheduledDate: yesterday)

        XCTAssertTrue(vaccination.isOverdue)
        XCTAssertFalse(vaccination.isUpcoming)
    }

    func testIsUpcoming() {
        let calendar = Calendar.current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date())!

        let vaccination = Vaccination(name: "Test", scheduledDate: tomorrow)

        XCTAssertTrue(vaccination.isUpcoming)
        XCTAssertFalse(vaccination.isOverdue)
    }

    func testDaysUntilDue_Future() {
        let calendar = Calendar.current
        let fiveDaysFromNow = calendar.date(byAdding: .day, value: 5, to: Date())!

        let vaccination = Vaccination(name: "Test", scheduledDate: fiveDaysFromNow)

        XCTAssertNotNil(vaccination.daysUntilDue)
        XCTAssertEqual(vaccination.daysUntilDue, 5)
    }

    func testDaysUntilDue_Completed() {
        let vaccination = Vaccination(name: "Test", scheduledDate: Date())
        vaccination.administeredDate = Date()

        XCTAssertNil(vaccination.daysUntilDue)
    }

    func testStatusText_Completed() {
        let vaccination = Vaccination(name: "Test", scheduledDate: Date())
        vaccination.administeredDate = Date()

        XCTAssertEqual(vaccination.statusText, "Completed")
    }

    func testStatusText_Overdue() {
        let calendar = Calendar.current
        let yesterday = calendar.date(byAdding: .day, value: -1, to: Date())!

        let vaccination = Vaccination(name: "Test", scheduledDate: yesterday)

        XCTAssertEqual(vaccination.statusText, "Overdue")
    }
}
