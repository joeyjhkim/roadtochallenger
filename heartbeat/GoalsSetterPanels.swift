import SwiftUI

extension GoalsSetterView {

    @ViewBuilder
       func AddGoalPanel(
           newGoalTitle: Binding<String>,
           newDesiredDate: Binding<Date>,
           newCategory: Binding<String>,
           customCategory: Binding<String>,
           categories: Binding<[String]>,
           goals: Binding<[Goal]>,
           completedGoals: Binding<[CompletedGoal]>,
           archivedGoals: Binding<[CompletedGoal]>,
           categoryToReset: Binding<String?>,
           showResetFirstConfirm: Binding<Bool>,
           showResetSecondConfirm: Binding<Bool>
       ) -> some View {

           VStack(alignment: .leading) {
               // MARK: – Add New Goal
               Text("Add New Goal")
                   .font(.title2).bold()
                   .padding(.bottom, 8)

               TextField("Enter goal", text: newGoalTitle)
                   .textFieldStyle(RoundedBorderTextFieldStyle())

               DatePicker("", selection: newDesiredDate, displayedComponents: .date)
                   .labelsHidden()

               Picker("Select Category", selection: newCategory) {
                   ForEach(categories.wrappedValue, id: \.self) { category in
                       Text(category).tag(category)
                   }
                   Text("Custom...").tag("Custom")
               }
               .pickerStyle(MenuPickerStyle())

               if newCategory.wrappedValue == "Custom" {
                   TextField("Enter new category", text: customCategory)
                       .textFieldStyle(RoundedBorderTextFieldStyle())
               }

               Button("Add Goal") {
                   let finalCat = newCategory.wrappedValue == "Custom"
                       ? customCategory.wrappedValue
                       : newCategory.wrappedValue

                   if newCategory.wrappedValue == "Custom",
                      !customCategory.wrappedValue.isEmpty,
                      !categories.wrappedValue.contains(customCategory.wrappedValue) {
                       categories.wrappedValue.append(customCategory.wrappedValue)
                   }

                   let priority = goals.wrappedValue
                       .filter { $0.category == finalCat }
                       .count + 1

                   let newGoal = Goal(
                       id: UUID(),
                       title: newGoalTitle.wrappedValue,
                       dueDate: newDesiredDate.wrappedValue,
                       progress: 0.0,
                       priority: priority,
                       category: finalCat
                   )
                   GoalManager.insertGoal(newGoal, into: &goals.wrappedValue)
                   newGoalTitle.wrappedValue = ""
                   newDesiredDate.wrappedValue = Date()
                   newCategory.wrappedValue = "Finances"
                   customCategory.wrappedValue = ""
                   GoalManager.save(goals: goals.wrappedValue, completedGoals: completedGoals.wrappedValue)
               }
               .disabled(newGoalTitle.wrappedValue.isEmpty)
               .padding(.vertical, 8)

               Divider().padding(.vertical, 8)

               // MARK: – Your Ranks
               Text("Your Ranks")
                   .font(.headline)

               ForEach(categories.wrappedValue, id: \.self) { category in
                   // Count how many completed goals are in this category:
                   let count = completedGoals.wrappedValue
                       .filter { $0.goal.category == category }
                       .count
                   let rank = GoalManager.rank(forCategory: category, completedGoals: completedGoals.wrappedValue)
                   let progressToNext = Double(count % 10) / 10.0

                   // Wrapping in a VStack with `.id(count)` forces SwiftUI
                   // to re-create this block every time `count` changes:
                   VStack(alignment: .leading, spacing: 4) {
                       HStack {
                           SparkleBadge(rank: rank)
                           Text(category).bold()
                           Spacer()
                           Text(rank).foregroundColor(.gray)
                           Button {
                               categoryToReset.wrappedValue = category
                               showResetFirstConfirm.wrappedValue = true
                           } label: {
                               Image(systemName: "arrow.counterclockwise")
                                   .padding(6)
                                   .background(RoundedRectangle(cornerRadius: 4)
                                       .fill(Color.red.opacity(0.2)))
                           }
                           .buttonStyle(PlainButtonStyle())
                       }

                       ZStack(alignment: .leading) {
                           RoundedRectangle(cornerRadius: 8)
                               .fill(Color.gray.opacity(0.3))
                               .frame(height: 14)

                           // Use the GeometryReader trick so the bar is responsive:
                           GeometryReader { geo in
                               RoundedRectangle(cornerRadius: 8)
                                   .fill(Color.blue)
                                   .frame(width: geo.size.width * CGFloat(progressToNext), height: 14)
                           }
                           .frame(height: 14)

                           Text("\(count % 10)/10")
                               .font(.caption)
                               .foregroundColor(.white)
                               .frame(maxWidth: .infinity, alignment: .center)
                               .frame(height: 14)
                       }
                   }
                   .padding(.bottom, 8)
                   .id(count) // ← **critical**: re-invokes this view when count changes
               }

               Spacer()
           }
           .padding()
           .background(Color.gray.opacity(0.1))
           .cornerRadius(8)

           // First confirmation
           .alert(isPresented: showResetFirstConfirm) {
               Alert(
                   title: Text("Reset Progress for \(categoryToReset.wrappedValue ?? "")?"),
                   message: Text("This will clear your rank progress for this category."),
                   primaryButton: .destructive(Text("Yes")) {
                       showResetSecondConfirm.wrappedValue = true
                   },
                   secondaryButton: .cancel()
               )
           }
           // Final confirmation & actually reset
           .alert(isPresented: showResetSecondConfirm) {
               Alert(
                   title: Text("Confirm Reset"),
                   message: Text("This action cannot be undone. Proceed?"),
                   primaryButton: .destructive(Text("Reset")) {
                       guard let cat = categoryToReset.wrappedValue else { return }

                       // 1) Remove archived goals
                       archivedGoals.wrappedValue.removeAll { $0.goal.category == cat }
                       GoalManager.saveArchive(archivedGoals: archivedGoals.wrappedValue)

                       // 2) Remove completed goals (so rank count resets)
                       completedGoals.wrappedValue.removeAll { $0.goal.category == cat }
                       GoalManager.save(
                           goals: goals.wrappedValue,
                           completedGoals: completedGoals.wrappedValue
                       )
                   },
                   secondaryButton: .cancel()
               )
           }
       }


