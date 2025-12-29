import XCTest
@testable import BabyTrack

final class DiaryEntryTests: XCTestCase {

    func testDiaryEntryInitialization() {
        let entry = DiaryEntry(
            date: Date(),
            title: "First smile!",
            notes: "Baby smiled for the first time today",
            mood: .happy
        )

        XCTAssertNotNil(entry.id)
        XCTAssertNotNil(entry.date)
        XCTAssertEqual(entry.title, "First smile!")
        XCTAssertEqual(entry.notes, "Baby smiled for the first time today")
        XCTAssertEqual(entry.mood, .happy)
        XCTAssertNil(entry.photoData)
    }

    func testHasPhoto() {
        let entryWithPhoto = DiaryEntry()
        entryWithPhoto.photoData = Data([0x00, 0x01, 0x02])

        XCTAssertTrue(entryWithPhoto.hasPhoto)

        let entryWithoutPhoto = DiaryEntry()

        XCTAssertFalse(entryWithoutPhoto.hasPhoto)
    }

    func testDisplayTitle_WithTitle() {
        let entry = DiaryEntry(title: "Special moment")

        XCTAssertEqual(entry.displayTitle, "Special moment")
    }

    func testDisplayTitle_WithoutTitle() {
        let entry = DiaryEntry(title: nil)

        // Should fall back to formatted date
        XCTAssertEqual(entry.displayTitle, entry.formattedDate)
    }

    func testDisplayTitle_EmptyTitle() {
        let entry = DiaryEntry(title: "")

        // Empty string should also fall back to date
        XCTAssertEqual(entry.displayTitle, entry.formattedDate)
    }

    func testFormattedDate() {
        let entry = DiaryEntry()

        // formattedDate should not be empty
        XCTAssertFalse(entry.formattedDate.isEmpty)
    }

    func testFormattedDateOnly() {
        let entry = DiaryEntry()

        // Should not contain time
        XCTAssertFalse(entry.formattedDateOnly.isEmpty)
    }

    func testFormattedTimeOnly() {
        let entry = DiaryEntry()

        // Should not be empty
        XCTAssertFalse(entry.formattedTimeOnly.isEmpty)
    }
}
