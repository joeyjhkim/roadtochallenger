import SwiftUI

struct GoalsSetterView: View {
    // MARK: – Core data
    @State private var goals: [Goal] = []
    @State private var completedGoals: [CompletedGoal] = []
    @State private var archivedGoals: [CompletedGoal] = []

    // MARK: – “Add Goal” form state
    @State private var newGoalTitle = ""
    @State private var newDesiredDate = Date()
    @State private var newCategory = "Finances"
    @State private var customCategory = ""
    @State private var categories: [String] = ["Finances", "Personal", "Work"]

    // MARK: – Delete / Complete toggles
    @State private var showCompleted = false
    @State private var goalToDelete: Goal?
    @State private var showDeleteConfirmation = false

    // MARK: – Reset progress toggles
    @State private var categoryToReset: String?
    @State private var showResetFirstConfirm = false
    @State private var showResetSecondConfirm = false

    var body: some View {
        HStack(spacing: 0) {
            // 11 bindings + two alerts exactly:
            AddGoalPanel(
                newGoalTitle:            $newGoalTitle,
                newDesiredDate:          $newDesiredDate,
                newCategory:             $newCategory,
                customCategory:          $customCategory,
                categories:              $categories,
                goals:                   $goals,
                completedGoals:          $completedGoals,
                archivedGoals:           $archivedGoals,
                categoryToReset:         $categoryToReset,
                showResetFirstConfirm:   $showResetFirstConfirm,
                showResetSecondConfirm:  $showResetSecondConfirm
            )

            Divider()

            GoalListPanel(
                showCompleted:        $showCompleted,
                categories:           $categories,
                goals:                $goals,
                completedGoals:       $completedGoals,
                archivedGoals:        $archivedGoals,
                goalToDelete:         $goalToDelete,
                showDeleteConfirmation: $showDeleteConfirmation
            )
        }
        .onAppear {
            // load all three arrays
            goals          = GoalManager.loadGoals()
            completedGoals = GoalManager.loadCompletedGoals()
            archivedGoals  = GoalManager.loadArchivedGoals()
        }
        .alert(isPresented: $showDeleteConfirmation) {
            Alert(
                title:   Text("Delete Goal"),
                message: Text("Are you sure you want to delete this goal?"),
                primaryButton: .destructive(Text("Delete")) {
                    if let goal = goalToDelete,
                       let idx  = goals.firstIndex(where: { $0.id == goal.id }) {
                        goals.remove(at: idx)
                        GoalManager.save(goals: goals, completedGoals: completedGoals)
                    }
                    goalToDelete = nil
                },
                secondaryButton: .cancel {
                    goalToDelete = nil
                }
            )
        }
    }
}
