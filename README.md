# 👶 LittleRoutine

**LittleRoutine** is a thoughtfully designed iOS app for parents and caregivers to track a baby’s daily routines, health, and developmental milestones — with a strong focus on privacy, clarity, and ease of use, day and night.

Built using **SwiftUI** and **SwiftData**, the app provides a fully offline, ad-free experience tailored for modern families.

---

![iOS 17.0+](https://img.shields.io/badge/iOS-17.0+-blue.svg)
![Swift 5.9+](https://img.shields.io/badge/Swift-5.9+-orange.svg)
![SwiftUI](https://img.shields.io/badge/SwiftUI-blue.svg)
![SwiftData](https://img.shields.io/badge/SwiftData-green.svg)

---

## ✨ Features

### 🍼 Core Tracking

| Feature            | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| **Breastfeeding**  | Timer-based tracking with left/right side monitoring and session history |
| **Bottle Feeding** | Log volume (oz / ml) and milk type (breast milk, formula, mixed)         |
| **Pumping**        | Track duration, volume, and side with automatic milk-stash integration   |
| **Sleep**          | Monitor naps and nighttime sleep with duration calculations              |
| **Diapers**        | Log wet, dirty, and mixed diaper changes with notes                      |
| **Growth**         | Track weight, height, and head circumference with visual charts          |

---

### 🩺 Health & Development

| Feature                 | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| **Vaccination Tracker** | Schedule immunizations, receive reminders, and track completion      |
| **Solid Food Journal**  | Log food introductions, reactions, and preferences                   |
| **Teething Tracker**    | Interactive tooth chart with symptom tracking                        |
| **Milestones**          | Track progress across motor, cognitive, social, and language domains |
| **Medicine & Vitamins** | Medication schedules with dosage reminders                           |
| **Pediatrician Notes**  | Store questions, concerns, and visit summaries                       |

---

### 📊 Memories & Export

| Feature                  | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| **Photo Diary**          | Capture memories with photos, notes, and mood tracking |
| **Statistics Dashboard** | Daily timelines, charts, and summarized insights       |
| **PDF Reports**          | Generate shareable reports for healthcare providers    |
| **Data Export**          | Export data as CSV or JSON for backup or analysis      |
| **Apple Health Sync**    | Sync growth measurements via HealthKit                 |

---

### 🌙 User Experience

| Feature                   | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| **Multi-Baby Support**    | Manage multiple children with color-coded profiles       |
| **Night Mode**            | Eye-friendly dim red interface for nighttime use         |
| **Daily Summaries**       | Morning and evening notification digests                 |
| **Milk Stash Management** | Track frozen and refrigerated milk with expiration logic |
| **Widgets**               | Home screen widgets for quick logging                    |
| **Siri Shortcuts**        | Voice-activated quick actions via Shortcuts              |

---

### 🌍 Localization

* English (base language)
* Hebrew (full RTL support)

---

## 📱 Requirements

* **iOS** 17.0+
* **Xcode** 15.0+
* **Swift** 5.9+

---

## 🛠 Tech Stack

| Technology            | Purpose                       |
| --------------------- | ----------------------------- |
| **SwiftUI**           | Declarative UI framework      |
| **SwiftData**         | On-device persistent storage  |
| **WidgetKit**         | Home screen widgets           |
| **App Intents**       | Siri Shortcuts integration    |
| **Charts**            | Data visualization            |
| **HealthKit**         | Apple Health synchronization  |
| **PhotosUI**          | Photo picker integration      |
| **UserNotifications** | Reminders and daily summaries |

---

## 🗂 Project Structure

```text
BabyTrack/
├── BabyTrackApp.swift          # App entry point
├── Models/                     # SwiftData models
├── Views/                      # SwiftUI views
├── ViewModels/                 # MVVM business logic
├── Utilities/                  # Helpers & managers
├── AppIntents/                 # Siri Shortcuts
└── Localizable.xcstrings       # Localization

BabyTrackTests/                 # Unit tests
BabyTrackUITests/               # UI tests
BabyTrack Widget/               # Widget extension
```

---

## 🧱 Architecture

LittleRoutine follows the **MVVM (Model–View–ViewModel)** architecture:

* **Models** — SwiftData `@Model` entities with relationships
* **ViewModels** — `@Observable` classes handling state, logic, and timers
* **Views** — Stateless SwiftUI components driven by reactive data

---

## 🚀 Getting Started

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

   * Select your development team under *Signing & Capabilities*
   * Update the bundle identifier if needed

4. **Build and run**

   * Choose a simulator or physical device
   * Press **Cmd + R**

---

## ⚙️ Configuration

Customizable user preferences include:

| Setting         | Options                             |
| --------------- | ----------------------------------- |
| Volume units    | oz / ml                             |
| Weight units    | lbs / kg                            |
| Length units    | inches / cm                         |
| Night mode      | Manual / Scheduled / Automatic      |
| Daily summaries | Morning / Evening                   |
| Reminders       | Feeding, diaper, medicine intervals |

---

## 🧪 Testing

```bash
# Unit tests
xcodebuild test -scheme BabyTrack \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# UI tests
xcodebuild test -scheme BabyTrackUITests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

## 🔒 Privacy & Security

Privacy is a core design principle:

| Aspect           | Implementation              |
| ---------------- | --------------------------- |
| **Data Storage** | Fully local, on-device only |
| **Analytics**    | None                        |
| **Cloud Sync**   | None                        |
| **Advertising**  | None                        |
| **COPPA**        | Designed for parental use   |
| **GDPR**         | Explicit consent mechanisms |

---

## ⚖️ Legal Compliance

* Terms of Service (medical disclaimer included)
* Privacy Policy
* First-launch consent flow
* GDPR consent for EU users
* Clear non-medical device disclaimer

---

## 📦 Before App Store Submission

### Required

1. **Update support email**

   ```swift
   private let supportEmail = "your-real-email@yourdomain.com"
   ```

2. **Update legal document dates** if modified

3. **App Store privacy labels**

   * Data Collected: None
   * Data Linked to User: None
   * Tracking: No

4. **Prepare marketing assets**

   * App icon
   * Screenshots
   * Description & keywords

### Recommended

* Test on physical devices
* Verify notification flows
* Validate HealthKit permissions
* Test photo access permissions
* Legal review (recommended)

---

## 🌍 Adding Localization

1. Open `Localizable.xcstrings`
2. Add a new language
3. Translate all strings
4. Verify RTL layout (if applicable)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

**All rights reserved.**

---

## 💬 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with SwiftUI & SwiftData for iOS 17+**

---