    @ViewBuilder
    func GoalListPanel(
        showCompleted: Binding<Bool>,
        categories: Binding<[String]>,
        goals: Binding<[Goal]>,
        completedGoals: Binding<[CompletedGoal]>,
        archivedGoals: Binding<[CompletedGoal]>,
        goalToDelete: Binding<Goal?>,
        showDeleteConfirmation: Binding<Bool>
    ) -> some View {
        VStack(alignment: .leading) {
            HStack {
                Text(showCompleted.wrappedValue ? "Completed Goals" : "Current Goals")
                    .font(.title2).bold()
                Spacer()
                Button(showCompleted.wrappedValue ? "Back to Current" : "View Completed Goals") {
                    showCompleted.wrappedValue.toggle()
                }
            }

            ScrollView {
                if showCompleted.wrappedValue {
                    let grouped = Dictionary(grouping: completedGoals.wrappedValue, by: { $0.goal.category })
                    ForEach(grouped.sorted(by: { $0.key < $1.key }), id: \.key) { category, goalsForCategory in
                        HStack {
                            Text(category)
                                .font(.headline)
                            Spacer()
                        }
                        .padding(.top)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(goalsForCategory) { completed in
                                VStack(alignment: .leading) {
                                    Text(completed.goal.title).font(.headline)
                                    Text("Completed: \(GoalManager.formattedDateTime(completed.completedDate))")
                                        .font(.subheadline)

                                    Button(action: {
                                        if let index = completedGoals.wrappedValue.firstIndex(where: { $0.id == completed.id }) {
                                            let goalToArchive = completedGoals.wrappedValue[index]
                                            completedGoals.wrappedValue.remove(at: index)

                                            var archived = GoalManager.loadArchivedGoals()
                                            if !archived.contains(where: { $0.id == goalToArchive.id }) {
                                                archived.append(goalToArchive)
                                                GoalManager.saveArchive(archivedGoals: archived)
                                            }

                                            GoalManager.save(goals: goals.wrappedValue, completedGoals: completedGoals.wrappedValue)
                                        }
                                    }) {
                                        Image(systemName: "trash")
                                            .foregroundColor(.red)
                                            .padding(.top, 4)
                                    }
                                }
                                .padding()
                                .background(Color.gray.opacity(0.15))
                                .cornerRadius(8)
                            }
                        }
                    }
                } else {
                    ForEach(categories.wrappedValue, id: \.self) { category in
                        if goals.wrappedValue.contains(where: { $0.category == category }) {
                            Text(category)
                                .font(.headline)
                                .padding(.top)

                            ForEach(goals.wrappedValue.enumerated().filter { $0.element.category == category }.sorted(by: { $0.element.priority < $1.element.priority }), id: \.offset) { index, goal in
                                GoalCard(
                                    goal: goal,
                                    index: index,
                                    goals: goals,
                                    completedGoals: completedGoals,
                                    archivedGoals: archivedGoals,
                                    goalToDelete: goalToDelete,
                                    showDeleteConfirmation: showDeleteConfirmation
                                )
                            }
                        }
                    }
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding()
    }

}
