import SwiftUI
import Foundation

// MARK: - Workout Set

struct LoggedSet: Identifiable, Codable {
    var id: UUID = UUID()
    var weight: Int
    var reps: Int
}

struct ExerciseLog: Identifiable, Codable {
    var id: UUID = UUID()
    var exerciseName: String
    var bodyPart: String
    var sets: [LoggedSet]
    var date: Date
    var isExpanded: Bool = false
}

// MARK: - Predefined Exercises

struct Exercise: Identifiable {
    let id = UUID()
    let name: String
    let bodyPart: String
}

let predefinedExercises: [Exercise] = [
    // Chest
    Exercise(name: "Bench Press", bodyPart: "Chest"),
    Exercise(name: "Incline Dumbbell Bench Press", bodyPart: "Chest"),
    Exercise(name: "Pec Dec", bodyPart: "Chest"),
    Exercise(name: "Dips", bodyPart: "Chest"),
    Exercise(name: "Single Arm Tricep Extension", bodyPart: "Chest"),
    Exercise(name: "Single Arm Overhead Tricep Extension", bodyPart: "Chest"),
    Exercise(name: "Situps", bodyPart: "Chest"),

    // Back
    Exercise(name: "Weighted Pull Ups", bodyPart: "Back"),
    Exercise(name: "Barbell Rows", bodyPart: "Back"),
    Exercise(name: "Lat Pulldowns", bodyPart: "Back"),
    Exercise(name: "Seated Wide Grip Rows", bodyPart: "Back"),
    Exercise(name: "Single Arm Rows", bodyPart: "Back"),
    Exercise(name: "Lat Pullovers", bodyPart: "Back"),
    Exercise(name: "Shrugs", bodyPart: "Back"),
    Exercise(name: "Hammer Curl", bodyPart: "Back"),
    Exercise(name: "Bicep Curl", bodyPart: "Back"),

    // Legs
    Exercise(name: "Squats", bodyPart: "Legs"),
    Exercise(name: "Romanian Deadlift", bodyPart: "Legs"),
    Exercise(name: "Leg Extension", bodyPart: "Legs"),
    Exercise(name: "Leg Curl", bodyPart: "Legs"),
    Exercise(name: "Calf Raises", bodyPart: "Legs"),

    // Shoulders
    Exercise(name: "Standing Overhead Barbell Press", bodyPart: "Shoulders"),
    Exercise(name: "Seated Dumbbell Shoulder Press", bodyPart: "Shoulders"),
    Exercise(name: "Lat Raises", bodyPart: "Shoulders"),
    Exercise(name: "Lu Raises", bodyPart: "Shoulders"),
    Exercise(name: "Single Arm Rear Delt Cable Fly", bodyPart: "Shoulders"),
    Exercise(name: "Single Arm Tricep Extension", bodyPart: "Shoulders"),
    Exercise(name: "Single Arm Overhead Tricep Extension", bodyPart: "Shoulders"),
    Exercise(name: "Bicep Curl", bodyPart: "Shoulders"),
    Exercise(name: "Hammer Curl", bodyPart: "Shoulders"),
    Exercise(name: "Situps", bodyPart: "Shoulders"),

    // Rest
    Exercise(name: "Swimming", bodyPart: "Rest"),
    Exercise(name: "Running", bodyPart: "Rest"),
    Exercise(name: "Walking", bodyPart: "Rest"),
]

// MARK: - Goal Structures

struct Goal: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var dueDate: Date
    var progress: Double
    var priority: Int
    var category: String
}

struct CompletedGoal: Identifiable, Codable {
    let id: UUID
    let goal: Goal
    let completedDate: Date

    init(goal: Goal) {
        self.id = goal.id
        self.goal = goal
        self.completedDate = Date()
    }
}
