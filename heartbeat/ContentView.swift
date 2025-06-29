//
//  ContentView.swift
//  Solo Leveler
//
//  Created by Joey Kim on 6/7/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            WorkoutTrackerView()
                .tabItem{
                    Label("Workouts", systemImage: "flame.fill")
                }
            TaskSchedulerView()
                .tabItem{
                    Label("Schedule", systemImage: "calendar")
                }
            GoalsSetterView()
                .tabItem {
                    Label("Goals", systemImage: "star.fill")
                }
                
            
        }
    }
}
    

#Preview {
    ContentView()
}
