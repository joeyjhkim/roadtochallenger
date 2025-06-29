import SwiftUI

struct WorkoutTrackerView: View {
    @State private var selectedBodyPart = "Chest"
    @State private var selectedExercise: Exercise?
    @State private var sets: [LoggedSet] = []
    let bodyParts = ["Chest", "Back", "Legs", "Shoulders", "Rest"]

    var body: some View {
        NavigationView {
            HStack {
                Spacer()
                VStack(alignment: .leading) {
                    Picker("Body Part", selection: $selectedBodyPart) {
                        ForEach(bodyParts, id: \.self) {
                            Text($0)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())

                    List(filteredExercises) { exercise in
                        Button(action: {
                            selectedExercise = exercise
                            sets = []
                        }) {
                            Text(exercise.name)
                        }
                    }
                }
                .sheet(item: $selectedExercise) { exercise in
                    ExerciseLoggingView(exercise: exercise, sets: $sets)
                }
                .navigationTitle("Level Up")
                .frame(maxWidth: 500)
                Spacer()
            }
        }
    }

    var filteredExercises: [Exercise] {
        predefinedExercises.filter { $0.bodyPart == selectedBodyPart }
    }
}

struct ExerciseLoggingView: View {
    let exercise: Exercise
    @Binding var sets: [LoggedSet]
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack {
                List {
                    ForEach(sets) { set in
                        HStack {
                            Text("Reps: \(set.reps), Weight: \(set.weight) lbs")
                        }
                    }
                    .onDelete { indexSet in
                        sets.remove(atOffsets: indexSet)
                    }

                    Button("+ Add Set") {
                        sets.append(LoggedSet(weight: 0, reps: 0))
                    }
                }

                Button("Save Workout") {
                    dismiss()
                }
                .padding()
            }
            .navigationTitle(exercise.name)
        }
    }
}
