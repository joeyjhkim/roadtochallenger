//
//  ContentView.swift
//  Solo Leveler
//
//  Created by Joey Kim on 6/7/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        ZStack {
            //background
            Color(red: 194 / 255, green: 186 / 255, blue: 174/255).ignoresSafeArea()
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
}
    

#Preview {
    ContentView()
}
