import XCTest
@testable import BabyTrack

final class UnitConversionTests: XCTestCase {

    // MARK: - Volume Conversion Tests

    func testOzToMl() {
        let oz = 1.0
        let ml = VolumeUnit.oz.convert(oz, to: .ml)

        XCTAssertEqual(ml, 29.5735, accuracy: 0.001)
    }

    func testMlToOz() {
        let ml = 29.5735
        let oz = VolumeUnit.ml.convert(ml, to: .oz)

        XCTAssertEqual(oz, 1.0, accuracy: 0.001)
    }

    func testOzToOz() {
        let oz = 5.0
        let result = VolumeUnit.oz.convert(oz, to: .oz)

        XCTAssertEqual(result, 5.0)
    }

    // MARK: - Weight Conversion Tests

    func testLbsToKg() {
        let lbs = 10.0
        let kg = WeightUnit.lbs.convert(lbs, to: .kg)

        XCTAssertEqual(kg, 4.53592, accuracy: 0.001)
    }

    func testKgToLbs() {
        let kg = 4.53592
        let lbs = WeightUnit.kg.convert(kg, to: .lbs)

        XCTAssertEqual(lbs, 10.0, accuracy: 0.001)
    }

    func testKgToKg() {
        let kg = 7.5
        let result = WeightUnit.kg.convert(kg, to: .kg)

        XCTAssertEqual(result, 7.5)
    }

    // MARK: - Length Conversion Tests

    func testInchesToCm() {
        let inches = 10.0
        let cm = LengthUnit.inches.convert(inches, to: .cm)

        XCTAssertEqual(cm, 25.4, accuracy: 0.001)
    }

    func testCmToInches() {
        let cm = 25.4
        let inches = LengthUnit.cm.convert(cm, to: .inches)

        XCTAssertEqual(inches, 10.0, accuracy: 0.001)
    }

    func testCmToCm() {
        let cm = 50.0
        let result = LengthUnit.cm.convert(cm, to: .cm)

        XCTAssertEqual(result, 50.0)
    }

    // MARK: - Round Trip Tests

    func testVolumeRoundTrip() {
        let original = 8.0  // oz
        let ml = VolumeUnit.oz.convert(original, to: .ml)
        let backToOz = VolumeUnit.ml.convert(ml, to: .oz)

        XCTAssertEqual(original, backToOz, accuracy: 0.001)
    }

    func testWeightRoundTrip() {
        let original = 15.0  // lbs
        let kg = WeightUnit.lbs.convert(original, to: .kg)
        let backToLbs = WeightUnit.kg.convert(kg, to: .lbs)

        XCTAssertEqual(original, backToLbs, accuracy: 0.001)
    }

    func testLengthRoundTrip() {
        let original = 24.0  // inches
        let cm = LengthUnit.inches.convert(original, to: .cm)
        let backToInches = LengthUnit.cm.convert(cm, to: .inches)

        XCTAssertEqual(original, backToInches, accuracy: 0.001)
    }
}
