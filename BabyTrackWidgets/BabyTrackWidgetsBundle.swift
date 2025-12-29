//
//  BabyTrackWidgetsBundle.swift
//  BabyTrackWidgets
//
//  Created by Amit Avigdor on 28/12/2025.
//

import WidgetKit
import SwiftUI

@main
struct BabyTrackWidgetsBundle: WidgetBundle {
    var body: some Widget {
        BabyTrackWidgets()
        BabyTrackWidgetsControl()
        BabyTrackWidgetsLiveActivity()
    }
}
