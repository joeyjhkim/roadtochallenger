import SwiftUI
import Foundation

struct GoalManager {

    static func insertGoal(_ newGoal: Goal, into goals: inout [Goal]) {
        let category = newGoal.category
        let index = max(0, min(newGoal.priority - 1, goals.filter { $0.category == category }.count))

        let insertIndex = goals.firstIndex(where: {
            $0.category == category && (goals.filter { $0.category == category }.firstIndex(of: $0) ?? 0) >= index
        }) ?? goals.count

        goals.insert(newGoal, at: insertIndex)
        reassignPriorities(in: &goals, for: category)
    }

    static func updateProgress(for id: UUID, newProgress: Double, in goals: inout [Goal]) {
        if let i = goals.firstIndex(where: { $0.id == id }) {
            goals[i].progress = newProgress
        }
    }

    static func updateDate(for id: UUID, newDate: Date, in goals: inout [Goal]) {
        if let i = goals.firstIndex(where: { $0.id == id }) {
            goals[i].dueDate = newDate
        }
    }

    static func formattedDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd/yyyy h:mm a"
        return formatter.string(from: date)
    }

    static func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd/yyyy"
        return formatter.string(from: date)
    }

    static func save(goals: [Goal], completedGoals: [CompletedGoal]) {
        if let encoded = try? JSONEncoder().encode(goals) {
            UserDefaults.standard.set(encoded, forKey: "SavedGoals")
        }
        if let encodedCompleted = try? JSONEncoder().encode(completedGoals) {
            UserDefaults.standard.set(encodedCompleted, forKey: "CompletedGoals")
        }
    }

    static func saveArchive(archivedGoals: [CompletedGoal]) {
        if let encoded = try? JSONEncoder().encode(archivedGoals) {
            UserDefaults.standard.set(encoded, forKey: "ArchivedCompletedGoals")
        }
    }

    static func loadGoals() -> [Goal] {
        if let data = UserDefaults.standard.data(forKey: "SavedGoals"),
           let decoded = try? JSONDecoder().decode([Goal].self, from: data) {
            return decoded
        }
        return []
    }

    static func loadCompletedGoals() -> [CompletedGoal] {
        if let data = UserDefaults.standard.data(forKey: "CompletedGoals"),
           let decoded = try? JSONDecoder().decode([CompletedGoal].self, from: data) {
            return decoded
        }
        return []
    }

    static func loadArchivedGoals() -> [CompletedGoal] {
        if let data = UserDefaults.standard.data(forKey: "ArchivedCompletedGoals"),
           let decoded = try? JSONDecoder().decode([CompletedGoal].self, from: data) {
            return decoded
        }
        return []
    }

    static func moveGoalUp(_ goal: Goal, in goals: inout [Goal]) {
        guard let index = goals.firstIndex(where: { $0.id == goal.id }) else { return }
        let category = goal.category
        let categoryGoals = goals.enumerated().filter { $0.element.category == category }
        guard let localIndex = categoryGoals.firstIndex(where: { $0.element.id == goal.id }), localIndex > 0 else { return }

        let currentGlobalIndex = categoryGoals[localIndex].offset
        let targetGlobalIndex = categoryGoals[localIndex - 1].offset

        goals.swapAt(currentGlobalIndex, targetGlobalIndex)
        reassignPriorities(in: &goals, for: category)
    }

    static func moveGoalDown(_ goal: Goal, in goals: inout [Goal]) {
        guard let index = goals.firstIndex(where: { $0.id == goal.id }) else { return }
        let category = goal.category
        let categoryGoals = goals.enumerated().filter { $0.element.category == category }
        guard let localIndex = categoryGoals.firstIndex(where: { $0.element.id == goal.id }),
              localIndex < categoryGoals.count - 1 else { return }

        let currentGlobalIndex = categoryGoals[localIndex].offset
        let targetGlobalIndex = categoryGoals[localIndex + 1].offset

        goals.swapAt(currentGlobalIndex, targetGlobalIndex)
        reassignPriorities(in: &goals, for: category)
    }

    static func reassignPriorities(in goals: inout [Goal], for category: String) {
        let sortedIndices = goals.indices.filter { goals[$0].category == category }
        for (rank, idx) in sortedIndices.enumerated() {
            goals[idx].priority = rank + 1
        }
    }

    static let ranks = [
        "Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald",
        "Diamond", "Master", "Grandmaster", "Challenger"
    ]

    static func rank(forCategory category: String, completedGoals: [CompletedGoal]) -> String {
        let count = completedGoals.filter { $0.goal.category == category }.count

        if count < ranks.count * 10 {
            return ranks[count / 10]
        } else {
            let tier = ((count - (ranks.count * 10)) / 10) + 1
            return "Challenger \(tier)"
        }
    }

    static func highestRank(for completedGoals: [CompletedGoal]) -> String {
        let count = completedGoals.count
        let tier = min(count / 10, ranks.count - 1)

        if ranks[tier] == "Challenger" {
            let subrank = (count - 100) / 10 + 1
            return "Challenger \(subrank)"
        } else {
            return ranks[tier]
        }
    }
    
    static func resetCategory(_ category: String, archivedGoals: inout [CompletedGoal]) {
        archivedGoals.removeAll { $0.goal.category == category }
        saveArchive(archivedGoals: archivedGoals)
    }

}
