//
//  BabyTrackWidgetsLiveActivity.swift
//  BabyTrackWidgets
//
//  Created by Amit Avigdor on 28/12/2025.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct BabyTrackWidgetsAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct BabyTrackWidgetsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BabyTrackWidgetsAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension BabyTrackWidgetsAttributes {
    fileprivate static var preview: BabyTrackWidgetsAttributes {
        BabyTrackWidgetsAttributes(name: "World")
    }
}

extension BabyTrackWidgetsAttributes.ContentState {
    fileprivate static var smiley: BabyTrackWidgetsAttributes.ContentState {
        BabyTrackWidgetsAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: BabyTrackWidgetsAttributes.ContentState {
         BabyTrackWidgetsAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: BabyTrackWidgetsAttributes.preview) {
   BabyTrackWidgetsLiveActivity()
} contentStates: {
    BabyTrackWidgetsAttributes.ContentState.smiley
    BabyTrackWidgetsAttributes.ContentState.starEyes
}
