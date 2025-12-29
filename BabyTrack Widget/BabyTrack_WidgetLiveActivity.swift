//
//  BabyTrack_WidgetLiveActivity.swift
//  BabyTrack Widget
//
//  Created by Amit Avigdor on 28/12/2025.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct BabyTrack_WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct BabyTrack_WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BabyTrack_WidgetAttributes.self) { context in
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

extension BabyTrack_WidgetAttributes {
    fileprivate static var preview: BabyTrack_WidgetAttributes {
        BabyTrack_WidgetAttributes(name: "World")
    }
}

extension BabyTrack_WidgetAttributes.ContentState {
    fileprivate static var smiley: BabyTrack_WidgetAttributes.ContentState {
        BabyTrack_WidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: BabyTrack_WidgetAttributes.ContentState {
         BabyTrack_WidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: BabyTrack_WidgetAttributes.preview) {
   BabyTrack_WidgetLiveActivity()
} contentStates: {
    BabyTrack_WidgetAttributes.ContentState.smiley
    BabyTrack_WidgetAttributes.ContentState.starEyes
}
