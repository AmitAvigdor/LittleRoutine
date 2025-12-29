import XCTest

final class BabyTrackUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Tab Navigation Tests

    func testTabNavigation() throws {
        // Test that all main tabs exist and are tappable
        let tabBar = app.tabBars.firstMatch

        XCTAssertTrue(tabBar.exists)

        // Navigate to Sleep tab
        tabBar.buttons["Sleep"].tap()
        XCTAssertTrue(app.navigationBars["Sleep"].exists)

        // Navigate to Diaper tab
        tabBar.buttons["Diaper"].tap()
        XCTAssertTrue(app.navigationBars["Diapers"].exists)

        // Navigate to Stats tab
        tabBar.buttons["Stats"].tap()
        XCTAssertTrue(app.navigationBars["Statistics"].exists)

        // Navigate to More tab
        tabBar.buttons["More"].tap()
        XCTAssertTrue(app.navigationBars["More"].exists)

        // Navigate back to Feed tab
        tabBar.buttons["Feed"].tap()
    }

    // MARK: - More Menu Navigation Tests

    func testMoreMenuNavigation() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Test Features section navigation
        let featuresList = app.tables.firstMatch

        // Test Growth Tracking navigation
        featuresList.cells["Growth Tracking"].tap()
        XCTAssertTrue(app.navigationBars["Growth Tracking"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // Test Milestones navigation
        featuresList.cells["Milestones"].tap()
        XCTAssertTrue(app.navigationBars["Milestones"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // Test Vaccinations navigation
        featuresList.cells["Vaccinations"].tap()
        XCTAssertTrue(app.navigationBars["Vaccinations"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()
    }

    // MARK: - Settings Navigation Tests

    func testSettingsNavigation() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        let settingsList = app.tables.firstMatch

        // Test App Settings
        settingsList.cells["App Settings"].tap()
        XCTAssertTrue(app.navigationBars["App Settings"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // Test Night Mode
        settingsList.cells["Night Mode"].tap()
        XCTAssertTrue(app.navigationBars["Night Mode"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // Test Reminders
        settingsList.cells["Reminders"].tap()
        XCTAssertTrue(app.navigationBars["Reminders"].waitForExistence(timeout: 2))
        app.navigationBars.buttons.element(boundBy: 0).tap()
    }

    // MARK: - Add Baby Flow Tests

    func testAddBabyFlow() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Tap on Manage All Babies
        app.tables.cells["Manage All Babies"].tap()

        // Wait for baby list to appear
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 2))

        // Tap add button
        app.navigationBars.buttons["Add"].tap()

        // Check if add baby sheet appears
        XCTAssertTrue(app.textFields["Baby's Name"].waitForExistence(timeout: 2))
    }

    // MARK: - Vaccination Flow Tests

    func testAddVaccinationFlow() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Navigate to Vaccinations
        app.tables.cells["Vaccinations"].tap()

        // Tap add button
        app.navigationBars.buttons["plus"].tap()

        // Check if add vaccination sheet appears
        XCTAssertTrue(app.textFields["Vaccine Name"].waitForExistence(timeout: 2))

        // Cancel
        app.buttons["Cancel"].tap()
    }

    // MARK: - Solid Food Flow Tests

    func testAddSolidFoodFlow() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Navigate to Solid Foods
        app.tables.cells["Solid Foods"].tap()

        // Tap add button
        app.navigationBars.buttons["plus"].tap()

        // Check if add food sheet appears
        XCTAssertTrue(app.textFields["Food Name"].waitForExistence(timeout: 2))

        // Cancel
        app.buttons["Cancel"].tap()
    }

    // MARK: - Photo Diary Flow Tests

    func testPhotoDiaryNavigation() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Navigate to Photo Diary
        app.tables.cells["Photo Diary"].tap()

        // Check navigation title
        XCTAssertTrue(app.navigationBars["Photo Diary"].waitForExistence(timeout: 2))

        // Tap add button
        app.navigationBars.buttons["plus"].tap()

        // Check if add diary entry sheet appears
        XCTAssertTrue(app.staticTexts["New Entry"].waitForExistence(timeout: 2))

        // Cancel
        app.buttons["Cancel"].tap()
    }

    // MARK: - Export Flow Tests

    func testDataExportNavigation() throws {
        // Go to More tab
        app.tabBars.buttons["More"].tap()

        // Navigate to Export Data
        app.tables.cells["Export Data (CSV/JSON)"].tap()

        // Check navigation title
        XCTAssertTrue(app.navigationBars["Export Data"].waitForExistence(timeout: 2))
    }
}
