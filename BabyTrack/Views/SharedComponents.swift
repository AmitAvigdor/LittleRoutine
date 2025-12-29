import SwiftUI

// MARK: - Animated Save Button (for Form Sections)

struct AnimatedSaveButton: View {
    let title: String
    let action: () -> Void

    @State private var showingCheckmark = false
    @State private var buttonScale: CGFloat = 1.0

    init(_ title: String = "Save", action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    var body: some View {
        Button {
            // Perform the save action
            action()

            // Trigger animation
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                showingCheckmark = true
                buttonScale = 1.1
            }

            // Scale back down
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                    buttonScale = 1.0
                }
            }

            // Hide checkmark after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeOut(duration: 0.3)) {
                    showingCheckmark = false
                }
            }
        } label: {
            HStack(spacing: 8) {
                if showingCheckmark {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .transition(.scale.combined(with: .opacity))
                }

                Text(showingCheckmark ? "Saved!" : title)
                    .contentTransition(.numericText())
            }
            .frame(maxWidth: .infinity)
            .scaleEffect(buttonScale)
        }
        .disabled(showingCheckmark)
        .sensoryFeedback(.success, trigger: showingCheckmark)
    }
}

// MARK: - Animated Save Button for Toolbars (dismisses after animation)

struct ToolbarSaveButton: View {
    let title: String
    let isDisabled: Bool
    let action: () -> Void
    let onComplete: () -> Void

    @State private var isSaving = false
    @State private var showCheckmark = false

    init(
        _ title: String = "Save",
        isDisabled: Bool = false,
        action: @escaping () -> Void,
        onComplete: @escaping () -> Void
    ) {
        self.title = title
        self.isDisabled = isDisabled
        self.action = action
        self.onComplete = onComplete
    }

    var body: some View {
        Button {
            isSaving = true

            // Perform save action
            action()

            // Show checkmark
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                showCheckmark = true
            }

            // Dismiss after brief delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                onComplete()
            }
        } label: {
            HStack(spacing: 4) {
                if showCheckmark {
                    Image(systemName: "checkmark")
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    Text(title)
                }
            }
        }
        .disabled(isDisabled || isSaving)
        .sensoryFeedback(.success, trigger: showCheckmark)
    }
}

// MARK: - Preview

#Preview {
    Form {
        Section {
            AnimatedSaveButton("Save Settings") {
                print("Saved!")
            }
        }
    }
}
