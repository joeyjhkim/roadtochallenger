import SwiftUI

public struct GoalCard: View {
    let goal: Goal
    let index: Int
    @Binding var goals: [Goal]
    @Binding var completedGoals: [CompletedGoal]
    @Binding var archivedGoals: [CompletedGoal]
    @Binding var goalToDelete: Goal?
    @Binding var showDeleteConfirmation: Bool

    @State private var isHoveringExpand = false
    @State private var isExpanded = false
    @State private var editedTitle: String
    @State private var editedDate: Date

    init(goal: Goal, index: Int,
         goals: Binding<[Goal]>,
         completedGoals: Binding<[CompletedGoal]>,
         archivedGoals: Binding<[CompletedGoal]>,
         goalToDelete: Binding<Goal?>,
         showDeleteConfirmation: Binding<Bool>) {
        self.goal = goal
        self.index = index
        self._goals = goals
        self._completedGoals = completedGoals
        self._archivedGoals = archivedGoals
        self._goalToDelete = goalToDelete
        self._showDeleteConfirmation = showDeleteConfirmation
        _editedTitle = State(initialValue: goal.title)
        _editedDate = State(initialValue: goal.dueDate)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.title)
                        .font(.headline)
                    Text("Due: \(GoalManager.formattedDate(goal.dueDate))")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                ZStack {
                    GeometryReader { geometry in
                        Capsule()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 18)
                        
                        Capsule()
                            .fill(Color.blue)
                            .frame(width: geometry.size.width * CGFloat(goal.progress), height: 18)
                        
                        Text("\(Int(goal.progress * 100))%")
                            .font(.caption2)
                            .bold()
                            .foregroundColor(.white)
                            .frame(width: geometry.size.width, height: 18)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(width: 120, height: 18)
                
                Button(action: {
                    withAnimation {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.blue)
                        .padding(6)
                        .background(isHoveringExpand ? Color.gray.opacity(0.2) : Color.clear)
                        .cornerRadius(6)
                }
                .buttonStyle(BorderlessButtonStyle())
                .onHover { hovering in
                    isHoveringExpand = hovering
                }
            }

            if isExpanded {
                TextField("Goal Title", text: Binding(
                    get: { editedTitle },
                    set: { newValue in
                        editedTitle = newValue
                        if let i = goals.firstIndex(where: { $0.id == goal.id }) {
                            goals[i].title = newValue
                        }
                    }
                ))
                .textFieldStyle(RoundedBorderTextFieldStyle())

                DatePicker("Desired Date", selection: Binding(
                    get: { editedDate },
                    set: { newDate in
                        editedDate = newDate
                        GoalManager.updateDate(for: goal.id, newDate: newDate, in: &goals)
                    }
                ), displayedComponents: .date)

                HStack {
                    Text("Progress:")
                    Slider(value: Binding(get: {
                        goal.progress
                    }, set: { newValue in
                        GoalManager.updateProgress(for: goal.id, newProgress: newValue, in: &goals)
                    }), in: 0...1)
                    Text("\(Int(goal.progress * 100))%")
                        .frame(width: 40, alignment: .trailing)
                }

                Text("Priority: \(goal.priority)")

                HStack {
                    Button("↑") {
                        GoalManager.moveGoalUp(goal, in: &goals)
                        GoalManager.save(goals: goals, completedGoals: completedGoals)
                    }
                    Button("↓") {
                        GoalManager.moveGoalDown(goal, in: &goals)
                        GoalManager.save(goals: goals, completedGoals: completedGoals)
                    }

                    Spacer()

                    Button("Complete") {
                        let completed = CompletedGoal(goal: goals.remove(at: index))
                        completedGoals.append(completed)
                        archivedGoals.append(completed)  // Update in memory
                        GoalManager.save(goals: goals, completedGoals: completedGoals)
                        GoalManager.saveArchive(archivedGoals: archivedGoals)
                    }
                    .foregroundColor(.green)


                    Button("Delete") {
                        goalToDelete = goal
                        showDeleteConfirmation = true
                    }
                    .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(red: 178/255, green: 181/255, blue: 190/255))
        .cornerRadius(8)
        .padding(.bottom, 10)
    }
}
