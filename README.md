# 👶 LittleRoutine

**LittleRoutine** is a modern iOS app for tracking your baby’s daily routines, health, and developmental progress — designed to be fast, intuitive, and parent-friendly, day and night.

Built with **SwiftUI** and **SwiftData**, the app focuses on clarity, reliability, and thoughtful UX for new parents.

---

## ✨ Features

### 🍼 Core Tracking

* **Feeding**

  * Breastfeeding with timer and left/right side tracking
  * Bottle feeding with volume logging (breast milk, formula, or mixed)
  * Pumping sessions with duration, volume, and side tracking
* **Sleep**

  * Nap and night-sleep tracking with duration calculation
* **Diapers**

  * Wet, dirty, or mixed diaper logs with timestamps and notes

---

### 🩺 Health & Growth

* **Growth Tracking** – Weight, height, and head circumference
* **Medicines & Vitamins** – Dosing schedules and reminders
* **Pediatrician Notes** – Track concerns and resolutions for doctor visits
* **Milestones** – Developmental milestones across:

  * Motor
  * Cognitive
  * Social
  * Language
  * Feeding

---

### 🚀 Advanced Features

* **Milk Stash Management** – Pumped milk storage with automatic expiration tracking
* **Statistics Dashboard**

  * Daily timeline
  * Feeding balance charts
  * Summary insights
* **PDF Export** – Share or archive your baby’s data
* **Night Mode** – Warm, eye-friendly dark theme
* **Multi-Baby Support** – Color-coded profiles for multiple children
* **Widgets** – Quick access from the Home Screen
* **Siri Shortcuts** – Log activities hands-free using the Shortcuts app

---

## 📱 Requirements

* **iOS** 17.0+
* **Xcode** 15.0+
* **Swift** 5.9+

---

## 🛠 Tech Stack

* **SwiftUI** – Declarative UI
* **SwiftData** – Local persistence
* **WidgetKit** – Home screen widgets
* **App Intents** – Siri & Shortcuts integration
* **Charts** – Data visualization
* **UserNotifications** – Reminders and alerts

---

## 🗂 Project Structure

```text
LittleRoutine/
├── Models/              # SwiftData models
├── ViewModels/          # MVVM business logic
├── Views/               # SwiftUI views
├── Utilities/           # Helpers & formatters
├── AppIntents/          # Siri shortcuts
└── Assets/              # Images, colors, icons

LittleRoutine Widget/        # Widget extension
LittleRoutineWidgets/        # Additional widgets
```

---

## 🧱 Architecture

The app follows the **MVVM (Model–View–ViewModel)** architecture:

* **Models**
  SwiftData `@Model` objects with relationships and computed properties

* **ViewModels**
  `@Observable` classes handling business logic, timers, and state

* **Views**
  Stateless SwiftUI views driven by reactive data

---

## 🚀 Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/AmitAvigdor/LittleRoutine.git
   ```
2. Open `LittleRoutine.xcodeproj` in Xcode
3. Select your development team under **Signing & Capabilities**
4. Build and run on a simulator or physical device

---

## ⚙️ Configuration

The app supports user-customizable preferences:

* Volume units (oz / ml)
* Weight units (lbs / kg)
* Length units (in / cm)
* Reminder intervals for:

  * Feeding
  * Diapers
  * Medicine

---

## 📄 License

**All rights reserved.**
This project is currently not licensed for redistribution or commercial use.

---
