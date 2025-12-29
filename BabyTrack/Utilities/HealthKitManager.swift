import Foundation
import HealthKit

@MainActor
class HealthKitManager: ObservableObject {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()

    @Published var isAuthorized = false
    @Published var authorizationStatus: HKAuthorizationStatus = .notDetermined

    // Types we want to write
    private let typesToWrite: Set<HKSampleType> = [
        HKQuantityType(.bodyMass),
        HKQuantityType(.height)
    ]

    // Types we want to read
    private let typesToRead: Set<HKObjectType> = [
        HKQuantityType(.bodyMass),
        HKQuantityType(.height)
    ]

    private init() {}

    // MARK: - Authorization

    var isHealthKitAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    func requestAuthorization() async throws {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)

        // Check authorization status after request
        await updateAuthorizationStatus()
    }

    func updateAuthorizationStatus() async {
        guard isHealthKitAvailable else {
            isAuthorized = false
            return
        }

        // Check if we have write permission for body mass (as a proxy for overall authorization)
        let status = healthStore.authorizationStatus(for: HKQuantityType(.bodyMass))
        authorizationStatus = status
        isAuthorized = status == .sharingAuthorized
    }

    // MARK: - Write Data

    func saveWeight(kilograms: Double, date: Date) async throws {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        let weightType = HKQuantityType(.bodyMass)
        let weightQuantity = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: kilograms)
        let weightSample = HKQuantitySample(
            type: weightType,
            quantity: weightQuantity,
            start: date,
            end: date
        )

        try await healthStore.save(weightSample)
    }

    func saveHeight(centimeters: Double, date: Date) async throws {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        let heightType = HKQuantityType(.height)
        let heightQuantity = HKQuantity(unit: .meterUnit(with: .centi), doubleValue: centimeters)
        let heightSample = HKQuantitySample(
            type: heightType,
            quantity: heightQuantity,
            start: date,
            end: date
        )

        try await healthStore.save(heightSample)
    }

    func saveGrowthEntry(weightLbs: Double?, heightInches: Double?, date: Date) async throws {
        // Convert and save weight
        if let weightLbs = weightLbs {
            let weightKg = weightLbs * 0.453592
            try await saveWeight(kilograms: weightKg, date: date)
        }

        // Convert and save height
        if let heightInches = heightInches {
            let heightCm = heightInches * 2.54
            try await saveHeight(centimeters: heightCm, date: date)
        }
    }

    // MARK: - Read Data

    func fetchLatestWeight() async throws -> (value: Double, date: Date)? {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        let weightType = HKQuantityType(.bodyMass)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let samples = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKQuantitySample], Error>) in
            let query = HKSampleQuery(
                sampleType: weightType,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: samples as? [HKQuantitySample] ?? [])
                }
            }

            healthStore.execute(query)
        }

        guard let sample = samples.first else { return nil }

        let weightKg = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
        return (value: weightKg, date: sample.startDate)
    }

    func fetchLatestHeight() async throws -> (value: Double, date: Date)? {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }

        let heightType = HKQuantityType(.height)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let samples = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKQuantitySample], Error>) in
            let query = HKSampleQuery(
                sampleType: heightType,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: samples as? [HKQuantitySample] ?? [])
                }
            }

            healthStore.execute(query)
        }

        guard let sample = samples.first else { return nil }

        let heightCm = sample.quantity.doubleValue(for: .meterUnit(with: .centi))
        return (value: heightCm, date: sample.startDate)
    }
}

// MARK: - Errors

enum HealthKitError: LocalizedError {
    case notAvailable
    case notAuthorized
    case saveFailed

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "HealthKit is not available on this device"
        case .notAuthorized:
            return "HealthKit access has not been authorized"
        case .saveFailed:
            return "Failed to save data to HealthKit"
        }
    }
}
