//
//  BabyTrack_WidgetBundle.swift
//  BabyTrack Widget
//
//  Created by Amit Avigdor on 28/12/2025.
//

import WidgetKit
import SwiftUI

@main
struct BabyTrack_WidgetBundle: WidgetBundle {
    var body: some Widget {
        BabyTrack_Widget()
        BabyTrack_WidgetControl()
        BabyTrack_WidgetLiveActivity()
    }
}
