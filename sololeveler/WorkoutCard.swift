import SwiftUI

struct WorkoutCard: View {
    @Binding var log: ExerciseLog
    @Binding var workoutLogs: [ExerciseLog]
    @Binding var expandedID: UUID?
    @State private var showDeleteConfirm = false

    var onDelete: () -> Void

    var isExpanded: Bool {
        expandedID == log.id
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(log.exerciseName)
                    .fontWeight(.bold)
                Spacer()
                Button(action: {
                    withAnimation {
                        expandedID = isExpanded ? nil : log.id
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.black)
                }
            }

            if isExpanded {
                ForEach(log.sets.indices, id: \.self) { i in
                    HStack {
                        Text("Set \(i + 1):")
                        TextField("Reps", value: $log.sets[i].reps, formatter: NumberFormatter())
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .frame(width: 50)
                        Text("x")
                        TextField("Weight", value: $log.sets[i].weight, formatter: NumberFormatter())
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .frame(width: 50)
                        Text("lbs")
                    }
                }

                HStack(spacing: 12) {
                    Button("Add") {
                        workoutLogs[getIndex()].sets.append(LoggedSet(weight: 0, reps: 0))
                    }

                    Button("Remove Last") {
                        if !workoutLogs[getIndex()].sets.isEmpty {
                            workoutLogs[getIndex()].sets.removeLast()
                        }
                    }

                    Button("Delete", role: .destructive) {
                        showDeleteConfirm = true
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(12)
        .alert("Staying Weak", isPresented: $showDeleteConfirm) {
                    Button("Im a pussy", role: .destructive) {
                        onDelete()
                    }
                    Button("Nvm", role: .cancel) {}
                }
    }

    private func getIndex() -> Int {
        workoutLogs.firstIndex(where: { $0.id == log.id }) ?? 0
    }
}
