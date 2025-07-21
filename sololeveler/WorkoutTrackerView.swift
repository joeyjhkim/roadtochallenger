import SwiftUI

struct WorkoutTrackerView: View {
    @State private var selectedBodyPart = "Chest"
    @State private var workoutLogsByPart: [String: [ExerciseLog]] = [:]
    @State private var expandedWorkoutID: UUID? = nil

    let bodyParts = ["Chest", "Back", "Legs", "Shoulders", "Rest"]

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                leftPanel(width: geometry.size.width / 2)
                Divider()
                rightPanel(width: geometry.size.width / 2)
            }
            .navigationTitle("Level Up")
            .onAppear {
                loadWorkoutLogs()
            }
        }
    }

    // MARK: - Left Panel
    private func leftPanel(width: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("", selection: $selectedBodyPart) {
                ForEach(bodyParts, id: \.self) { part in
                    Text(part)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal)

            ScrollView {
                VStack(spacing: 6) {
                    ForEach(filteredExercises) { exercise in
                        let alreadyExists = workoutLogsByPart[selectedBodyPart]?.contains(where: { $0.exerciseName == exercise.name }) ?? false

                        Button(action: {
                            addExercise(exercise)
                        }) {
                            Text(exercise.name)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 6)
                                .padding(.horizontal)
                                .background(alreadyExists ? Color.gray.opacity(0.3) : Color.white)
                                .foregroundColor(alreadyExists ? .gray : .black)
                                .cornerRadius(10)
                        }
                        .disabled(alreadyExists)
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal)
            }
        }
        .frame(width: width)
        .padding(.vertical, 12)
    }

    // MARK: - Right Panel
    private func rightPanel(width: CGFloat) -> some View {
        VStack {
            VStack(spacing: 8) {
                HStack {
                    Spacer()
                    Text("\(selectedBodyPart) Day")
                        .font(.title2)
                        .bold()
                    Spacer()
                }
                .padding(.top, 12)

                ScrollView {
                    VStack(spacing: 8) {
                        let logs = workoutLogsByPart[selectedBodyPart] ?? []
                        ForEach(Array(logs.enumerated()), id: \.element.id) { index, log in
                            let binding = Binding(
                                get: { workoutLogsByPart[selectedBodyPart]?[index] ?? log },
                                set: {
                                    workoutLogsByPart[selectedBodyPart]?[index] = $0
                                    saveWorkoutLogs()
                                }
                            )

                            WorkoutCard(
                                log: binding,
                                workoutLogs: Binding(
                                    get: { workoutLogsByPart[selectedBodyPart] ?? [] },
                                    set: {
                                        workoutLogsByPart[selectedBodyPart] = $0
                                        saveWorkoutLogs()
                                    }
                                ),
                                expandedID: $expandedWorkoutID,
                                onDelete: {
                                    workoutLogsByPart[selectedBodyPart]?.remove(at: index)
                                    saveWorkoutLogs()
                                }
                            )
                        }
                    }
                    .padding(.top, 4)
                    .padding(.horizontal)
                }
            }
            Spacer()
        }
        .frame(width: width)
    }

    // MARK: - Helpers
    var filteredExercises: [Exercise] {
        predefinedExercises
            .filter { $0.bodyPart == selectedBodyPart }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private func addExercise(_ exercise: Exercise) {
        let logs = workoutLogsByPart[selectedBodyPart] ?? []
        let alreadyExists = logs.contains { $0.exerciseName == exercise.name }
        guard !alreadyExists else { return }

        let newLog = ExerciseLog(
            exerciseName: exercise.name,
            bodyPart: exercise.bodyPart,
            sets: Array(repeating: LoggedSet(weight: 0, reps: 0), count: 5),
            date: Date()
        )

        workoutLogsByPart[selectedBodyPart, default: []].append(newLog)
        saveWorkoutLogs()
    }

    // MARK: - Persistence
    private func saveWorkoutLogs() {
        if let encoded = try? JSONEncoder().encode(workoutLogsByPart) {
            UserDefaults.standard.set(encoded, forKey: "WorkoutLogsByPart")
        }
    }

    private func loadWorkoutLogs() {
        if let data = UserDefaults.standard.data(forKey: "WorkoutLogsByPart"),
           let decoded = try? JSONDecoder().decode([String: [ExerciseLog]].self, from: data) {
            workoutLogsByPart = decoded
        }
    }
}
