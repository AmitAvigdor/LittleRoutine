# LittleRoutine

A comprehensive iOS app for parents and caregivers to track their baby's daily activities, growth, and developmental milestones.

![iOS 17.0+](https://img.shields.io/badge/iOS-17.0+-blue.svg)
![Swift 5.9+](https://img.shields.io/badge/Swift-5.9+-orange.svg)
![SwiftUI](https://img.shields.io/badge/SwiftUI-blue.svg)
![SwiftData](https://img.shields.io/badge/SwiftData-green.svg)

## Features

### Core Tracking

| Feature | Description |
|---------|-------------|
| **Breastfeeding** | Timer-based tracking with left/right side monitoring and session history |
| **Bottle Feeding** | Log volume (oz/ml), milk type (breast milk, formula, mixed) |
| **Pumping** | Track duration, volume, and side with milk stash integration |
| **Sleep** | Monitor naps and nighttime sleep with duration calculations |
| **Diapers** | Log wet, dirty, and mixed changes with timestamps and notes |
| **Growth** | Record weight, height, and head circumference with charts |

### Health & Development

| Feature | Description |
|---------|-------------|
| **Vaccination Tracker** | Schedule immunizations with reminders, track completion status |
| **Solid Food Journal** | Log food introductions, allergic reactions, and preferences |
| **Teething Tracker** | Interactive tooth chart with symptom logging |
| **Milestones** | Track developmental progress across motor, cognitive, social, and language |
| **Medicine & Vitamins** | Medication tracking with dosage schedules and reminders |
| **Pediatrician Notes** | Document questions and concerns for doctor visits |

### Memories & Export

| Feature | Description |
|---------|-------------|
| **Photo Diary** | Capture moments with photos, notes, and mood tracking |
| **Statistics Dashboard** | Visual analytics with charts and summaries |
| **PDF Reports** | Generate shareable reports for healthcare providers |
| **Data Export** | Export to CSV or JSON for backup or analysis |
| **Apple Health** | Sync growth measurements to HealthKit |

### User Experience

| Feature | Description |
|---------|-------------|
| **Multi-Baby Support** | Track multiple children with color-coded profiles |
| **Night Mode** | Dim red interface for nighttime feedings |
| **Daily Summaries** | Morning and evening notification digests |
| **Milk Stash** | Manage frozen/refrigerated breast milk with expiration tracking |
| **Widgets** | Home screen widgets for quick logging |
| **Siri Shortcuts** | Voice-activated quick actions |

### Localization

- English (base language)
- Hebrew (full RTL support)

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Tech Stack

| Technology | Purpose |
|------------|---------|
| SwiftUI | Declarative UI framework |
| SwiftData | Local persistent storage |
| WidgetKit | Home screen widgets |
| App Intents | Siri Shortcuts integration |
| Charts | Data visualization |
| HealthKit | Apple Health sync |
| PhotosUI | Photo picker |
| UserNotifications | Reminders and summaries |

## Project Structure

```
BabyTrack/
├── BabyTrackApp.swift           # App entry point & configuration
├── Models/                       # SwiftData models
│   ├── Baby.swift               # Baby profile with relationships
│   ├── FeedingSession.swift     # Breastfeeding records
│   ├── BottleSession.swift      # Bottle feeding records
│   ├── PumpSession.swift        # Pumping records
│   ├── SleepSession.swift       # Sleep tracking
│   ├── DiaperChange.swift       # Diaper logs
│   ├── GrowthEntry.swift        # Growth measurements
│   ├── Vaccination.swift        # Immunization records
│   ├── SolidFood.swift          # Food introduction journal
│   ├── TeethingEvent.swift      # Teething tracker
│   ├── DiaryEntry.swift         # Photo diary entries
│   ├── Medicine.swift           # Medication tracking
│   ├── MilkStash.swift          # Milk storage management
│   └── AppSettings.swift        # User preferences
├── Views/                        # SwiftUI views
│   ├── MainTabView.swift        # Tab navigation
│   ├── FeedingHubView.swift     # Feeding dashboard
│   ├── SleepView.swift          # Sleep tracking
│   ├── DiaperView.swift         # Diaper logging
│   ├── StatsView.swift          # Statistics dashboard
│   ├── MoreView.swift           # Settings & additional features
│   ├── LegalView.swift          # Terms, Privacy, Consent
│   └── ...
├── ViewModels/                   # MVVM view models
│   ├── FeedingViewModel.swift   # Feeding timer logic
│   ├── SleepViewModel.swift     # Sleep timer logic
│   └── ...
├── Utilities/                    # Helper classes
│   ├── DataExporter.swift       # CSV/JSON export
│   ├── HealthKitManager.swift   # Apple Health integration
│   ├── DailySummaryManager.swift # Notification scheduling
│   └── DateFormatters.swift     # Date formatting helpers
├── AppIntents/                   # Siri Shortcuts
└── Localizable.xcstrings         # Localization strings

BabyTrackTests/                   # Unit tests
BabyTrackUITests/                 # UI tests
BabyTrack Widget/                 # Widget extension
```

## Architecture

The app follows **MVVM (Model-View-ViewModel)** pattern:

- **Models** - SwiftData `@Model` classes with relationships
- **ViewModels** - `@Observable` classes for business logic and timers
- **Views** - Declarative SwiftUI components

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/LittleRoutine.git
   cd LittleRoutine
   ```

2. **Open in Xcode**
   ```bash
   open BabyTrack.xcodeproj
   ```

3. **Configure signing**
   - Select your development team in Signing & Capabilities
   - Update bundle identifier if needed

4. **Build and run**
   - Select target device or simulator
   - Press Cmd+R to build and run

## Configuration

Customizable settings include:

| Setting | Options |
|---------|---------|
| Volume units | oz / ml |
| Weight units | lbs / kg |
| Length units | inches / cm |
| Night mode | Manual / Scheduled / Auto |
| Daily summaries | Morning / Evening times |
| Reminders | Feeding, diaper, medicine intervals |

## Testing

```bash
# Run unit tests
xcodebuild test -scheme BabyTrack \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# Run UI tests
xcodebuild test -scheme BabyTrackUITests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Privacy & Security

LittleRoutine is built with privacy as a core principle:

| Aspect | Implementation |
|--------|----------------|
| **Data Storage** | All data stored locally on-device using SwiftData |
| **No Analytics** | Zero third-party tracking or analytics services |
| **No Cloud Upload** | Data never leaves device unless explicitly exported |
| **No Ads** | Completely ad-free experience |
| **COPPA Compliant** | Designed for parental use, not direct child interaction |
| **GDPR Ready** | Explicit consent mechanisms for EU users |

## Legal Compliance

The app includes comprehensive legal documentation:

- **Terms of Service** - Usage terms with medical disclaimer
- **Privacy Policy** - Data handling and user rights
- **First-Launch Consent** - Users must accept before using
- **GDPR Consent** - Optional consent for EU users
- **Medical Disclaimer** - Clear statement that app is not a medical device

## Before App Store Submission

### Required Steps

1. **Update Support Email**

   Edit `BabyTrack/Views/LegalView.swift` line 9:
   ```swift
   private let supportEmail = "your-real-email@yourdomain.com"
   ```

2. **Update Legal Dates**

   If you modify Terms or Privacy Policy, update the dates in `LegalView.swift`

3. **App Store Connect Privacy Labels**

   Declare in App Privacy section:
   - Data Types: None collected
   - Data Linked to You: None
   - Tracking: No

4. **Prepare Marketing Materials**
   - App icon (all sizes provided)
   - Screenshots for all device sizes
   - App description
   - Keywords

### Recommended

- [ ] Test on physical device
- [ ] Test all notification scenarios
- [ ] Verify HealthKit permissions flow
- [ ] Test photo picker permissions
- [ ] Review legal documents with a lawyer

## Adding Localization

1. Open `Localizable.xcstrings` in Xcode
2. Click "+" to add new language
3. Translate all strings
4. Test RTL layout for right-to-left languages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

All rights reserved.

## Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with SwiftUI and SwiftData for iOS 17+**
