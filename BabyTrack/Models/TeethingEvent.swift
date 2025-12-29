import Foundation
import SwiftData
import SwiftUI

@Model
final class TeethingEvent {
    var id: UUID
    var toothPosition: ToothPosition
    var firstSignsDate: Date?
    var eruptionDate: Date?
    var symptomsRaw: [String]
    var remediesUsed: String?
    var notes: String?
    var baby: Baby?

    init(
        toothPosition: ToothPosition,
        firstSignsDate: Date? = nil,
        eruptionDate: Date? = nil,
        symptoms: [TeethingSymptom] = [],
        remediesUsed: String? = nil,
        notes: String? = nil
    ) {
        self.id = UUID()
        self.toothPosition = toothPosition
        self.firstSignsDate = firstSignsDate
        self.eruptionDate = eruptionDate
        self.symptomsRaw = symptoms.map { $0.rawValue }
        self.remediesUsed = remediesUsed
        self.notes = notes
    }

    var symptoms: [TeethingSymptom] {
        get { symptomsRaw.compactMap { TeethingSymptom(rawValue: $0) } }
        set { symptomsRaw = newValue.map { $0.rawValue } }
    }

    var isErupted: Bool {
        eruptionDate != nil
    }

    var isTeething: Bool {
        firstSignsDate != nil && eruptionDate == nil
    }

    var statusText: String {
        if isErupted {
            return "Erupted"
        } else if isTeething {
            return "Teething"
        } else {
            return "Not Started"
        }
    }

    var formattedEruptionDate: String? {
        eruptionDate?.formatted(date: .abbreviated, time: .omitted)
    }

    var formattedFirstSignsDate: String? {
        firstSignsDate?.formatted(date: .abbreviated, time: .omitted)
    }
}

// MARK: - Tooth Position

enum ToothPosition: Int, Codable, CaseIterable {
    // Lower teeth (bottom row, left to right from baby's perspective)
    case lowerRightSecondMolar = 1
    case lowerRightFirstMolar = 2
    case lowerRightCanine = 3
    case lowerRightLateralIncisor = 4
    case lowerRightCentralIncisor = 5
    case lowerLeftCentralIncisor = 6
    case lowerLeftLateralIncisor = 7
    case lowerLeftCanine = 8
    case lowerLeftFirstMolar = 9
    case lowerLeftSecondMolar = 10

    // Upper teeth (top row, left to right from baby's perspective)
    case upperRightSecondMolar = 11
    case upperRightFirstMolar = 12
    case upperRightCanine = 13
    case upperRightLateralIncisor = 14
    case upperRightCentralIncisor = 15
    case upperLeftCentralIncisor = 16
    case upperLeftLateralIncisor = 17
    case upperLeftCanine = 18
    case upperLeftFirstMolar = 19
    case upperLeftSecondMolar = 20

    var name: String {
        switch self {
        case .lowerRightCentralIncisor, .lowerLeftCentralIncisor:
            return "Central Incisor"
        case .upperRightCentralIncisor, .upperLeftCentralIncisor:
            return "Central Incisor"
        case .lowerRightLateralIncisor, .lowerLeftLateralIncisor:
            return "Lateral Incisor"
        case .upperRightLateralIncisor, .upperLeftLateralIncisor:
            return "Lateral Incisor"
        case .lowerRightCanine, .lowerLeftCanine:
            return "Canine"
        case .upperRightCanine, .upperLeftCanine:
            return "Canine"
        case .lowerRightFirstMolar, .lowerLeftFirstMolar:
            return "First Molar"
        case .upperRightFirstMolar, .upperLeftFirstMolar:
            return "First Molar"
        case .lowerRightSecondMolar, .lowerLeftSecondMolar:
            return "Second Molar"
        case .upperRightSecondMolar, .upperLeftSecondMolar:
            return "Second Molar"
        }
    }

    var fullName: String {
        let position = isUpper ? "Upper" : "Lower"
        let side = isRight ? "Right" : "Left"
        return "\(position) \(side) \(name)"
    }

    var shortName: String {
        let side = isRight ? "R" : "L"
        let position = isUpper ? "U" : "L"
        return "\(position)\(side)"
    }

    var isUpper: Bool {
        rawValue >= 11
    }

    var isLower: Bool {
        rawValue <= 10
    }

    var isRight: Bool {
        switch self {
        case .lowerRightSecondMolar, .lowerRightFirstMolar, .lowerRightCanine,
             .lowerRightLateralIncisor, .lowerRightCentralIncisor,
             .upperRightSecondMolar, .upperRightFirstMolar, .upperRightCanine,
             .upperRightLateralIncisor, .upperRightCentralIncisor:
            return true
        default:
            return false
        }
    }

    var isLeft: Bool {
        !isRight
    }

    // Typical eruption age in months (approximate)
    var typicalEruptionAge: ClosedRange<Int> {
        switch self {
        case .lowerRightCentralIncisor, .lowerLeftCentralIncisor:
            return 6...10
        case .upperRightCentralIncisor, .upperLeftCentralIncisor:
            return 8...12
        case .upperRightLateralIncisor, .upperLeftLateralIncisor:
            return 9...13
        case .lowerRightLateralIncisor, .lowerLeftLateralIncisor:
            return 10...16
        case .upperRightFirstMolar, .upperLeftFirstMolar,
             .lowerRightFirstMolar, .lowerLeftFirstMolar:
            return 13...19
        case .upperRightCanine, .upperLeftCanine,
             .lowerRightCanine, .lowerLeftCanine:
            return 16...23
        case .upperRightSecondMolar, .upperLeftSecondMolar,
             .lowerRightSecondMolar, .lowerLeftSecondMolar:
            return 23...33
        }
    }
}

// MARK: - Teething Symptom

enum TeethingSymptom: String, Codable, CaseIterable {
    case drooling = "Drooling"
    case fussiness = "Fussiness"
    case biting = "Biting/Chewing"
    case sleepDisruption = "Sleep Disruption"
    case reducedAppetite = "Reduced Appetite"
    case earPulling = "Ear Pulling"
    case cheekRubbing = "Cheek Rubbing"
    case gumSwelling = "Swollen Gums"
    case mildFever = "Mild Fever"

    var icon: String {
        switch self {
        case .drooling: return "drop.fill"
        case .fussiness: return "face.dashed"
        case .biting: return "mouth.fill"
        case .sleepDisruption: return "moon.zzz.fill"
        case .reducedAppetite: return "fork.knife"
        case .earPulling: return "ear.fill"
        case .cheekRubbing: return "hand.raised.fill"
        case .gumSwelling: return "circle.fill"
        case .mildFever: return "thermometer.medium"
        }
    }

    var color: Color {
        switch self {
        case .drooling: return .blue
        case .fussiness: return .orange
        case .biting: return .purple
        case .sleepDisruption: return .indigo
        case .reducedAppetite: return .brown
        case .earPulling: return .pink
        case .cheekRubbing: return .teal
        case .gumSwelling: return .red
        case .mildFever: return .red
        }
    }
}

// MARK: - Common Remedies

struct TeethingRemedies {
    static let suggestions = [
        "Cold teething ring",
        "Chilled washcloth",
        "Gum massage",
        "Teething biscuits",
        "Cold fruit in mesh feeder",
        "Pain reliever (consult doctor)",
        "Teething gel",
        "Silicone teether",
        "Wooden teether",
        "Frozen breast milk popsicle"
    ]
}
